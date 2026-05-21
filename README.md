# 企业商机 Deep Research 网页工具

输入企业名称，先核对企业主体，再深度检索公开信息，生成销售/一线会前客户战报。报告会保存在云端，后续可按企业名、地区、行业和关键词模糊搜索复用。

## 功能

- 企业主体核对，避免集团、子公司、同名公司混淆。
- 深度检索公开信息，优先官方资料、财报公告、招聘、新闻稿、行业报告和可信第三方数据库。
- 优先使用硅基流动国际通道 `deepseek-ai/DeepSeek-V4-Pro`，失败后降级国内通道 `Pro/deepseek-ai/DeepSeek-V3.2`。
- 生成与售前预读包一致的 HTML 风格报告。
- 使用 Netlify Blobs 保存报告 JSON、HTML、搜索索引和任务状态。
- 支持历史报告搜索、查看生成时间、重新生成确认。

## 环境变量

在 Netlify 项目设置中配置以下变量，不要写入前端或提交到仓库：

```text
SILICONFLOW_INTL_API_KEY_PRIMARY=
SILICONFLOW_INTL_API_KEY_SECONDARY=
SILICONFLOW_CN_API_KEY_PRIMARY=
SILICONFLOW_CN_API_KEY_SECONDARY=
JINA_API_KEY=
```

`JINA_API_KEY` 可选；没有也会使用公开 Reader/Search 能力。

## 本地运行

```bash
npm install
npm run build
npx netlify dev
```

如本地需要代理：

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7897'
$env:HTTPS_PROXY='http://127.0.0.1:7897'
npm install --cache '.\.npm-cache'
```

## 部署

Netlify 构建配置已经写入 `netlify.toml`：

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

部署前请确认：

```bash
npm run build
rg "真实密钥前缀" . -g "!node_modules/**" -g "!dist/**" -g "!.npm-cache/**"
```

第二条命令不应搜到真实密钥。
