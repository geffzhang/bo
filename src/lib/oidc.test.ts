import { describe, expect, it } from "vitest";
import {
  buildUser,
  getUserDisplayName,
  parseJwtPayload,
  tokenExpired,
} from "./oidc";

function makeJwt(payload: Record<string, unknown>) {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.`;
}

describe("parseJwtPayload", () => {
  it("returns payload object for a valid jwt body", () => {
    const token = makeJwt({ sub: "u1", preferred_username: "bo-demo" });

    expect(parseJwtPayload(token)).toMatchObject({
      sub: "u1",
      preferred_username: "bo-demo",
    });
  });
});

describe("tokenExpired", () => {
  it("returns true when exp is within 10 seconds", () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 5 });

    expect(tokenExpired(token)).toBe(true);
  });

  it("returns false when token is still valid", () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });

    expect(tokenExpired(token)).toBe(false);
  });
});

describe("buildUser", () => {
  it("builds profile and expired flag from access token", () => {
    const accessToken = makeJwt({
      sub: "u1",
      preferred_username: "bo-demo",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const user = buildUser({ access_token: accessToken }, { returnTo: "/reports" });

    expect(user.profile.preferred_username).toBe("bo-demo");
    expect(user.expired).toBe(false);
    expect(user.state).toEqual({ returnTo: "/reports" });
  });
});

describe("getUserDisplayName", () => {
  it("prefers nickname over preferred_username over name", () => {
    const user = {
      access_token: "token",
      expired: false,
      profile: {
        nickname: "Bo Demo",
        preferred_username: "bo-demo",
        name: "Bo User",
      },
    };

    expect(getUserDisplayName(user)).toBe("Bo Demo");
  });

  it("falls back to User when no profile name fields exist", () => {
    const user = {
      access_token: "token",
      expired: false,
      profile: {},
    };

    expect(getUserDisplayName(user)).toBe("User");
  });
});