# Bo Keycloak Frontend Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Bo 增加参考 kingcrab-console/console 的 Keycloak OIDC 前端登录门禁，并在本地 docker compose 中加入可联调的 Keycloak 服务。

**Architecture:** 保持当前无框架 Vite 单页应用不变，在入口前增加一个轻量 OIDC 模块，负责 discovery、登录跳转、回调换 token、refresh 和登出。页面通过 `/auth/callback` 处理授权码返回，主应用只在认证完成后渲染，Keycloak 本地服务通过 realm 导入文件初始化。

**Tech Stack:** TypeScript, Vite, 原生 DOM 渲染, Vitest, Keycloak OIDC Authorization Code Flow, Docker Compose

---

## File Structure

- Create: `src/lib/oidc.ts`
  责任：封装 authority/clientId 读取、discovery、signin redirect、callback、refresh、signout、本地 token 存储与用户显示名。
- Create: `src/lib/oidc.test.ts`
  责任：覆盖 token 解析、过期判断、用户显示名选择、存储回退等纯逻辑。
- Modify: `src/main.ts`
  责任：把现有应用启动改成认证前置；识别 `/auth/callback`；登录成功后再渲染现有 UI；挂载用户信息与退出按钮。
- Modify: `src/styles.css`
  责任：补充认证加载态、认证错误态、顶部会话栏样式。
- Modify: `package.json`
  责任：新增 `test` 脚本和 Vitest 依赖。
- Modify: `.env.example`
  责任：增加 `VITE_OIDC_AUTHORITY` 和 `VITE_OIDC_CLIENT_ID` 示例值。
- Modify: `docker-compose.local.yml`
  责任：新增 `keycloak` 服务并保留现有 `app` / `minio`。
- Create: `docker/keycloak/realm.json`
  责任：导入 `bo` realm、`bo-web` client、开发测试用户。
- Modify: `README.md`
  责任：说明本地认证启动方式、默认账号、已知安全边界。

## Task 1: 建立测试支点并锁定 OIDC 模块接口

**Files:**
- Modify: `package.json`
- Create: `src/lib/oidc.test.ts`
- Test: `src/lib/oidc.test.ts`

- [ ] **Step 1: 为 OIDC 纯逻辑写失败测试**

```ts
import { describe, expect, it } from 'vitest'
import {
  buildUser,
  getUserDisplayName,
  parseJwtPayload,
  tokenExpired,
} from './oidc'

function makeJwt(payload: Record<string, unknown>) {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.`
}

describe('parseJwtPayload', () => {
  it('returns payload object for a valid jwt body', () => {
    const token = makeJwt({ sub: 'u1', preferred_username: 'bo-demo' })

    expect(parseJwtPayload(token)).toMatchObject({
      sub: 'u1',
      preferred_username: 'bo-demo',
    })
  })
})

describe('tokenExpired', () => {
  it('returns true when exp is within 10 seconds', () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 5 })

    expect(tokenExpired(token)).toBe(true)
  })

  it('returns false when token is still valid', () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 })

    expect(tokenExpired(token)).toBe(false)
  })
})

describe('buildUser', () => {
  it('builds profile and expired flag from access token', () => {
    const accessToken = makeJwt({
      sub: 'u1',
      preferred_username: 'bo-demo',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })

    const user = buildUser({ access_token: accessToken }, { returnTo: '/reports' })

    expect(user.profile.preferred_username).toBe('bo-demo')
    expect(user.expired).toBe(false)
    expect(user.state).toEqual({ returnTo: '/reports' })
  })
})

describe('getUserDisplayName', () => {
  it('prefers nickname over preferred_username over name', () => {
    const user = {
      access_token: 'token',
      expired: false,
      profile: {
        nickname: 'Bo Demo',
        preferred_username: 'bo-demo',
        name: 'Bo User',
      },
    }

    expect(getUserDisplayName(user)).toBe('Bo Demo')
  })
})
```

- [ ] **Step 2: 运行测试并确认当前失败**

Run: `npm test -- src/lib/oidc.test.ts`

Expected: FAIL，提示 `Cannot find module './oidc'` 或缺少导出 `buildUser`、`tokenExpired`、`getUserDisplayName`。

- [ ] **Step 3: 为测试运行器补齐最小依赖和脚本**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "netlify:dev": "netlify dev",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "vite": "^6.0.7",
    "vitest": "^2.1.9"
  }
}
```

- [ ] **Step 4: 重新运行测试，确保失败原因变成缺少实现**

Run: `npm test -- src/lib/oidc.test.ts`

Expected: FAIL，且失败点集中在 `src/lib/oidc.ts` 的缺失或导出不完整，而不是测试运行器本身报错。

- [ ] **Step 5: Commit**

```bash
git add package.json src/lib/oidc.test.ts
git commit -m "test: add oidc module test scaffold"
```

## Task 2: 实现轻量 OIDC 模块

**Files:**
- Create: `src/lib/oidc.ts`
- Test: `src/lib/oidc.test.ts`

- [ ] **Step 1: 先实现让纯逻辑测试通过的最小导出**

```ts
export interface TokenSet {
  access_token: string
  id_token?: string
  refresh_token?: string
}

export interface OidcUser {
  access_token: string
  id_token?: string
  refresh_token?: string
  expired: boolean
  profile: Record<string, unknown>
  state?: unknown
}

export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')))
  } catch {
    return null
  }
}

export function tokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') return false
  return payload.exp - Math.floor(Date.now() / 1000) <= 10
}

export function buildUser(ts: TokenSet, state?: unknown): OidcUser {
  return {
    access_token: ts.access_token,
    id_token: ts.id_token,
    refresh_token: ts.refresh_token,
    expired: tokenExpired(ts.access_token),
    profile: parseJwtPayload(ts.access_token) ?? {},
    state,
  }
}

export function getUserDisplayName(user: OidcUser): string {
  const p = user.profile as Record<string, unknown>
  return String(
    p.nickname ?? p.preferred_username ?? p.name ?? p.given_name ?? 'User',
  )
}
```

- [ ] **Step 2: 运行纯逻辑测试并确认通过**

Run: `npm test -- src/lib/oidc.test.ts`

Expected: PASS，4 个测试全部通过。

- [ ] **Step 3: 扩展成完整 OIDC 模块接口**

```ts
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      oidcAuthority?: string
      oidcClientId?: string
    }
  }
}

const authority = (
  window.__RUNTIME_CONFIG__?.oidcAuthority ??
  (import.meta.env.VITE_OIDC_AUTHORITY as string) ??
  ''
).replace(/\/+$/, '')

const clientId =
  window.__RUNTIME_CONFIG__?.oidcClientId ??
  (import.meta.env.VITE_OIDC_CLIENT_ID as string) ??
  ''

const REDIRECT_URI = `${window.location.origin}/auth/callback`
const PREFIX = 'bo_oidc_'

export class AuthError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthError'
  }
}

function storeSave(key: string, value: string) {
  try {
    localStorage.setItem(PREFIX + key, value)
  } catch {
    sessionStorage.setItem(PREFIX + key, value)
  }
}

function storeLoad(key: string): string | null {
  return localStorage.getItem(PREFIX + key) ?? sessionStorage.getItem(PREFIX + key)
}

function storeRemove(key: string) {
  localStorage.removeItem(PREFIX + key)
  sessionStorage.removeItem(PREFIX + key)
}

function storeClear() {
  const all = [...Object.keys(localStorage), ...Object.keys(sessionStorage)]
  all.filter((key) => key.startsWith(PREFIX)).forEach((key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
}

let discoveryCache: Record<string, string> | null = null

async function ensureDiscovery(): Promise<Record<string, string>> {
  if (discoveryCache) return discoveryCache
  if (!authority || !clientId) throw new Error('OIDC authority / clientId not configured')

  const response = await fetch(`${authority}/.well-known/openid-configuration`)
  if (!response.ok) throw new Error(`OIDC discovery failed: ${response.status}`)
  discoveryCache = await response.json()
  return discoveryCache
}

async function exchangeCode(code: string): Promise<TokenSet> {
  const endpoints = await ensureDiscovery()
  const response = await fetch(endpoints.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  })

  if (!response.ok) throw new Error(`Token exchange failed: ${response.status}`)
  const tokenSet = (await response.json()) as TokenSet
  storeSave('token_set', JSON.stringify(tokenSet))
  return tokenSet
}

async function tryRefresh(): Promise<TokenSet | null> {
  const raw = storeLoad('token_set')
  if (!raw) return null
  const current = JSON.parse(raw) as TokenSet
  if (!current.refresh_token) return null

  const endpoints = await ensureDiscovery()
  const response = await fetch(endpoints.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: current.refresh_token,
    }),
  })

  if (!response.ok) {
    storeClear()
    return null
  }

  const next = (await response.json()) as TokenSet
  if (!next.refresh_token && current.refresh_token) {
    next.refresh_token = current.refresh_token
  }

  storeSave('token_set', JSON.stringify(next))
  return next
}

export const userManager = {
  async getUser(): Promise<OidcUser | null> {
    const raw = storeLoad('token_set')
    if (!raw) return null
    let tokenSet = JSON.parse(raw) as TokenSet

    if (tokenExpired(tokenSet.access_token)) {
      const refreshed = await tryRefresh()
      if (!refreshed) return null
      tokenSet = refreshed
    }

    return buildUser(tokenSet)
  },

  async signinRedirect(options?: { state?: unknown }) {
    const endpoints = await ensureDiscovery()
    const state = crypto.randomUUID().replace(/-/g, '')
    storeSave('state', state)
    if (options?.state !== undefined) {
      storeSave('signin_state', JSON.stringify(options.state))
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile email',
      state,
    })

    window.location.assign(`${endpoints.authorization_endpoint}?${params.toString()}`)
  },

  async signinRedirectCallback(): Promise<OidcUser> {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const error = params.get('error')

    if (error) throw new Error(error)
    if (!code) throw new Error('No authorization code in callback URL')

    const expectedState = storeLoad('state')
    if (!expectedState || !state || expectedState !== state) {
      throw new Error('OIDC state mismatch')
    }

    storeRemove('state')
    const tokenSet = await exchangeCode(code)
    const rawSigninState = storeLoad('signin_state')
    storeRemove('signin_state')
    const signinState = rawSigninState ? JSON.parse(rawSigninState) : undefined

    const url = new URL(window.location.href)
    ;['code', 'state', 'session_state', 'iss', 'error', 'error_description'].forEach((key) => {
      url.searchParams.delete(key)
    })
    window.history.replaceState({}, document.title, url.toString())

    return buildUser(tokenSet, signinState)
  },

  async removeUser() {
    storeClear()
  },

  async signoutRedirect() {
    const raw = storeLoad('token_set')
    const tokenSet = raw ? (JSON.parse(raw) as TokenSet) : null
    const endpoints = await ensureDiscovery()
    storeClear()

    const logoutUrl = endpoints.end_session_endpoint ?? endpoints.revocation_endpoint
    if (!logoutUrl) {
      window.location.assign('/')
      return
    }

    const params = new URLSearchParams({
      post_logout_redirect_uri: window.location.origin,
      client_id: clientId,
    })
    if (tokenSet?.id_token) params.set('id_token_hint', tokenSet.id_token)
    window.location.assign(`${logoutUrl}?${params.toString()}`)
  },
}

let redirectingToSignIn = false

export async function getAuthUser() {
  return userManager.getUser()
}

export async function redirectToSignIn() {
  if (redirectingToSignIn) return
  redirectingToSignIn = true
  try {
    await userManager.removeUser()
    await userManager.signinRedirect({
      state: {
        returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      },
    })
  } finally {
    redirectingToSignIn = false
  }
}

export async function signIn() {
  await userManager.signinRedirect()
}

export async function signOut() {
  await userManager.signoutRedirect()
}

export async function handleAuthCallback() {
  return userManager.signinRedirectCallback()
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}
```

- [ ] **Step 4: 运行纯逻辑测试，确认导出和签名保持稳定**

Run: `npm test -- src/lib/oidc.test.ts`

Expected: PASS，且没有新增类型错误。

- [ ] **Step 5: Commit**

```bash
git add src/lib/oidc.ts src/lib/oidc.test.ts package.json
git commit -m "feat: add browser oidc auth module"
```

## Task 3: 改造入口，接入认证前置和 `/auth/callback`

**Files:**
- Modify: `src/main.ts`
- Modify: `src/styles.css`
- Test: `src/lib/oidc.test.ts`

- [ ] **Step 1: 为入口认证门禁增加一个失败测试用例说明**

```ts
// src/lib/oidc.test.ts
describe('getUserDisplayName fallback', () => {
  it('falls back to User when no profile name fields exist', () => {
    const user = {
      access_token: 'token',
      expired: false,
      profile: {},
    }

    expect(getUserDisplayName(user)).toBe('User')
  })
})
```

- [ ] **Step 2: 运行测试并确认新断言先失败或缺少回退实现**

Run: `npm test -- src/lib/oidc.test.ts`

Expected: PASS。这个断言作为入口接线前的保护测试，确保顶部会话栏取名逻辑不会因为后续认证接入而回退。

- [ ] **Step 3: 在入口文件中拆出认证启动流程**

```ts
import './styles.css'
import {
  getAuthUser,
  getUserDisplayName,
  handleAuthCallback,
  redirectToSignIn,
  signOut,
} from './lib/oidc'

const appRoot = document.querySelector('#app') as HTMLDivElement

function renderAuthLoading(message = '正在检查登录状态...') {
  appRoot.innerHTML = `
    <main class="auth-shell">
      <section class="auth-card">
        <h1>企业商机挖掘 Agent</h1>
        <p>${message}</p>
      </section>
    </main>
  `
}

function renderAuthError(message: string) {
  appRoot.innerHTML = `
    <main class="auth-shell">
      <section class="auth-card auth-card-error">
        <h1>认证初始化失败</h1>
        <p>${message}</p>
      </section>
    </main>
  `
}

function mountSessionBar(userName: string) {
  const hero = document.querySelector('.hero')
  if (!hero || document.querySelector('.session-banner')) return
  hero.insertAdjacentHTML(
    'afterbegin',
    `
      <div class="session-banner">
        <div>
          <strong>已登录</strong>
          <span>${userName}</span>
        </div>
        <button id="signOutButton" type="button" class="ghost danger">退出登录</button>
      </div>
    `,
  )
  document.querySelector('#signOutButton')?.addEventListener('click', async () => {
    try {
      await signOut()
    } catch (error) {
      window.alert(`退出登录失败：${error instanceof Error ? error.message : String(error)}`)
    }
  })
}

async function bootstrapAuth() {
  if (window.location.pathname === '/auth/callback') {
    renderAuthLoading('正在完成登录...')
    const user = await handleAuthCallback()
    const returnTo = ((user.state as { returnTo?: string } | null)?.returnTo) || '/'
    window.location.replace(returnTo)
    return false
  }

  const user = await getAuthUser()
  if (!user) {
    renderAuthLoading('正在跳转到 Keycloak 登录页...')
    await redirectToSignIn()
    return false
  }

  return user
}

async function start() {
  try {
    renderAuthLoading()
    const user = await bootstrapAuth()
    if (!user) return

    renderBoApp()
    mountSessionBar(getUserDisplayName(user))
  } catch (error) {
    renderAuthError(error instanceof Error ? error.message : String(error))
  }
}

function renderBoApp() {
  const reportId = new URLSearchParams(window.location.search).get('reportId')
  if (reportId) {
    Qt()
    ut(reportId).catch((error) => {
      m('报告打开失败', 100, error instanceof Error ? error.message : String(error))
    })
    return
  }

  Kt()
}

start()
```

说明：当前 `src/main.ts` 末尾已经有 `Ie(){...}Ie();` 启动逻辑。实现时不要再保留 `Ie()` 直接自执行，而是把它重命名或等价改写为 `renderBoApp()`，再由 `start()` 在认证成功后显式调用。

- [ ] **Step 4: 为认证态补充样式**

```css
.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: linear-gradient(180deg, #f7f7f3 0%, #eef2f6 100%);
}

.auth-card {
  width: min(520px, 100%);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  padding: 28px;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
}

.auth-card-error {
  border-color: rgba(185, 28, 28, 0.22);
}

.session-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.86);
}

.session-banner strong {
  display: block;
  font-size: 12px;
  color: #475569;
}

.session-banner span {
  font-size: 14px;
  color: #0f172a;
}
```

- [ ] **Step 5: 运行测试和构建，验证入口改造没有破坏现有应用**

Run: `npm test -- src/lib/oidc.test.ts`

Expected: PASS

Run: `npm run build`

Expected: PASS，Vite 构建完成，无 TypeScript 错误。

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/styles.css src/lib/oidc.ts src/lib/oidc.test.ts
git commit -m "feat: gate app startup behind oidc auth"
```

## Task 4: 补全前端配置与本地 Keycloak 运行时

**Files:**
- Modify: `.env.example`
- Modify: `docker-compose.local.yml`
- Create: `docker/keycloak/realm.json`

- [ ] **Step 1: 在环境变量示例中增加 OIDC 配置**

```env
VITE_OIDC_AUTHORITY=http://localhost:8080/realms/bo
VITE_OIDC_CLIENT_ID=bo-web

OPENAI_COMPAT_BASE_URL=
OPENAI_COMPAT_API_KEY=
OPENAI_COMPAT_MODEL=
```

- [ ] **Step 2: 在 compose 中新增 Keycloak 服务**

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.local
    image: bo-local:dev
    environment:
      HOST: 0.0.0.0
      PORT: 8888
    ports:
      - "8888:8888"
    restart: unless-stopped

  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    command: start-dev --import-realm
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
    ports:
      - "8080:8080"
    volumes:
      - ./docker/keycloak/realm.json:/opt/keycloak/data/import/realm.json
    restart: unless-stopped

  minio:
    profiles: ["minio"]
    image: pgsty/minio
    command: server /data --console-address ":9001"
```

- [ ] **Step 3: 创建开发 realm 导入文件**

```json
{
  "realm": "bo",
  "enabled": true,
  "registrationAllowed": false,
  "resetPasswordAllowed": false,
  "rememberMe": true,
  "clients": [
    {
      "clientId": "bo-web",
      "name": "Bo Web",
      "enabled": true,
      "publicClient": true,
      "protocol": "openid-connect",
      "redirectUris": [
        "http://localhost:8888/*"
      ],
      "webOrigins": [
        "http://localhost:8888"
      ],
      "rootUrl": "http://localhost:8888",
      "directAccessGrantsEnabled": false,
      "standardFlowEnabled": true,
      "implicitFlowEnabled": false,
      "attributes": {
        "pkce.code.challenge.method": ""
      }
    }
  ],
  "users": [
    {
      "username": "bo-demo",
      "enabled": true,
      "emailVerified": true,
      "firstName": "Bo",
      "lastName": "Demo",
      "credentials": [
        {
          "type": "password",
          "value": "bo-demo123",
          "temporary": false
        }
      ]
    }
  ]
}
```

- [ ] **Step 4: 启动本地容器并确认 Keycloak 可以访问**

Run: `docker compose -f docker-compose.local.yml up -d --build`

Expected: `app` 与 `keycloak` 容器都为 running 状态。

Run: `docker compose -f docker-compose.local.yml logs keycloak --tail=50`

Expected: 日志中出现 realm 导入成功，且 `http://localhost:8080` 可访问登录页。

- [ ] **Step 5: Commit**

```bash
git add .env.example docker-compose.local.yml docker/keycloak/realm.json
git commit -m "feat: add local keycloak runtime for bo"
```

## Task 5: 文档化联调方式与安全边界

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 在 README 中增加认证配置说明**

```md
## Keycloak 本地认证

Bo 的浏览器入口现在需要先经过 Keycloak 登录。当前仅实现前端门禁，不包含 Netlify Functions 的服务端鉴权。

### 本地环境变量

在 `.env` 中补充：

```text
VITE_OIDC_AUTHORITY=http://localhost:8080/realms/bo
VITE_OIDC_CLIENT_ID=bo-web
```

### 启动方式

```powershell
copy .env.example .env
notepad .env
docker compose -f docker-compose.local.yml up -d --build
```

启动后访问：

- Bo: `http://localhost:8888`
- Keycloak: `http://localhost:8080`
- Admin Console: `http://localhost:8080/admin`

默认本地账号：

- 用户名：`bo-demo`
- 密码：`bo-demo123`
- 管理员：`admin / admin`

### 认证流程

- 未登录访问 Bo 时会跳转 Keycloak。
- 登录成功后会经过 `/auth/callback` 返回，并恢复到登录前页面。
- 页面右上方可主动退出登录。

### 当前安全边界

本次仅做前端登录门禁。若直接调用 `/.netlify/functions/*`，仍不会校验 Keycloak token；若需要真正的 API 级鉴权，需要在服务端补充访问令牌校验。
```

- [ ] **Step 2: 运行构建，确认文档改动未伴随其他误改**

Run: `npm run build`

Expected: PASS

- [ ] **Step 3: 手工验证完整登录闭环**

Run: 在浏览器中访问 `http://localhost:8888`

Expected:
- 首次访问跳转到 Keycloak 登录页
- 使用 `bo-demo / bo-demo123` 登录后回到 Bo
- 页面顶部能看到当前用户名
- 点击“退出登录”后回到未登录状态

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add keycloak local auth guide"
```

## Task 6: 交付前总验证

**Files:**
- Modify: `src/lib/oidc.ts`（仅当验证暴露缺陷时）
- Modify: `src/main.ts`（仅当验证暴露缺陷时）
- Modify: `docker/keycloak/realm.json`（仅当验证暴露缺陷时）

- [ ] **Step 1: 跑一次 focused automated checks**

Run: `npm test -- src/lib/oidc.test.ts`

Expected: PASS

Run: `npm run build`

Expected: PASS

- [ ] **Step 2: 跑一次本地容器级验证**

Run: `docker compose -f docker-compose.local.yml up -d`

Expected: `app`, `keycloak` 正常启动；若附带 `--profile minio`，`minio` 也正常启动。

- [ ] **Step 3: 记录人工验收结果**

Checklist:
- 未登录用户无法直接进入 Bo 工作台
- `/auth/callback` 返回后能恢复原页面
- 登出后会话被清理
- README 中包含默认账号和安全边界说明

- [ ] **Step 4: Commit**

```bash
git add src/lib/oidc.ts src/main.ts src/styles.css .env.example docker-compose.local.yml docker/keycloak/realm.json README.md package.json src/lib/oidc.test.ts
git commit -m "feat: add keycloak frontend auth flow to bo"
```