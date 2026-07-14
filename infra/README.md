# infra

基础设施目录：

- `docker`：Web、API 和 Worker 镜像构建文件。
- `nginx`：静态文件、`/api` 和 `/media` 反向代理配置。
- `postgres`：数据库初始化辅助配置，不存放业务迁移。
- `monitoring`：健康检查、指标和日志采集配置。

环境秘密不得写入本目录，只能通过环境变量或部署平台的秘密管理功能注入。

