# nb-bo 企业商机挖掘 Agent

nb-bo 是一个面向售前、销售和业务团队的企业商机研究工具。它的目标不是替代人工判断，而是在第一次拜访或会前准备阶段，快速把客户公开信息、潜在痛点、AI 切入机会、推进条件和风险边界整理成一份可阅读、可追溯的商机报告。

工具支持输入企业名称，先核对企业主体，再执行公开信息检索、网页读取、来源审计、模型分析和报告生成。生成结果会保存到云端，后续可以按企业名、地区、行业、关键词、时间周期和评级进行检索复用。

## 适用场景

- 销售拜访前：快速了解客户是谁、卖什么、规模如何、可能有什么业务压力。
- 售前准备前：判断是否值得投入深度方案、Demo 或 POC 设计。
- 线索初筛：对陌生企业做初步画像、痛点推导和机会判断。
- 团队协同：把客户输入、公开证据、待确认问题和下一步要求统一沉淀。
- 上市公司分析：上传年报 PDF 后，优先提取营收、利润、现金流、研发投入、员工数量等硬指标。

## 核心能力

- **企业主体核对**：避免集团、子公司、同名企业、招聘页碎片等误匹配。
- **深度公开检索**：覆盖官网、公告、财报、工商、招聘、专利、招投标、新闻、行业线索等来源。
- **多模型检索规划**：使用硅基流动模型做检索规划和候选来源扩展，模型只负责规划，不直接充当事实来源。
- **证据审计**：过滤搜索跳转页、字典页、重复链接、无关链接和低相关来源。
- **年报 PDF 解析**：支持上传非 OCR 的文字型年报 PDF，并提取关键财务与经营指标。
- **证据角标**：报告正文中的关键论点、财务数据、痛点和方案可挂来源角标或年报页码。
- **后台长任务**：生成任务启动后，关闭网页不影响后台继续运行；重新打开可继续查看进度。
- **任务中心**：展示多企业任务、阶段进度、当前模型、可引用证据数量、停止和完成状态。
- **报告管理**：支持历史报告搜索、时间筛选、删除、重新生成、基于补充信息完善报告。
- **商机评级**：输出初访前的跟进优先级、信息置信度、售前投入建议、成立条件和降级信号。

## 整体运作逻辑

```text
用户输入企业名称 / 行业 / 地区 / 股票代码 / AI需求线索
        |
        v
企业主体核对
        |
        v
创建后台研究任务
        |
        v
检索规划：按主体信息、工商本地、经营财务、产品客户、数字化AI、痛点机会拆分任务
        |
        v
公开信息搜索 + 多轮证据扩容
        |
        v
网页读取 / PDF年报解析 / 来源清洗 / 相关性审计
        |
        v
模型综合分析：客户认知、痛点推导、AI切入、方案优先级、前置要求
        |
        v
商机评级：优先级 + 置信度 + 售前投入边界
        |
        v
保存报告 JSON / HTML / 搜索索引 / 任务状态
        |
        v
前端展示、历史检索、下载 HTML、后续完善
```

## 报告内容结构

典型报告包含以下部分：

- **研究结论**：一句话判断、优先切入、核心依据、主要风险、下一步建议。
- **客户画像**：主体与区域、产品与客户、经营规模与财务、数字化与 AI、组织与决策、采购约束。
- **经营痛点**：每个痛点尽量包含依据来源、推导逻辑、现场确认口径和 AI 切入方向。
- **初步方案建议**：按 P0/P1/P2 等优先级给出可验证的小场景。
- **前置要求**：进入定制方案、报价或 POC 前需要补齐的关键信息。
- **商机评级**：跟进优先级、信息置信度、风险点、成立条件、暂缓或降级信号。
- **来源总览**：报告使用的公开来源、来源类型、支撑判断和链接。

## 商机评级说明

评级用于判断“初访前是否值得投入售前资源”，不是最终成交概率。

评级分两层：

- **跟进优先级**：优先推进、重点跟进、轻量跟进、待确认跟进、暂缓投入。
- **信息置信度**：高、中、偏低、低。信息不足会降低置信度，但不会简单等同于低价值。

主要维度：

- 客户价值潜力
- 问题触发强度
- 能力匹配度
- 决策可触达性
- 信息置信度
- 风险可控性

展开评级后，会看到：

- 售前投入建议
- 下一步成立条件
- 暂缓或降级信号
- 资源边界

## 模型与通道逻辑

模型通过 OpenAI 兼容接口调用。默认地址仍为硅基流动，也可以通过环境变量切换为任意兼容网关。API Key 通过本地 `.env` 或 Netlify 环境变量提供，不应写入前端代码或提交到仓库。

默认通道：

- 统一通道：`deepseek-ai/DeepSeek-V4-Pro`

检索规划和证据扩容中还可使用：

- `deepseek-ai/DeepSeek-V4-Flash`、`zai-org/GLM-5.1`、`Qwen/Qwen3.6-35B-A3B`、`moonshotai/Kimi-K2.6`

访问路径会影响通道优先级：

| 访问方式 | 含义 |
| --- | --- |
| `/` | 统一模型通道 |
| `/intl` 或 `/INTL` | 统一模型通道（兼容旧路径） |
| `/cn` 或 `/CN` | 统一模型通道（兼容旧路径） |
| `intl.*` 子域名 | 统一模型通道（兼容旧域名） |
| `cn.*` 子域名 | 统一模型通道（兼容旧域名） |

说明：以上模式仅为兼容历史访问方式，不再影响模型选择与通道顺序。

当前配置口径：所有通道统一使用 `OPENAI_COMPAT_BASE_URL`、`OPENAI_COMPAT_API_KEY`、`OPENAI_COMPAT_MODEL`。

## 环境变量

本地运行时，在项目根目录创建 `.env`。线上部署时，在 Netlify 项目后台配置同名环境变量。

```text
VITE_OIDC_AUTHORITY=
VITE_OIDC_CLIENT_ID=
OPENAI_COMPAT_BASE_URL=
OPENAI_COMPAT_API_KEY=
OPENAI_COMPAT_MODEL=
OPENAI_COMPAT_RESEARCH_FALLBACK_MODELS=
JINA_API_KEY=
MINIO_ENDPOINT=
MINIO_PORT=
MINIO_USE_SSL=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=
MINIO_REGION=
MINIO_AUTO_CREATE_BUCKET=
```

说明：

- `VITE_OIDC_AUTHORITY` 是前端 OIDC authority，默认本地可用值为 `http://localhost:8080/realms/bo`。
- `VITE_OIDC_CLIENT_ID` 是前端 OIDC client id，默认本地可用值为 `bo-web`。
- `OPENAI_COMPAT_API_KEY` 是统一模型通道使用的 API Key。
- `OPENAI_COMPAT_BASE_URL` 用于覆盖统一模型通道的 OpenAI 兼容网关地址（示例：`https://your-gateway.example.com/v1`）。
- 不配置 `OPENAI_COMPAT_*` 时，默认使用硅基流动地址（兼容旧配置）。
- `OPENAI_COMPAT_MODEL` 是统一模型通道的默认模型。
- `OPENAI_COMPAT_RESEARCH_FALLBACK_MODELS` 可配置研究模型候选列表，支持逗号或换行分隔。
- `JINA_API_KEY` 可选；不配置时仍可使用公开 Reader/Search 能力，但稳定性和额度可能受限。
- MinIO 配置项全部填写后会启用 MinIO 存储；`MINIO_ENDPOINT` 支持 `host` 或 `http(s)://host:port`。
- `MINIO_USE_SSL` 可选，常见取值：`true` / `false`；若 `MINIO_ENDPOINT` 带协议可自动推断。
- `MINIO_AUTO_CREATE_BUCKET` 可选，设为 `true` 时在桶不存在时尝试自动创建。
- `.env` 已被 `.gitignore` 排除，请不要提交本地环境变量文件。

## Keycloak 本地认证

Bo 入口现在支持 Keycloak OIDC 前端门禁。当前仅实现前端登录门禁，不包含 Netlify Functions 的服务端鉴权。

### 本地认证变量

在 `.env` 中设置：

```text
VITE_OIDC_AUTHORITY=http://localhost:8080/realms/bo
VITE_OIDC_CLIENT_ID=bo-web
```

### Docker Compose 联调

```powershell
copy .env.example .env
notepad .env
docker compose -f docker-compose.local.yml up -d --build
```

启动后可访问：

- Bo：`http://localhost:8888`
- Keycloak：`http://localhost:8080`
- Keycloak Admin：`http://localhost:8080/admin`

默认账号（仅本地联调）：

- 业务用户：`bo-demo / bo-demo123`
- 管理员：`admin / admin`

### 当前安全边界

- 未登录访问 Bo 时，会跳转到 Keycloak；登录后会经 `/auth/callback` 回到原页面。
- 当前不校验对 `/.netlify/functions/*` 的直连请求。若需要 API 级鉴权，需要后续在服务端增加 token 校验。

## 本地运行

推荐方式：

```powershell
copy .env.example .env
notepad .env
start-local.cmd
```

然后打开：

```text
http://localhost:8888
http://localhost:8888/cn
http://localhost:8888/intl
```

`start-local.cmd` 会：

- 执行构建
- 启动本地服务
- 将日志写入 `local-netlify-dev.log`

手动方式：

```bash
npm install
npm run build
npm run netlify:dev
```

如果本机网络需要代理，可按实际代理地址设置：

```powershell
$env:HTTP_PROXY='http://127.0.0.1:PORT'
$env:HTTPS_PROXY='http://127.0.0.1:PORT'
```

Docker Compose 方式：

```powershell
copy .env.example .env
notepad .env
docker compose -f docker-compose.local.yml build
docker compose -f docker-compose.local.yml up -d
```

如果需要同时启动 MinIO（本地联调）：

```powershell
docker compose -f docker-compose.local.yml --profile minio up -d --build
```

然后打开：

```text
http://localhost:8888
```

常用命令：

```powershell
docker compose -f docker-compose.local.yml build --no-cache
docker compose -f docker-compose.local.yml logs -f
docker compose -f docker-compose.local.yml down
docker compose -f docker-compose.local.yml --profile minio down
```

## MinIO 本地联调（最小示例）

### 1) 启动 MinIO

```powershell
docker compose -f docker-compose.local.yml --profile minio up -d
```

启动后可访问：

- API: `http://127.0.0.1:9000`
- Console: `http://127.0.0.1:9001`
- 用户名: `minioadmin`
- 密码: `minioadmin123`

### 2) 将 MinIO 配置写入 `.env`

可直接复制以下内容到 `.env`：

```text
MINIO_ENDPOINT=http://127.0.0.1:9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=nb-bo-dev
MINIO_REGION=us-east-1
MINIO_AUTO_CREATE_BUCKET=true
```

这些变量已包含在 `.env.example` 中，直接在 `.env` 里填写即可。

### 3) 启动项目

```powershell
start-local.cmd
```

说明：

- MinIO 与 Netlify Blobs 是并行支持、互斥启用：同一运行实例只会选一个远端后端。
- 选择规则：配置完整 `MINIO_*` 时使用 MinIO；否则在 Netlify 运行时使用 Netlify Blobs；否则使用本地文件。
- `MINIO_AUTO_CREATE_BUCKET=true` 时，首次写入会尝试自动创建 `MINIO_BUCKET` 指定的桶。
- 不再联调时，删除或注释 MinIO 环境变量即可切换回 Netlify Blobs 或本地文件。

### 4) 联调自检清单

先看健康检查里的存储后端：

```powershell
Invoke-RestMethod http://localhost:8888/.netlify/functions/health | ConvertTo-Json -Depth 6
```

重点确认返回中的 `storage.backend`：

- `minio`：当前优先写入 MinIO。
- `netlify-blobs`：当前使用 Netlify Blobs。
- `local-file`：当前仅使用本地文件存储（未选择远端后端）。

同时关注 `storage.remoteAvailable`：

- `true`：远端后端已就绪。
- `false`：远端后端不可用；在强一致模式下，请求会直接报错，不会降级到本地文件。

再确认 `channels` 数组中的通道配置是否生效：

- `channels[*].baseUrl`：每个通道当前生效的 OpenAI 兼容接口地址。
- `channels[*].baseUrlSource`：当前地址来源（例如 `env:OPENAI_COMPAT_BASE_URL` 或默认值）。
- `channels[*].model`：每个通道当前生效的默认模型。
- `channels[*].modelSource`：当前模型来源（例如 `env:OPENAI_COMPAT_MODEL` 或默认值）。
- `channels[*].resolvedFrom`：来源摘要，便于日志里快速查看最终命中来源。
- `channels[*].conflicts`：配置冲突信息（当同一链路配置了多个变量时可看到被覆盖项）。
- `channels[*].scope`：通道所属区域（`intl` 或 `cn`）。
- `configWarnings`：冲突总览，按通道聚合的简要告警列表（适合快速扫读）。

常见 `configWarnings` 类型：

- `api-key-missing`：单个通道缺少对应 API Key 环境变量。

再执行一次实际写入（例如生成一个新报告任务），然后在 MinIO Console 中确认桶内对象是否增加：

- Console: `http://127.0.0.1:9001`
- 桶名：`MINIO_BUCKET` 的值（示例是 `nb-bo-dev`）
- 关键前缀：`jobs/`、`reports/`、`index/`、`annual-reports/`

如果 `storage.backend` 显示 `minio`，但桶里没有新对象：

1. 检查 `.env` 中 `MINIO_*` 是否完整。
2. 检查 MinIO 容器是否存活：`docker ps`。
3. 检查 `MINIO_BUCKET` 是否存在，或启用 `MINIO_AUTO_CREATE_BUCKET=true`。

## 线上部署

Netlify 配置已写入 `netlify.toml`：

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"
```

部署前检查：

```bash
npm run build
```

如果使用自己的 Netlify 项目，需要在 Netlify 环境变量中配置上面的 `OPENAI_COMPAT_*`、可选 `JINA_API_KEY`，以及可选 MinIO 配置。

## 数据存储

存储后端为互斥选择（不会同时使用 MinIO 和 Netlify Blobs）：

1. MinIO（当 MinIO 环境变量完整可用时）
2. Netlify Blobs（未启用 MinIO 且在 Netlify 运行时）
3. 本地文件存储（仅在未选择远端后端时）

保存内容包括：

- 报告 JSON
- 报告 HTML
- 搜索索引
- 任务状态
- 年报解析结果

当前为强一致模式：如果已选择 MinIO 或 Netlify Blobs，远端不可用或操作失败会直接报错，不会降级到本地文件存储。

## 使用方法

1. 打开网页。
2. 输入企业名称。
3. 可选填写地区、行业、股票代码、已知 AI 需求。
4. 如有上市公司年报，可上传文字型 PDF 年报。
5. 在候选主体中选择正确企业。
6. 发起生成任务。
7. 在任务中心查看阶段进度；可关闭网页，后台仍会继续。
8. 生成完成后打开报告。
9. 如需补充信息，可在报告页输入新线索并完善报告。
10. 历史报告页可按企业名、关键词、时间周期和评级检索。

## 安全与边界

- API Key 应通过环境变量配置，不应写入前端代码或提交到仓库。
- 模型输出不能直接当作事实来源，报告会尽量绑定网页来源或年报页码。
- 公开信息不足时，报告会标注证据不足或待确认，不应作为最终商业结论。
- 年报 PDF 仅支持文字型 PDF；扫描件或图片型 PDF 需要 OCR 后再处理。
- 生成的报告适合会前准备和售前判断，不等同于法律、财务或投研尽调报告。

## 常见问题

### 为什么会显示“国际优先｜失败自动切国内”？

这是默认通道策略，不是报错。意思是先走国际模型通道，失败、超时或限流后自动使用国内通道。

### 为什么 `/cn` 或 `/intl` 有时变成大写？

浏览器可能根据历史记录自动补全大小写。系统已按大小写不敏感处理，`/CN`、`/cn`、`/INTL`、`/intl` 都可以识别。

### 为什么有些企业来源少？

小企业公开信息可能分散在工商、招聘、展会、专利、新闻、公众号和行业网站中。系统会做多轮扩容，但仍可能出现资料有限。资料不足时，报告会降低结论强度，并把缺口放入待确认项。

### 上传年报后还需要公开检索吗？

需要。年报能增强财务和经营信息，但客户的数字化现状、近期动态、招聘信号、行业压力、招投标和本地线索仍需要公开检索补充。

### 如何复用这个项目？

拉取代码后，复制 `.env.example` 为 `.env` 并配置自己的 API Key；部署到 Netlify 时，在对应项目的环境变量中配置同名变量。

## 项目结构

```text
src/
  main.ts              前端页面逻辑
  styles.css           页面样式

netlify/functions/
  resolve-company.mjs  企业主体核对
  create-report-job.mjs 创建报告任务
  run-report-job-background.mjs 后台生成任务
  get-report-job.mjs   查询任务进度
  get-report.mjs       读取报告
  search-reports.mjs   搜索历史报告
  improve-report.mjs   基于补充信息完善报告
  delete-report.mjs    删除报告
  upload-annual-report.mjs 上传并解析年报
  health.mjs           通道健康检查

netlify/lib/
  research.mjs         检索、读取、证据扩容
  report.mjs           报告结构与 HTML 渲染
  annual-report.mjs    年报 PDF 解析
  opportunity-rating.mjs 商机评级
  source-audit.mjs     来源审计
  job-progress.mjs     任务阶段与进度
  runtime-mode.mjs     国内/国际通道模式
        store.mjs            MinIO / Netlify Blobs / 本地存储
  ai.mjs               模型调用
```

## License

本项目未附带开源许可证文件。复用、分发或商用前，请先确认仓库所有者授权。
