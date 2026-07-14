# V1 播放链路审查

## 1. 端到端链路

```text
用户搜索
  -> 浏览器请求 /proxy/<CMS search URL>
  -> CMS 返回 JSON 搜索结果
  -> 用户打开详情
  -> 浏览器内 /api/detail 伪接口
  -> /proxy/<CMS detail URL>
  -> 浏览器解析 vod_play_url
  -> 得到原始直链 episodes[]
  -> watch.html?url=<direct URL>&...
  -> 延迟跳转 player.html
  -> ArtPlayer + hls.js 直接请求上游 M3U8
  -> 浏览器保存历史与进度
```

关键结论：主播放流程只通过代理获取 CMS 搜索与详情，实际 M3U8 和分片通常由浏览器直接访问上游。Serverless 代理中大量 HLS 重写代码并没有被标准播放流程稳定使用。

## 2. 搜索到剧集

### 2.1 标准 CMS

- 搜索：`?ac=videolist&wd=<query>`。
- 分页：`?ac=videolist&wd=<query>&pg=<page>`。
- 详情：`?ac=videolist&ids=<id>`。
- 只使用 `vod_play_url` 中第一个 `$$$` 播放组。
- 以 `#` 分集，以 `$` 提取地址。
- 只接受 HTTP/HTTPS 地址。

这会丢弃同一 CMS 返回的其他播放线路及剧集名称。

### 2.2 HTML 特殊源

- 根据配置中的 `detail` 构造 `/index.php/vod/detail/id/<id>.html`。
- 使用正则从 HTML 中提取 `$https://...m3u8`。
- 使用简单正则提取 `<h1>` 与 `.sketch` 文本。

解析强依赖第三方 HTML 结构，没有版本、选择器契约和测试 fixture。

证据：`js/api.js:75-355`。

## 3. 页面跳转与状态传递

详情页的 `playVideo` 将以下内容写入 URL 或 localStorage：

- CMS ID、来源 key。
- 原始媒体 URL。
- 当前集数索引和标题。
- 完整剧集 URL 数组。
- 返回页面地址。

随后跳转至 `watch.html`。跳转页显示三段加载文案，把参数复制到 `player.html`，并使用 JavaScript 和 meta refresh 双重跳转。

问题：

- 增加约 2.8 秒固定等待，没有实际准备工作。
- 媒体 URL、标题和返回地址暴露在地址栏、浏览器历史和日志中。
- `returnUrl` 在多个位置 encode/decode，存在双重编码风险。
- 页面、URL 与 localStorage 共同保存相同状态，恢复优先级复杂。

证据：`js/app.js:989-1025`、`js/watch.js:1-94`、`js/player.js:117-218`。

## 4. 播放器初始化

ArtPlayer 配置包括自动播放、画中画、截图、倍速、全屏、AirPlay、网页全屏和移动端内联播放。hls.js 配置包括：

- 30 秒目标缓冲、90 秒后向缓冲。
- 分片最多重试 6 次。
- 清单和 Level 独立重试。
- 自适应码率和媒体错误恢复。
- 可选自定义 Loader。

播放器会销毁旧 ArtPlayer 实例，但 `currentHls` 的生命周期依赖 ArtPlayer customType 回调。多次 `video:playing` 会重复注册双击监听器，存在事件重复绑定风险。

证据：`js/player.js:400-758`。

## 5. 广告过滤

所谓“分片广告过滤”只删除所有 `#EXT-X-DISCONTINUITY` 标签，并不识别或删除任何广告分片：

```text
if (!line.includes('#EXT-X-DISCONTINUITY')) {
    filteredLines.push(line)
}
```

影响：

- 功能名称与实际行为不一致。
- 删除 discontinuity 标记但保留前后分片，可能破坏时间线、时间戳连续性或解码切换。
- `strictMode` 参数未产生差异。

V2 不应直接移植此逻辑。是否提供广告处理必须在产品、安全和媒体兼容性评估后重新决定。

证据：`js/player.js:761-803`。

## 6. 播放错误与恢复

- HLS 网络致命错误调用 `startLoad()`。
- HLS 媒体致命错误调用 `recoverMediaError()`。
- `bufferAppendError` 累计三次后尝试恢复。
- 视频已经开始播放后会忽略多类错误提示。
- 加载 10 秒后只替换文案，不终止请求或自动换源。
- 播放失败不会自动尝试其他已找到资源。

V2 需要明确错误状态机：初始化、加载清单、加载分片、可恢复错误、不可恢复错误、用户取消、会话过期和自动换源。

## 7. 自动连播与选集

- 播放结束时清除当前进度。
- 开启自动连播且存在下一集时，等待 1 秒后切换。
- 切换剧集更新当前页面 URL，但不会重新请求详情。
- WebKit 浏览器重新创建播放器，其他浏览器使用 `art.switch`。
- 切换到某集后立即调用 `clearVideoProgress()`，由于此时 `currentVideoUrl` 已更新，会删除目标集之前保存的进度；这会影响用户重新观看该集时的恢复。

证据：`js/player.js:713-730`、`js/player.js:887-951`。

## 8. 历史与进度保存

播放器至少有五类保存触发：

- 每 5 秒节流的 `timeupdate`。
- 每 30 秒定时器。
- 暂停。
- 页面隐藏。
- 页面卸载。

同时写入 `videoProgress_*` 和 `viewingHistory`，且两者匹配规则不同，可能产生高频 localStorage 序列化和状态不一致。

进度恢复优先级：

1. URL 的 `position`。
2. `videoProgress_<media-url>`。
3. 观看历史通过重新构造播放器 URL 传入的位置。

证据：`js/player.js:251-281`、`js/player.js:651-691`、`js/player.js:1076-1270`。

## 9. 换源逻辑

```text
当前标题
  -> 对每个已选源执行完整多页搜索
  -> 完全同名优先，否则第一条
  -> 请求候选详情
  -> HEAD/no-cors 测试第一集
  -> 以总耗时排序
  -> 使用相同集数索引切换
```

问题：

- 仅按标题匹配，容易匹配同名不同年份、电影/电视剧或不同版本。
- 换源会再次触发每源最多 50 页搜索，成本极高。
- `HEAD` 使用 `no-cors`，无法判断真实响应状态、媒体类型和 Range 支持。
- 测速混合 CMS 详情耗时和媒体请求耗时，不代表持续播放质量。
- 新资源集数少于当前集数时回退第 1 集，缺少明确提示。
- 切换后写入 `data.vod_name`，但详情响应没有该顶层字段，标题可能变成“未知视频”。

证据：`js/player.js:1489-1792`。

## 10. V2 播放模型建议

V2 应采用稳定引用而不是直链传递：

```text
media_id + source_entry_id + episode_id
  -> POST /api/v1/playback/sessions
  -> session_id + manifest_url
  -> /media/{session}/{resource-token}
```

要求：

- 浏览器 URL 不出现上游媒体地址。
- 播放会话只允许访问服务端已解析的剧集资源。
- 子清单、分片、KEY、MAP 都使用短期内部 token。
- 支持 Range、客户端取消和内容流式转发。
- 换源依据标准影视映射、季集信息和健康数据，不进行浏览器端暴力搜索。
- 进度唯一键使用用户、标准影视、季集，不使用媒体 URL。
- 保存策略由后端幂等 upsert，前端节流并在关键生命周期补写。

## 11. 待运行验证

- 主流 CMS M3U8 是否允许浏览器直接跨域。
- `art.switch` 在当前本地 ArtPlayer/hls.js 版本下是否正确销毁旧 HLS。
- iOS/Safari 原生 HLS 是否实际走 customType。
- 空剧集、单集、超长剧集列表和失效 URL 的实际 UI。
- iframe 旧路径是否仍存在可达入口。

