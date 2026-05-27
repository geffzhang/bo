export interface TokenSet {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
}

export interface OidcUser {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expired: boolean;
  profile: Record<string, unknown>;
  state?: unknown;
}

export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "=")));
  } catch {
    return null;
  }
}

export function tokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;
  return payload.exp - Math.floor(Date.now() / 1000) <= 10;
}

export function buildUser(tokenSet: TokenSet, state?: unknown): OidcUser {
  return {
    access_token: tokenSet.access_token,
    id_token: tokenSet.id_token,
    refresh_token: tokenSet.refresh_token,
    expired: tokenExpired(tokenSet.access_token),
    profile: parseJwtPayload(tokenSet.access_token) ?? {},
    state,
  };
}

export function getUserDisplayName(user: OidcUser): string {
  const profile = user.profile as Record<string, unknown>;
  return String(
    profile.nickname ?? profile.preferred_username ?? profile.name ?? profile.given_name ?? "User",
  );
}

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      oidcAuthority?: string;
      oidcClientId?: string;
    };
  }
}

export class AuthError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthError";
  }
}

const REDIRECT_PATH = "/auth/callback";
const STORAGE_PREFIX = "bo_oidc_";

let discoveryCache: Record<string, string> | null = null;
let redirectingToSignIn = false;

function getWindowObject(): Window {
  if (typeof window === "undefined") {
    throw new Error("OIDC browser APIs are unavailable in the current environment");
  }
  return window;
}

function getAuthority(): string {
  const win = getWindowObject();
  return String(
    win.__RUNTIME_CONFIG__?.oidcAuthority ?? import.meta.env.VITE_OIDC_AUTHORITY ?? "",
  ).replace(/\/+$/, "");
}

function getClientId(): string {
  const win = getWindowObject();
  return String(win.__RUNTIME_CONFIG__?.oidcClientId ?? import.meta.env.VITE_OIDC_CLIENT_ID ?? "");
}

function getRedirectUri(): string {
  const win = getWindowObject();
  return `${win.location.origin}${REDIRECT_PATH}`;
}

function getStorage() {
  const win = getWindowObject();
  return {
    local: win.localStorage,
    session: win.sessionStorage,
  };
}

function storeSave(key: string, value: string) {
  const storage = getStorage();
  try {
    storage.local.setItem(STORAGE_PREFIX + key, value);
  } catch {
    storage.session.setItem(STORAGE_PREFIX + key, value);
  }
}

function storeLoad(key: string): string | null {
  const storage = getStorage();
  return storage.local.getItem(STORAGE_PREFIX + key) ?? storage.session.getItem(STORAGE_PREFIX + key);
}

function storeRemove(key: string) {
  const storage = getStorage();
  storage.local.removeItem(STORAGE_PREFIX + key);
  storage.session.removeItem(STORAGE_PREFIX + key);
}

function storeClear() {
  const storage = getStorage();
  const keys = new Set([...Object.keys(storage.local), ...Object.keys(storage.session)]);
  keys.forEach((key) => {
    if (!key.startsWith(STORAGE_PREFIX)) return;
    storage.local.removeItem(key);
    storage.session.removeItem(key);
  });
}

function randomState(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

function loadTokenSet(): TokenSet | null {
  const raw = storeLoad("token_set");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TokenSet;
  } catch {
    return null;
  }
}

function saveTokenSet(tokenSet: TokenSet) {
  storeSave("token_set", JSON.stringify(tokenSet));
}

async function ensureDiscovery(): Promise<Record<string, string>> {
  if (discoveryCache) return discoveryCache;

  const authority = getAuthority();
  const clientId = getClientId();
  if (!authority || !clientId) {
    throw new Error("OIDC authority / clientId not configured");
  }

  const response = await fetch(`${authority}/.well-known/openid-configuration`);
  if (!response.ok) {
    throw new Error(`OIDC discovery failed: ${response.status}`);
  }

  discoveryCache = (await response.json()) as Record<string, string>;
  return discoveryCache;
}

async function exchangeCode(code: string): Promise<TokenSet> {
  const endpoints = await ensureDiscovery();
  const response = await fetch(endpoints.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: getClientId(),
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const tokenSet = (await response.json()) as TokenSet;
  saveTokenSet(tokenSet);
  return tokenSet;
}

async function tryRefresh(): Promise<TokenSet | null> {
  const current = loadTokenSet();
  if (!current?.refresh_token) return null;

  const endpoints = await ensureDiscovery();
  const response = await fetch(endpoints.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: getClientId(),
      refresh_token: current.refresh_token,
    }),
  });

  if (!response.ok) {
    storeClear();
    return null;
  }

  const next = (await response.json()) as TokenSet;
  if (!next.id_token && current.id_token) {
    next.id_token = current.id_token;
  }
  if (!next.refresh_token && current.refresh_token) {
    next.refresh_token = current.refresh_token;
  }
  saveTokenSet(next);
  return next;
}

export const userManager = {
  async getUser(): Promise<OidcUser | null> {
    let tokenSet = loadTokenSet();
    if (!tokenSet) return null;

    if (tokenExpired(tokenSet.access_token)) {
      const refreshed = await tryRefresh();
      if (!refreshed) return null;
      tokenSet = refreshed;
    }

    return buildUser(tokenSet);
  },

  async signinRedirect(options?: { state?: unknown }) {
    const endpoints = await ensureDiscovery();
    const state = randomState();
    storeSave("state", state);
    if (options?.state !== undefined) {
      storeSave("signin_state", JSON.stringify(options.state));
    }

    const params = new URLSearchParams({
      client_id: getClientId(),
      redirect_uri: getRedirectUri(),
      response_type: "code",
      scope: "openid profile email",
      state,
    });

    getWindowObject().location.assign(`${endpoints.authorization_endpoint}?${params.toString()}`);
  },

  async signinRedirectCallback(): Promise<OidcUser> {
    const win = getWindowObject();
    const params = new URLSearchParams(win.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      const description = params.get("error_description");
      throw new Error(description ? `${error}: ${description}` : error);
    }
    if (!code) {
      throw new Error("No authorization code in callback URL");
    }

    const expectedState = storeLoad("state");
    if (!state || !expectedState || state !== expectedState) {
      throw new Error("OIDC state mismatch");
    }

    storeRemove("state");
    const tokenSet = await exchangeCode(code);

    const rawSigninState = storeLoad("signin_state");
    storeRemove("signin_state");
    const signinState = rawSigninState ? JSON.parse(rawSigninState) : undefined;

    const cleanUrl = new URL(win.location.href);
    ["code", "state", "session_state", "iss", "error", "error_description"].forEach((key) => {
      cleanUrl.searchParams.delete(key);
    });
    win.history.replaceState({}, win.document.title, cleanUrl.toString());

    return buildUser(tokenSet, signinState);
  },

  async removeUser() {
    storeClear();
  },

  async signoutRedirect() {
    const current = loadTokenSet();
    const endpoints = await ensureDiscovery();
    storeClear();

    const logoutUrl = endpoints.end_session_endpoint ?? endpoints.revocation_endpoint;
    if (!logoutUrl) {
      getWindowObject().location.assign("/");
      return;
    }

    const params = new URLSearchParams({
      post_logout_redirect_uri: getWindowObject().location.origin,
      client_id: getClientId(),
    });
    if (current?.id_token) {
      params.set("id_token_hint", current.id_token);
    }
    getWindowObject().location.assign(`${logoutUrl}?${params.toString()}`);
  },
};

export async function getAuthUser(): Promise<OidcUser | null> {
  return userManager.getUser();
}

export async function getAccessToken(): Promise<string | null> {
  const user = await getAuthUser();
  return user?.access_token ?? null;
}

export async function requireAccessToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new AuthError();
  return token;
}

export async function redirectToSignIn(): Promise<void> {
  if (redirectingToSignIn) return;
  redirectingToSignIn = true;
  try {
    await userManager.removeUser();
    await userManager.signinRedirect({
      state: {
        returnTo: `${getWindowObject().location.pathname}${getWindowObject().location.search}${getWindowObject().location.hash}`,
      },
    });
  } finally {
    redirectingToSignIn = false;
  }
}

export async function signIn(): Promise<void> {
  await userManager.signinRedirect();
}

export async function signOut(): Promise<void> {
  await userManager.signoutRedirect();
}

export async function handleAuthCallback(): Promise<OidcUser> {
  return userManager.signinRedirectCallback();
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}