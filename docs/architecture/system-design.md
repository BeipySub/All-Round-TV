# V2 系统设计

## 1. 组件边界

```text
Vue/Vben Web
   │ HTTPS + JSON / internal media paths
Nginx
   ├─ FastAPI API
   │   ├─ Auth / Users / Library
   │   ├─ Catalog / Search / Sources
   │   ├─ Playback / Ad markers / Recommendations
   │   └─ Admin / Audit
   ├─ PostgreSQL（业务事实源）
   └─ Redis（会话、缓存、播放令牌、任务状态）
            │
          ARQ Worker
            ├─ Provider/CMS 访问
            ├─ 来源健康检测
            ├─ 推荐物化与缓存
            └─ 广告标记聚合
```

浏览器只认识内部资源 ID 和短期媒体路径，不接触豆瓣、TMDB、CMS、密钥或上游媒体 URL。

## 2. 后端分层

| 层 | 职责 | 禁止 |
| --- | --- | --- |
| Router | HTTP、请求校验、身份入口、响应码 | 事务编排、外部请求 |
| Service | 权限、业务状态、事务与幂等 | 返回 ORM 对象、拼接上游 URL |
| Repository | PostgreSQL 查询和持久化 | 业务权限决策 |
| Provider | 豆瓣/TMDB/CMS 标准化 | 直接写用户业务数据 |
| Playback | 会话、HLS 解析/重写、Range | 接受客户端任意目标 URL |
| Worker | 可重试异步任务和聚合 | 把 Redis 当永久事实源 |

## 3. 前端边界

- 观影布局、播放器布局和 Vben 管理布局分离。
- OpenAPI 生成客户端是传输层事实源；页面通过领域适配器和组合式逻辑使用。
- ArtPlayer/hls.js 只接收内部播放会话地址。
- 路由守卫处理登录、声明版本和角色入口；后端仍逐请求鉴权。
- 播放器状态独立于页面列表状态，换源和选集通过显式命令创建新会话。

## 4. 一致性策略

- 用户、收藏、进度、来源审核、广告标记和审计使用 PostgreSQL 事务。
- Provider 与 CMS 结果允许最终一致，但必须携带抓取时间和来源状态。
- 搜索返回逐源状态；缓存命中不伪装成实时成功。
- 管理审核和角色修改使用版本字段或条件更新，冲突返回 409。
- Worker 使用幂等任务键；重试不得重复创建来源、推荐关系或聚合标记。

## 5. 可观测性

- 每个 API 请求生成请求追踪 ID。
- Provider、CMS、Worker 和媒体路径分别记录脱敏阶段、耗时、结果分类。
- 不记录 Cookie、邀请令牌、完整查询响应、完整媒体 URL 和用户观看内容明细。
- 管理审计与技术日志分开；审计只追加，技术日志按保留策略清理。
