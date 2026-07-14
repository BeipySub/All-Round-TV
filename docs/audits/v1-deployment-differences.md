# V1 部署与代理差异审查

## 1. 支持方式

| 部署方式 | 静态页面 | HTML 密码注入 | 代理实现 | 缓存 |
| --- | --- | --- | --- | --- |
| Node/Render/Docker | Express 静态服务 | Express 读取并替换 HTML | `server.mjs` | 静态资源 max-age |
| Vercel | 静态文件 | 根 `middleware.js` | `api/proxy/[...path].mjs` | 响应 Cache-Control |
| Netlify | 静态文件 | Edge Function | `netlify/functions/proxy.mjs` | 响应 Cache-Control |
| Cloudflare Pages | 静态文件 | Pages `_middleware.js` | Pages Function | 可选 KV |

## 2. 代理行为对比

| 能力 | Express | Vercel | Netlify | Cloudflare |
| --- | --- | --- | --- | --- |
| 上游响应方式 | Axios stream | 全部读取为 text | 全部读取为 text | 全部读取为 text |
| M3U8 识别 | 无 | 有 | 有 | 有 |
| 主清单处理 | 无 | 选择最高 BANDWIDTH | 选择最高 BANDWIDTH | 选择最高 BANDWIDTH |
| 子资源重写 | 无 | `/proxy/<url>` | `/proxy/<url>` | `/proxy/<url>` |
| KEY/MAP 重写 | 无 | 有 | 有 | 有 |
| Range 转发 | 未实现 | 未实现 | 未实现 | 未实现 |
| 二进制安全 | 流式但不转发 Range | 否，按文本读取 | 否，按文本读取 | 否，按文本读取 |
| 代理缓存 | 无 | 浏览器/CDN Header | 浏览器/CDN Header | 可选 KV + Header |
| URL 网络边界检查 | 字符串前缀黑名单 | 仅 HTTP/HTTPS 格式 | 仅 HTTP/HTTPS 格式 | 仅 HTTP/HTTPS 格式 |
| CORS | 环境变量，默认 `*` | `*` | `*` | `*` |

## 3. Express 路径

优点：

- 使用 `responseType: stream`，不会把所有响应先读入内存。
- 配置请求超时和重试。
- 过滤部分敏感响应头。

缺陷：

- 不转发浏览器的 Range、Accept、Referer 等请求头。
- 只在第一次 URL 字符串上检查协议和部分前缀。
- `172.` 整段被阻止，但 IPv6、整数 IP、八进制/十六进制、DNS 和重定向未处理。
- 默认 CORS 为任意来源。
- 鉴权失败时将预期哈希和收到哈希写入日志。
- 代理错误可能把内部错误消息返回用户。
- Express 与 Serverless 的 HLS 行为完全不同。

证据：`server.mjs:15-223`。

## 4. Serverless 路径

三套 Serverless 代理共享相似设计：

1. 解码路径中的目标 URL。
2. 校验请求 URL 中的密码哈希与时间戳。
3. `fetch` 上游并使用 `response.text()` 读取全部响应。
4. 若为 M3U8，选择最高带宽子清单并重写资源 URL。
5. 非 M3U8 也以字符串形式返回。

确定问题：

- 视频分片、图片、字体、压缩内容等二进制响应会被文本解码破坏。
- 大响应被完整加载到函数内存，可能超过平台限制。
- 没有 Range 支持，不适合 MP4/TS 等媒体转发。
- 主清单被压平到最高带宽，破坏客户端自适应码率选择。
- 重写后的子资源 URL 不包含 `auth` 和 `t`，而每次代理请求又强制鉴权；若播放流实际走此路径，后续分片/KEY/MAP 会收到 401。
- 认证哈希出现在路径请求日志或 query 日志中。
- 上游错误正文与目标 URL 可能进入日志或错误响应。
- 没有 DNS 与私网检查。

证据：

- `api/proxy/[...path].mjs:129-178, 306-450`
- `netlify/functions/proxy.mjs:82-184, 190-334`
- `functions/proxy/[[path]].js:244-283, 490-577`

## 5. Cloudflare 特有差异

- 使用 KV 缓存原始内容与处理后的子清单。
- 缓存值把响应正文和 Headers 包装为 JSON 字符串。
- 缓存整个目标 URL 作为 key 的一部分，可能包含敏感查询参数。
- 存在两次鉴权调用，其中第二次未 `await`；第一次正确 await，因此当前不构成绕过，但属于明确的冗余/错误代码。
- `waitUntil` 用于缓存写入，但错误隔离和 KV 大小限制没有明确处理。

证据：`functions/proxy/[[path]].js:27-129, 432-557`。

## 6. HTML 密码注入差异

- Express 只动态渲染 `/`、`index.html`、`player.html` 和 `/s=*`。
- Vercel Middleware 匹配大部分页面。
- Netlify Edge Function 只处理 `/` 或 `.html`。
- Cloudflare Middleware 根据响应 Content-Type 处理所有 HTML。

四套实现都把服务器密码 SHA-256 放进浏览器页面，安全模型相同但缓存行为未统一。若 HTML 被 CDN 公共缓存，密码变更后的哈希更新与用户隔离均没有明确保证。

## 7. 路由差异

- Vercel 和 Netlify 显式把 `/s=*` 重写到 `index.html`。
- Express 显式提供 `/s=:keyword`。
- Cloudflare 目录中未发现等价 `_redirects` 或路由重写配置；`/s=*` 刷新可能由平台返回 404，需运行验证。
- `watch.html` 是静态页面，不是 `/watch` 路由；`index-page.js` 却检查 `/watch` 前缀，存在历史实现残留。

## 8. Docker 与本地开发差异

- Dockerfile 构建当前工作区并运行 Express。
- 归档的 `docker-compose.yml` 默认引用远程 `bestzwei/libretv:latest`，不构建本地 Dockerfile。
- 因此执行旧 compose 不能证明当前检出代码可运行。
- Render 使用 `npm install`，Docker 使用 `npm ci --only=production`，依赖安装策略不同。

## 9. PWA 与版本

- Service Worker 不缓存资源，只执行 skipWaiting 与 clients.claim。
- PWA 只能提供安装外壳，不提供离线能力。
- 页面每次加载都会访问本地版本文件及外部 GitHub/代理地址。
- 时间戳版本由旧 GitHub Action 自动修改并提交，产生大量无业务意义提交。

## 10. V2 部署约束

- 只维护 Nginx + Web + FastAPI + Worker + PostgreSQL + Redis 的 Docker Compose 路径。
- 开发环境与生产镜像使用同一 API/媒体实现。
- Nginx 只负责静态资源、同源路由和反向代理，不解析业务媒体 URL。
- FastAPI 使用统一安全出站客户端和流式响应。
- 环境变量不注入密码或秘密到前端构建产物。
- 健康检查区分存活、就绪、数据库、Redis 和 Provider 状态。
- 版本使用语义化 Git tag，不再自动提交时间戳。

## 11. 待运行验证

- 四个平台上 HTML 注入是否实际命中所有入口。
- Cloudflare `/s=*` 刷新行为。
- Serverless 代理处理 TS、KEY、图片和压缩 JSON 的实际破坏方式。
- CDN 是否缓存带认证结果的 HTML 或代理响应。
