# V1 代码架构审查

## 1. 总览

V1 是无编译步骤的多页原生 Web 应用。业务模块并非 ES Module，而是通过 HTML 中的脚本顺序、顶层变量、全局函数和 DOM ID 形成隐式依赖。

代码规模：

| 文件 | 行数 | 主要职责 |
| --- | ---: | --- |
| `js/player.js` | 1793 | 播放器、历史、进度、换源、移动端交互 |
| `js/app.js` | 1356 | 首页初始化、源管理、搜索渲染、详情、跳转、导入导出 |
| `js/ui.js` | 975 | Toast、Loading、搜索历史、观看历史、弹窗、清理数据 |
| `js/douban.js` | 793 | 豆瓣推荐、标签和推荐卡片 |
| `js/api.js` | 636 | 浏览器内伪 API、CMS 搜索/详情和特殊源解析 |
| `js/password.js` | 245 | 密码验证 UI 与状态 |
| `js/version-check.js` | 187 | 上游版本检查 |
| 其他第一方脚本 | 447 | 配置、搜索、跳转、PWA、代理鉴权等 |

全部 15 个第一方 JavaScript 文件通过 Node.js 语法检查，但这不代表浏览器运行逻辑正确。

## 2. 脚本加载顺序

### 2.1 首页

```text
sha256.min.js
  -> config.js
  -> proxy-auth.js
  -> customer_site.js
  -> ui.js
  -> api.js          # 覆盖 window.fetch
  -> douban.js
  -> password.js
  -> search.js
  -> app.js
  -> pwa-register.js
  -> 环境变量注入脚本
  -> version-check.js
  -> index-page.js
```

### 2.2 播放器

```text
sha256.min.js
  -> hls.min.js
  -> artplayer.min.js
  -> config.js
  -> proxy-auth.js
  -> customer_site.js
  -> password.js
  -> ui.js
  -> api.js
  -> search.js
  -> player.js
  -> 环境变量注入脚本
```

问题：`password.js` 在加载时读取 `window.__ENV__`，而环境变量初始化脚本位于所有业务脚本之后。多数读取发生在 DOMContentLoaded 后，因此通常碰巧可用，但它依赖执行时序而非明确模块契约。

## 3. 全局依赖

典型隐式依赖：

- `app.js` 直接调用 `showToast`、`showLoading`、`saveSearchHistory`、`searchByAPIAndKeyWord`。
- `douban.js` 直接调用 `search`、`showToast` 并修改 `selectedAPIs`。
- `player.js` 复用首页的 `searchByAPIAndKeyWord`、`getCustomApiInfo`、`showLoading`。
- `api.js` 读取 `API_SITES`、`API_CONFIG`、`ProxyAuth`，并全局覆盖 `window.fetch`。
- 多个页面通过浏览器把元素 ID 暴露成同名全局变量，例如播放器配置中的 `videoTitle`。

这些依赖没有导入声明、类型或循环依赖检测，改变脚本顺序即可造成运行错误。

## 4. 浏览器内伪 API

`api.js` 覆盖全局 `window.fetch`。当请求路径以 `/api/` 开头时，不访问服务器，而是调用浏览器中的 `handleApiRequest` 并返回人工构造的 `Response`。

```text
app.js fetch('/api/detail?...')
  -> window.fetch override
  -> handleApiRequest()
  -> /proxy/<encoded upstream URL>
  -> CMS
```

影响：

- 从代码表面无法判断 `/api` 是前端函数还是服务端接口。
- 所有调用方都依赖覆盖发生在调用之前。
- 测试、监控、缓存和接口契约无法独立建立。
- 播放器为换源功能被迫加载首页 API 与搜索脚本。

证据：`js/api.js:576-613`。

## 5. 状态模型

状态同时存在于：

- 顶层可变变量，如 `selectedAPIs`、`currentEpisodes`、`currentEpisodeIndex`。
- DOM 状态，如 `hidden`、`show`、输入框与复选框。
- URL 参数。
- localStorage。
- `window.*` 全局对象。
- iframe 父子窗口调用。

同一概念经常有多个事实源。例如当前剧集索引同时存在于 URL、内存变量、localStorage 和观看历史；来源同时使用 `source`、`source_code`、`sourceName` 与 `currentSourceCode`。

## 6. UI 组织

- HTML 包含大量内联 `onclick`、`onsubmit`、`oninput`。
- JavaScript 通过模板字符串生成复杂 HTML。
- 部分用户或上游内容直接拼接到 `innerHTML`。
- 设置、历史、详情、导入、确认等模态交互分散在 `app.js` 与 `ui.js`。
- 前台、播放器和管理配置没有组件复用边界。

HTML 页面自身没有重复 ID；问题主要来自动态 HTML 与全局函数，而不是静态 DOM ID 冲突。

## 7. 重复和失效抽象

- 首页与播放器重复加载密码、UI、API、搜索和资源配置代码。
- `app.js` 与 `player.js` 各自实现剧集排序、上一集、下一集、复制链接和状态保存。
- `handleAggregatedSearch` 与主搜索 `search()` 是两套聚合逻辑，主流程没有使用前者。
- `AGGREGATED_SEARCH_CONFIG`、部分 `PLAYER_CONFIG` 与 `SECURITY_CONFIG` 只有声明，没有形成统一行为。
- `proxy-auth.js` 读取 `passwordHash` 与 `userPassword` 兼容键，但当前代码没有写入这些独立键。
- iframe 播放器逻辑仍保留，但主流程已切换为整页 `watch.html` 跳转。

## 8. V2 架构约束

- 不迁移全局 fetch 覆盖；真实 API 必须由 FastAPI 提供。
- 不迁移 `window.*` 业务状态和内联事件。
- URL 只保存可分享的稳定页面状态，不保存原始媒体地址或整套剧集。
- Pinia 只保存跨页面会话状态；数据库保存用户事实；临时请求状态留在页面或 Query 层。
- 播放器封装为单一 Vue 组件/Composable，首页不得包含播放器实现。
- Provider、搜索、详情解析和换源匹配全部移至后端。
- OpenAPI 与生成客户端取代隐式接口。

## 9. 待运行验证

- 不同浏览器是否创建 HTML ID 同名全局变量，`videoTitle` 是否始终可用。
- 主流程是否仍实际使用 iframe 播放器。
- URL 中嵌套编码的 `returnUrl` 在各浏览器是否出现双重解码。
- Service Worker 在根路径和子路径部署下的作用域。

