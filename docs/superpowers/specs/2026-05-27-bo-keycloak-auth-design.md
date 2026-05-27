# Bo Keycloak Frontend Auth Design

## Summary

为 Bo 增加基于 Keycloak 的前端登录门禁，目标是未登录用户不能进入应用界面，登录成功后再使用现有工作台能力。

本次范围仅覆盖浏览器侧认证接入和本地 Keycloak 联调，不为 Netlify Functions 增加服务端令牌校验，不开放用户自助注册，不引入角色权限控制。认证流程参考 `E:\gitee\kingcrab-console\console` 的 OIDC 回调式实现，Keycloak 本地容器编排参考 `E:\GitHub\keycloak-react-theme-starter` 的 docker compose 结构。

## Goals

- 未登录访问 Bo 时，自动跳转到 Keycloak 登录页。
- 登录成功后返回 Bo，并正常使用现有前端功能。
- 页面内展示当前登录用户信息，并支持主动退出登录。
- 本地 `docker compose -f docker-compose.local.yml --profile minio up -d` 时可同时启动 Bo 与 Keycloak。
- 提供一个可直接联调的默认 realm、client 和测试用户。

## Non-Goals

- 不对 Netlify Functions 做服务端访问控制。
- 不实现 Keycloak 角色、组、细粒度权限。
- 不实现自助注册、忘记密码等自定义认证流程。
- 不接入自定义 Keycloak 登录主题。
- 不改造现有业务接口的数据结构和业务流程。

## Current State

- 前端入口在 `src/main.ts`，当前为一个无框架 Vite 单页应用，直接负责 DOM 渲染与接口请求。
- 本地启动入口为 `local-server.mjs`，用于托管构建产物并转发 `/.netlify/functions/*` 请求。
- 当前 `docker-compose.local.yml` 只包含应用容器，以及可选的 MinIO 容器。
- 参考仓库 `keycloak-react-theme-starter` 提供了本地 Keycloak 容器与 realm 导入模式，可复用其 compose 结构思路，但不复用其主题构建链路。
- 参考仓库 `kingcrab-console/console` 的认证并未直接依赖 `keycloak-js`，而是通过轻量 OIDC 模块完成 discovery、登录跳转、回调换 token、刷新和登出，并使用 `/auth/callback` 作为回调入口。

## Proposed Approach

采用参考 console 的最小前端门禁方案：新增一个轻量 OIDC 认证模块，在浏览器入口做登录状态检查；未登录时跳转到 Keycloak，登录完成后通过回调页换取会话，再执行现有页面渲染。

关键决策如下：

- 参考 console 的 `oidc.ts` 形态，使用轻量 OIDC 模块封装 discovery、signin redirect、callback、refresh 和 signout，而不是直接把认证逻辑散落到入口文件中。
- 使用单独的 `/auth/callback` 回调入口处理授权码交换，并恢复登录前访问地址。
- 在前端维护会话状态；本次不要求把访问令牌附加到业务请求中作为强制条件。
- 使用本地 realm 导入文件预置 realm、client 和测试用户，保证本地开箱即用。
- 保持现有 UI 主体不变，只新增轻量会话栏和初始化加载态。

## Architecture

### Frontend Auth Layer

新增一个轻量认证模块，参考 console 的 `src/lib/oidc.ts` 组织方式，负责封装最小认证能力：

- 读取 authority 和 clientId 配置
- 读取 OIDC discovery 文档
- 触发登录跳转
- 处理 `/auth/callback` 回调并交换 token
- 在本地存储 token set
- 按需尝试 refresh token
- 暴露已认证用户的显示信息
- 提供登出方法
- 处理初始化失败时的错误展示

该模块与现有业务逻辑之间只通过启动入口交互，不侵入现有报告查询、任务管理和历史报告逻辑。

### App Bootstrap Flow

前端入口调整为参考 console 的回调式启动：

1. 页面载入后先渲染一个简单的认证加载态。
2. 若当前路径是 `/auth/callback`，先执行授权码回调处理，并恢复登录前地址。
3. 否则先读取本地会话，判断当前用户是否已登录。
4. 未登录时，跳转到 Keycloak 登录页，并将当前页面地址保存为 `returnTo`。
5. 登录成功后返回 Bo 并恢复 `returnTo`。
6. 完成认证后，再执行当前应用渲染逻辑。
7. 页面顶部展示当前用户信息和退出按钮。

这保证了认证是应用的前置条件，而不是零散分布在每个按钮和请求中。

### Local Runtime

在本地 docker compose 中新增 `keycloak` 服务：

- 镜像使用 `quay.io/keycloak/keycloak`
- 启动命令使用 `start-dev --import-realm`
- 暴露本地 `8080` 端口
- 通过卷挂载导入本地 `realm.json`

Bo 应用仍运行在 `8888` 端口。Keycloak 作为独立服务提供登录页和会话管理。

## Configuration Design

新增前端可读环境变量，优先通过 Vite 注入到浏览器端，并保留参考 console 的运行时覆盖接口：

- `VITE_OIDC_AUTHORITY`
- `VITE_OIDC_CLIENT_ID`

本地默认值建议为：

- `VITE_OIDC_AUTHORITY=http://localhost:8080/realms/bo`
- `VITE_OIDC_CLIENT_ID=bo-web`

如实现时需要减少重新构建次数，可参考 console 预留 `window.__RUNTIME_CONFIG__` 形式的运行时覆盖，但首版以 `.env` 和 Vite 注入为主。

这些变量会写入 `.env.example` 和 README 的本地运行说明中。

## Realm Design

新增本地导入文件 `docker/keycloak/realm.json`，包含最小可用配置：

- Realm 名称：`bo`
- Public client：`bo-web`
- Root URL：`http://localhost:8888`
- Redirect URIs：至少包含 `http://localhost:8888/*`
- Web Origins：至少包含 `http://localhost:8888`
- 自助注册关闭
- 预置测试用户：`bo-demo / bo-demo123`

该用户仅用于本地联调，文档中需明确提醒上线前移除或替换。

## UI Changes

保持现有页面结构，只增加最小认证可见性：

- 在应用顶部增加一个会话栏，显示用户名或昵称。
- 会话栏提供“退出登录”按钮。
- 认证初始化期间展示一个简单加载态，避免空白页面。
- 回调处理中展示类似 console `AuthCallback` 的“正在登录”状态，避免授权码返回时出现空白页。

不新增自定义登录页，不调整现有工作台的信息架构，不改变现有任务和报告交互流程。

## Error Handling

需要覆盖以下异常路径：

- OIDC 配置缺失：页面显示明确错误，提示检查前端环境变量。
- discovery 拉取失败或回调换 token 失败：页面显示认证初始化失败信息，不继续渲染业务 UI。
- 登出失败：提示失败信息，并允许用户重试。
- Keycloak 服务不可达：页面显示本地认证服务不可用，而不是卡在空白页。

本次参考 console 保留基本的 token 续期能力；若 refresh token 失效，则清理本地会话并重新进入登录流程。

## Security Boundaries

本设计只提供界面级门禁，不提供 API 级安全保证。

已登录用户通过正常页面使用 Bo 时，会先经过 Keycloak 登录；但若有人绕过前端直接调用 `/.netlify/functions/*`，本次改造不会阻止该访问。后续若要真正形成安全边界，需要在服务端增加访问令牌校验。

## Testing Strategy

至少验证以下闭环：

1. 前端依赖安装后，类型检查与构建通过。
2. `docker compose -f docker-compose.local.yml up -d` 后，Bo 与 Keycloak 都成功启动。
3. 未登录访问 `http://localhost:8888` 时，会自动跳转到 Keycloak 登录页。
4. 使用预置测试用户登录后，经过 `/auth/callback` 回到 Bo，并恢复到登录前页面。
5. 页面顶部正确展示当前用户信息。
6. 点击退出登录后，会话结束，再次进入登录流程。

## Implementation Outline

实现会分为以下几个步骤：

1. 新增前端 OIDC 模块，参考 console 封装 authority、discovery、signin redirect、callback、token 存储、refresh 和 signout。
2. 在入口中识别 `/auth/callback` 路径，并先处理回调。
3. 重构 `src/main.ts` 入口，让应用在认证成功后再渲染。
4. 增加页面顶部会话栏、回调处理中状态和认证加载态。
5. 增加 OIDC 前端环境变量与默认示例配置。
6. 扩展 `docker-compose.local.yml`，新增 `keycloak` 服务。
7. 新增 `docker/keycloak/realm.json`。
8. 更新 README 的本地认证启动说明。

## Risks And Tradeoffs

- 当前 `src/main.ts` 体量较大，入口改造时需要避免顺手大规模重构。
- 只做前端门禁意味着安全边界有限，但这是当前明确接受的范围折中。
- 预置测试用户会提升本地体验，但需要在文档中明确其仅用于开发环境。
- 本地 Keycloak 引入后，开发启动成本会增加一个容器，但换来稳定的一致联调环境。
- 参考 console 的轻量 OIDC 模块会比直接引入 `keycloak-js` 多一些协议处理代码，但它更贴近你指定的参考实现，也保留了回调页和返回页恢复能力。

## Open Decisions Resolved

- 认证范围：仅前端门禁，不做函数服务端鉴权。
- 用户管理方式：先按管理员预置用户处理，不开放自助注册。
- 接入方式：认证流程参考 `kingcrab-console/console` 的 OIDC 回调式实现；Keycloak 本地容器编排参考 `keycloak-react-theme-starter`。

## Acceptance Criteria

- Bo 在未登录状态下无法进入工作台页面。
- 登录成功后可正常使用当前主要功能。
- 本地 docker compose 能一并启动 Keycloak。
- 仓库中包含可直接导入的 realm 配置与默认测试账号说明。
- 文档明确声明当前方案不包含 API 级鉴权。