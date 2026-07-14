# API 后端 AI 规范

## 技术约束

- 使用 Python、FastAPI、Pydantic、SQLAlchemy 2、asyncpg、Alembic、Redis 和 ARQ。
- 数据库、Redis 和外部 HTTP 访问使用异步接口。
- 公共函数、服务和模型必须提供完整类型。

## 分层要求

- Router 只处理 HTTP、鉴权入口、校验和响应转换。
- Service 处理业务流程、权限和事务边界。
- Repository 负责数据库查询和持久化。
- Provider 负责豆瓣、TMDB、CMS 等外部系统适配。
- Playback 负责播放会话、HLS 重写和媒体响应。
- Security 统一实现会话、CSRF、SSRF、限流和敏感信息处理。

## 安全要求

- 禁止接受并代理未经服务端资源模型确认的任意 URL。
- 所有出站请求必须使用统一安全客户端，并验证 DNS、IP 和重定向。
- 密码使用 Argon2id；邀请和会话使用高熵随机令牌并只保存必要摘要。
- 日志必须脱敏，异常响应不得泄露内部地址和堆栈。

## 数据与测试

- 数据模型变化必须提供 Alembic 迁移。
- PostgreSQL 是业务事实源；Redis 数据必须允许重建。
- 单元测试不得依赖公网。
- Provider 使用固定 fixture 或 HTTP mock；集成测试使用隔离的 PostgreSQL 与 Redis。
- 修改 API 后必须更新 OpenAPI 快照并重新生成前端客户端。

