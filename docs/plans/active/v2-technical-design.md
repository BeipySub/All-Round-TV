# V2 技术设计方案

## 状态

- 状态：进行中
- 创建日期：2026-07-14
- 输入：`docs/product/`、交互基线 v0.5
- 输出：领域模型、API 设计、Redis/任务、安全边界和关键时序

## 目标

把已确认产品行为转成可实现、可迁移、可测试的技术边界，为 FastAPI、PostgreSQL、Redis、ARQ、Vben/Vue 和 ArtPlayer 工程初始化提供依据。

## 范围

- 身份、内容、来源、播放、用户库和管理领域。
- PostgreSQL 聚合根、关系、唯一约束与生命周期。
- `/api/v1` 资源设计、权限、幂等与错误约定。
- 播放会话、按来源选集、同类推荐和广告区段追踪。
- Redis 临时状态、ARQ 任务和可重建策略。
- SSRF、媒体令牌、隐私和审计边界。

## 非目标

- 本阶段不创建 SQLAlchemy 模型、Alembic 迁移或 OpenAPI 文件。
- 不锁定广告检测算法和置信度数值。
- 不实现 Provider、HLS 代理或前端组件。
- 不把本地原型视觉样式直接作为生产组件代码。

## 交付物

- `docs/architecture/system-design.md`
- `docs/architecture/domain-model.md`
- `docs/architecture/playback-recommendation-ad-tracking.md`
- `docs/architecture/redis-and-jobs.md`
- `docs/api/openapi-design.md`

## 验收标准

- 每个产品聚合根有所有者、事实源、状态、唯一约束和审计要求。
- 每个首版页面动作能映射到 API 资源及权限。
- 永久数据不依赖 Redis。
- 媒体请求不能接受任意 URL；广告标记不能跨媒体版本错误复用。
- 关键并发和幂等场景有明确处理策略。
