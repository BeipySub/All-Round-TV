# All-Round-TV V2

All-Round-TV V2 是一个面向私有部署场景的多用户影视聚合、资源治理与在线播放系统。

项目正在从 V1 原生 JavaScript + Express/Serverless 架构重构为：

- Vben Admin、Vue 3、TypeScript、Vite、Pinia、Ant Design Vue
- FastAPI、PostgreSQL、Redis、ARQ
- ArtPlayer、hls.js
- Nginx、Docker Compose

## 当前状态

当前已完成目录规范化，正在进行“V1 系统审查”阶段。V1 已归档到 [`legacy/v1`](legacy/v1)，不参与 V2 的默认开发和构建。在功能审查、产品逻辑、流程原型和技术设计确认前，不初始化正式业务工程。

完整方案见 [`docs/PROJECT_REFACTORING.md`](docs/PROJECT_REFACTORING.md)，V1 审查见 [`docs/audits`](docs/audits)，目录职责见 [`docs/architecture/directory-structure.md`](docs/architecture/directory-structure.md)。

## 核心目录

| 目录 | 作用 |
| --- | --- |
| `apps/web` | Vben/Vue 3 前端应用 |
| `packages` | 前端共享类型、工具和生成的 API 客户端 |
| `services/api` | FastAPI、数据库、Provider、播放代理和 Worker |
| `infra` | Docker、Nginx、PostgreSQL 和监控配置 |
| `docs` | 架构、方案、工作记录、AI 经验和原型文档 |
| `scripts` | 开发、数据库、代码生成和 CI 辅助脚本 |
| `tests` | 跨前后端端到端、性能和验收测试 |
| `legacy/v1` | 只读 V1 历史快照 |

## 开发说明

V2 依赖尚未初始化。审查完成后将先进行产品、流程、原型和技术设计；环境准备和启动命令将在后续基础工程阶段写入 `docs/development/`。

参与开发前请先阅读根目录及目标子目录中的 `AGENTS.md`。
