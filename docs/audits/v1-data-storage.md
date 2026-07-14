# V1 数据与浏览器存储审查

## 1. 总览

V1 没有服务端数据库。所有用户状态保存在当前域名的 localStorage，因此：

- 不支持多用户与多设备同步。
- 换域名、清理站点数据或浏览器隔离会造成数据丢失。
- 所有同源脚本均可读取密码哈希、历史和直接媒体地址。
- 数据没有统一 schema、版本迁移和写入事务。

## 2. localStorage 键

| 键 | 格式 | 作用 | V2 去向 |
| --- | --- | --- | --- |
| `selectedAPIs` | JSON string[] | 用户选择的资源源 key | `user_source_selections` |
| `customAPIs` | JSON object[] | `{name,url,detail,isAdult}` | 导入为 `source_submissions` |
| `hasInitializedDefaults` | 字符串布尔值 | 是否初始化默认设置 | 删除 |
| `yellowFilterEnabled` | 字符串布尔值 | 成人类型关键词过滤 | 用户偏好，产品阶段重新确认 |
| `adFilteringEnabled` | 字符串布尔值 | 播放器广告过滤开关 | 用户播放偏好，功能需重新评估 |
| `doubanEnabled` | 字符串布尔值 | 首页豆瓣推荐开关 | 用户首页偏好 |
| `userMovieTags` | JSON string[] | 用户电影标签 | 用户推荐偏好 |
| `userTvTags` | JSON string[] | 用户电视剧标签 | 用户推荐偏好 |
| `videoSearchHistory` | JSON object[] | `{text,timestamp}`，最多 5 条 | 可选数据库表或用户私有设置 |
| `viewingHistory` | JSON object[] | 观看历史、进度和剧集快照 | `viewing_history` |
| `autoplayEnabled` | 字符串布尔值 | 自动播放下一集 | 用户播放偏好 |
| `episodesReversed` | 字符串布尔值 | 集数显示顺序 | 用户播放偏好 |
| `hasSeenDisclaimer` | 字符串布尔值 | 是否接受声明 | 按声明版本保存用户确认记录 |
| `passwordVerified` | JSON object | `{verified,timestamp,passwordHash}` | 删除，由 Redis 会话替代 |
| `proxyAuthHash` | 字符串 | 代理访问哈希 | 删除 |
| `passwordHash` | 字符串 | 旧兼容读取键，当前无写入 | 删除 |
| `userPassword` | 字符串 | 旧兼容读取键，当前无写入 | 删除 |
| `currentVideoTitle` | 字符串 | 跨页传递标题 | 路由与 API 响应 |
| `currentEpisodes` | JSON string[] | 跨页传递所有直接播放地址 | 删除，改为播放会话/剧集 API |
| `currentEpisodeIndex` | 数字字符串 | 当前集数 | 路由状态与历史 |
| `currentSourceCode` | 字符串 | 当前来源，当前主要为写入 | 路由状态 |
| `currentPlayingId` | 字符串 | 当前 CMS ID，主要为写入 | 播放会话 |
| `currentPlayingSource` | 字符串 | 当前来源，主要为写入 | 播放会话 |
| `lastPlayTime` | 时间戳字符串 | 最近播放时间，当前主要为写入 | 历史时间 |
| `lastSearchPage` | URL | 播放前页面，当前主要为写入 | Router 返回状态 |
| `lastPageUrl` | URL | 播放器返回地址 | Router history |
| `cameFromSearch` | 字符串布尔值 | 跳转页标记，当前只写 | 删除 |
| `searchPageUrl` | URL | 搜索页地址，当前只写 | 删除 |
| `videoProgress_<encoded-url>` | JSON object | `{position,duration,timestamp}` | 合并进 `viewing_history` |

## 3. 观看历史结构

静态代码可形成如下宽松结构：

```json
{
  "title": "string",
  "directVideoUrl": "string",
  "url": "player.html?...",
  "episodeIndex": 0,
  "sourceName": "string",
  "sourceCode": "string",
  "vod_id": "string",
  "showIdentifier": "source_id or media URL",
  "timestamp": 0,
  "playbackPosition": 0,
  "duration": 0,
  "episodes": ["direct media URL"],
  "lastSyncTime": 0
}
```

主要问题：

- 保存完整剧集与直接媒体地址，数据量大且地址易失效。
- `showIdentifier` 在 ID 缺失时退化为播放 URL，同一影视可能产生重复记录。
- `saveToHistory` 用标题、来源、showIdentifier 去重；`saveCurrentProgress` 又用标题和集数索引匹配，规则不一致。
- 视频 URL 作为进度 key，带签名或临时参数时会产生大量重复键。
- 历史中的 URL 会被拼接进动态 HTML 事件，导入数据可扩大 XSS 风险。

证据：`js/player.js:1076-1265`、`js/ui.js:370-765`。

## 4. 搜索历史结构

当前格式：

```json
[
  { "text": "关键词", "timestamp": 0 }
]
```

代码兼容旧字符串数组。记录保存 60 天且最多 5 条。

证据：`js/ui.js:144-211`。

## 5. 配置导出格式

```json
{
  "name": "LibreTV-Settings",
  "time": "timestamp",
  "cfgVer": "1.0.0",
  "data": {
    "selectedAPIs": "serialized localStorage value",
    "customAPIs": "serialized localStorage value",
    "viewingHistory": "serialized localStorage value"
  },
  "hash": "sha256(JSON.stringify(data))"
}
```

风险与限制：

- `hash` 是完整性校验，不是签名；任何人都可以修改 data 后重新计算。
- 导入对 `data` 中的 key 不设白名单，会把任意字段写入 localStorage。
- 远程 URL 导入直接由浏览器访问外部地址。
- cfgVer 被写入但没有版本分支或 schema 迁移。
- 文件允许达到 10 MB，可能导致 localStorage 写入失败或页面阻塞。
- 用户标签、免责声明状态和独立进度键未被导出。

证据：`js/app.js:1141-1336`。

## 6. V2 导入规则建议

V2 导入分为“预览”和“确认”两步：

1. 只接受 `name=LibreTV-Settings` 且 `cfgVer=1.0.0`。
2. 对每个允许字段执行独立 schema 校验和大小限制。
3. 忽略密码、代理哈希、临时导航和未知字段。
4. `customAPIs` 转换为当前用户的待审核资源提交。
5. `selectedAPIs` 只映射到已经批准且仍存在的全局源。
6. `viewingHistory` 只迁移可识别的标题、来源、CMS ID、集数、位置与时间；不永久保存旧直接播放 URL。
7. 搜索历史和推荐标签由用户选择是否导入。
8. 导入使用幂等批次 ID，重复上传不会重复创建数据。
9. 返回逐项成功、跳过和失败报告。

## 7. 已确认产品决策

- 搜索历史服务端同步，最多 50 条、保留 90 天，可关闭和清理。
- 成人专用内容和来源不进入首版。
- 不迁移用户自定义豆瓣标签，首版仅使用系统标签。
- 观看历史每用户最多 500 个影视条目，不按时间自动过期，允许删除单条或清空。
- 使用声明按版本和用户重新确认。

完整规则见 [`docs/product/`](../product/README.md)。
