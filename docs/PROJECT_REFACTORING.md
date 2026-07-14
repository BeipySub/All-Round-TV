# All-Round-TV V2 项目重构与规范化方案

> 文档状态：v0.5 交互基线已确认，技术设计进行中  
> 文档语言：中文  
> 目标版本：V2  
> 更新日期：2026-07-13  
> 适用范围：项目结构、产品能力、技术架构、工程规范、安全要求、AI 协作及研发过程管理

## 1. 文档目的

本文档用于统一 All-Round-TV V2 的产品方向、技术选型、目录结构、开发流程和验收标准。开发人员与 AI 编程工具在实施任何 V2 工作前，都应先阅读本文档及对应目录中的 `AGENTS.md`。

本次工作不是对旧代码进行局部整理，而是一次产品级重构：现有 V1 完整归档，新版在规范化的 Monorepo 中重新实现。

## 2. 已确定的关键决策

| 领域 | 决策 |
| --- | --- |
| 重构方式 | 产品重新设计，核心能力重做并增强 |
| 旧版处理 | 完整归档至 `legacy/v1/`，默认只读 |
| 前端底座 | Vben Admin |
| 前端技术 | Vue 3、TypeScript、Vite、Pinia、Vue Router |
| UI 组件库 | Ant Design Vue |
| 后端 | Python + FastAPI |
| 数据库 | PostgreSQL |
| 缓存与会话 | Redis |
| 异步任务 | ARQ Worker + Redis |
| 播放器 | ArtPlayer + hls.js |
| 网关 | Nginx |
| 部署方式 | Docker Compose |
| 用户模式 | 私有多用户系统 |
| 开户方式 | 管理员一次性邀请链接 |
| 资源源治理 | 用户提交，管理员审核后启用 |
| 推荐数据 | 豆瓣 + TMDB，支持降级 |
| 旧数据迁移 | 用户手动导入旧版 JSON |
| 上线策略 | 当前无线上环境，直接原地替换 |
| 文档语言 | 中文为主，代码标识使用英文 |
| 工作记录 | 每日一份汇总 |
| AI 记录 | 仅保存脱敏指令、失败案例、评测和改进结论 |
| 原型管理 | Figma 为事实源，确认版本导出 PNG/PDF 入库 |

## 3. 当前项目问题

### 3.1 前端

- 使用无构建步骤的 HTML、CSS 和原生 JavaScript。
- `player.js`、`app.js`、`ui.js` 等文件体积过大，职责混合。
- 通过 `window.*`、DOM ID 和脚本加载顺序共享状态，模块边界不清晰。
- 大量数据直接保存在 `localStorage`，缺少类型、版本和迁移机制。
- 页面中包含内联事件与全局函数，难以测试和复用。
- 第三方库以压缩文件直接存放于 `libs/`，版本与供应链不可追踪。
- 缺少 TypeScript、单元测试、端到端测试和稳定的代码质量门禁。

### 3.2 后端与代理

- Express、Vercel、Netlify、Cloudflare 分别维护代理逻辑，行为已经分叉。
- 代理鉴权使用浏览器可见的密码哈希及 URL 参数，容易被日志和历史记录暴露。
- 任意 URL 代理存在被滥用为 SSRF 跳板的风险。
- 对私网地址的拦截主要依赖字符串判断，无法可靠防御 DNS 解析和重定向绕过。
- 缺少统一的数据模型、数据库迁移、审计、限流和可观测性。

### 3.3 工程与文档

- 根目录同时包含源码、静态资源、部署配置和平台适配代码。
- README 与贡献文档只描述旧技术栈，不能指导 V2 开发。
- GitHub Actions 包含旧版同步和时间戳自动提交逻辑，不适用于新版。
- 缺少架构决策、开发方案、每日记录、原型版本和 AI 协作规范。

## 4. V2 产品目标

V2 定位为可通过 Docker 私有部署的多用户影视聚合与播放系统。

### 4.1 首版功能

- 管理员初始化、登录、退出和会话管理。
- 管理员创建一次性邀请链接、禁用用户和查看审计记录。
- 用户通过邀请链接设置账号与密码。
- 豆瓣与 TMDB 首页推荐、影视元数据和搜索结果聚合。
- CMS/API 资源源的聚合搜索、详情、剧集和播放。
- 用户提交候选资源源，管理员审核、测试、启停和排序。
- ArtPlayer 播放、HLS、自适应清晰度、换集、进度保存和恢复。
- 播放页同类影视推荐，以及按媒体版本追踪的广告标记、手动跳过和可信自动跳过。
- 用户观看历史、收藏、搜索偏好和资源源选择。
- 旧版配置、历史和偏好的 JSON 导入。
- 管理端源健康状态、Provider 状态和系统健康信息。

### 4.2 首版不包含

- 公共注册。
- 付费、订阅或广告系统。
- 评论、社交关系和站内消息。
- 邮件邀请和邮件通知。
- 面向第三方开发者的公开 API。
- 长期维护两套前端或两套代理实现。

## 5. 总体技术架构

```text
Browser
   |
   v
Nginx
   |-- /             -> Vue/Vben 静态资源
   |-- /api/v1/*     -> FastAPI
   `-- /media/*      -> FastAPI 安全媒体代理
                           |
             +-------------+-------------+
             |             |             |
         PostgreSQL      Redis       ARQ Worker
             |             |             |
             `-------------+-------------'
                           |
                Douban / TMDB / CMS Sources
```

### 5.1 前端

Vben 提供工程化、布局、权限、主题和管理端基础能力。观影首页、搜索、详情和播放器使用自定义前台布局；用户管理、资源审核和系统设置使用管理布局。

前端不能直接请求豆瓣、TMDB、CMS 或媒体地址，所有外部访问统一经过 FastAPI。

### 5.2 后端

FastAPI 采用 Router、Service、Repository、Provider 分层：

- Router：HTTP 协议、参数校验和响应转换。
- Service：业务流程、权限和事务边界。
- Repository：数据库读写。
- Provider：豆瓣、TMDB 和 CMS 的外部数据适配。
- Playback：播放会话、HLS 解析、地址重写和媒体转发。
- Worker：健康检测、缓存刷新和定时任务。

### 5.3 数据

PostgreSQL 是唯一业务事实源。Redis 中的数据均可过期或重新生成，不能把 Redis 当作永久存储。

## 6. 最终目录结构

```text
All-Round-TV/
├── apps/                         # 面向用户的可独立构建应用
│   └── web/                      # Vben/Vue 3 前端应用
│       ├── src/
│       │   ├── api/              # API 封装及请求适配
│       │   ├── components/       # 项目级通用 Vue 组件
│       │   ├── layouts/          # 前台与管理端布局
│       │   ├── router/           # 路由、菜单和权限守卫
│       │   ├── stores/           # Pinia 全局状态
│       │   ├── views/            # 页面级组件
│       │   ├── player/           # ArtPlayer 与 hls.js 封装
│       │   ├── composables/      # 可复用组合式逻辑
│       │   ├── styles/           # 主题和全局样式
│       │   ├── types/            # 前端专用类型
│       │   ├── utils/            # 无业务状态的工具
│       │   └── locales/          # 界面文案和国际化资源
│       ├── public/               # 原样发布的静态资源
│       ├── tests/                # 前端单元与组件测试
│       └── AGENTS.md             # 前端 AI 指令
│
├── packages/                     # 前端共享工作区包
│   ├── api-client/               # OpenAPI 生成客户端
│   ├── shared-types/             # 共享类型和枚举
│   └── shared-utils/             # 跨应用共享工具
│
├── services/                     # 后端服务
│   └── api/                      # FastAPI 与 ARQ Worker
│       ├── app/
│       │   ├── api/              # API 路由
│       │   ├── core/             # 配置、日志和基础设施
│       │   ├── db/               # 数据库连接与会话
│       │   ├── models/           # SQLAlchemy 模型
│       │   ├── schemas/          # Pydantic 模型
│       │   ├── repositories/     # 持久化封装
│       │   ├── services/         # 业务逻辑
│       │   ├── providers/        # 豆瓣、TMDB、CMS 适配器
│       │   ├── playback/         # HLS 与安全代理
│       │   ├── security/         # 会话、CSRF、SSRF、权限
│       │   ├── workers/          # ARQ 任务
│       │   └── main.py           # FastAPI 入口
│       ├── migrations/           # Alembic 迁移
│       ├── tests/                # 后端测试
│       └── AGENTS.md             # 后端 AI 指令
│
├── infra/                        # 部署基础设施
│   ├── docker/                   # 容器构建文件
│   ├── nginx/                    # 网关配置
│   ├── postgres/                 # 数据库初始化辅助配置
│   └── monitoring/               # 健康检查和监控配置
│
├── docs/                         # 项目长期维护文档
│   ├── architecture/             # 架构和数据流
│   ├── development/              # 开发、调试和测试指南
│   ├── deployment/               # 部署、升级、备份和恢复
│   ├── security/                 # 安全设计和威胁模型
│   ├── api/                      # API 约定
│   ├── plans/                    # 开发方案
│   │   ├── active/               # 正在实施
│   │   ├── completed/            # 已完成方案
│   │   └── templates/            # 方案模板
│   ├── worklogs/                 # 每日开发汇总
│   │   └── YYYY/                 # 按年份归档
│   ├── ai/                       # 脱敏 AI 知识库
│   │   ├── instructions/         # 指令模板
│   │   ├── evaluations/          # 评测用例和结果
│   │   ├── failures/             # 失败案例与改进
│   │   └── decisions/            # AI 规范变更决策
│   ├── prototypes/               # Figma 导出原型
│   │   ├── pages/                # 页面 PNG/PDF
│   │   ├── flows/                # 用户流程图
│   │   ├── components/           # 组件状态图
│   │   └── archive/              # 已废弃原型
│   ├── adr/                      # 架构决策记录
│   └── migration/                # V1 迁移说明
│
├── scripts/                      # 开发和维护脚本
│   ├── development/              # 环境检查和本地启动
│   ├── database/                 # 迁移、备份和恢复
│   ├── codegen/                  # API 客户端生成
│   └── ci/                       # CI 组合检查
│
├── tests/                        # 跨系统测试
│   ├── e2e/                      # Playwright 流程测试
│   ├── performance/              # 性能测试
│   └── acceptance/               # 发布验收测试
│
├── legacy/                       # 旧版归档，不参与新版构建
│   └── v1/                       # 当前 V1 完整快照
│
├── .github/                      # GitHub 自动化与协作模板
│   ├── workflows/                # CI 和镜像构建
│   ├── ISSUE_TEMPLATE/           # Issue 模板
│   └── copilot-instructions.md   # Copilot 薄适配指令
│
├── AGENTS.md                     # 全项目 AI 指令事实源
├── CLAUDE.md                     # Claude 的 AGENTS 引导文件
├── README.md                     # 项目入口和快速开始
├── CONTRIBUTING.md               # 贡献规范
├── CHANGELOG.md                  # 语义化版本记录
├── compose.yml                   # 完整容器编排
├── pnpm-workspace.yaml           # 前端工作区
└── .env.example                  # 环境变量示例
```

## 7. V1 归档规则

归档前创建 Git 标签 `legacy-v1-final`。以下内容移动到 `legacy/v1/`：

- HTML 页面、`js/`、`css/`、`libs/`、`image/`。
- Express 服务端、旧中间件和旧 package 清单。
- Vercel、Netlify、Cloudflare、Render、旧 Docker 配置。
- 旧 README、贡献指南、版本文件和旧工作流副本。

根目录重新创建 V2 文件。`legacy/v1/` 不参加默认安装、构建、Lint、测试和依赖更新。除非用户明确要求处理旧版，否则人员与 AI 均不得修改该目录。

## 8. 数据模型

首版至少包含以下实体：

- `users`：用户、角色、状态和密码摘要。
- `invitations`：邀请令牌哈希、创建人、有效期和使用状态。
- `user_preferences`：用户界面和播放偏好。
- `media_sources`：已审核资源源、状态、排序和健康信息。
- `source_submissions`：用户提交、审核意见和状态。
- `user_source_selections`：用户启用的资源源。
- `media_items`：标准影视条目。
- `provider_mappings`：豆瓣、TMDB 与标准条目的映射。
- `source_entries`：CMS 资源与标准影视条目的映射。
- `favorites`：用户收藏。
- `viewing_history`：观看历史和播放进度。
- `audit_logs`：管理员操作与关键安全事件。

主键统一使用 UUID；时间统一保存 UTC；所有结构变化必须提供 Alembic 迁移。

## 9. API 设计

统一前缀为 `/api/v1`：

| 接口组 | 用途 |
| --- | --- |
| `/auth/login`、`/auth/logout`、`/auth/me` | 会话管理 |
| `/admin/invites` | 创建和撤销邀请 |
| `/admin/users` | 用户管理 |
| `/sources` | 查看及选择已审核资源源 |
| `/source-submissions` | 用户提交资源源 |
| `/admin/source-submissions/{id}/review` | 管理员审核 |
| `/home` | 聚合首页数据 |
| `/search` | 聚合搜索 |
| `/media/{id}` | 标准影视详情 |
| `/media/{id}/sources` | 播放资源和剧集 |
| `/playback/sessions` | 创建播放会话 |
| `/history` | 观看历史和进度 |
| `/favorites` | 收藏管理 |
| `/preferences` | 用户偏好 |
| `/migration/legacy` | 旧数据预览和导入 |

错误响应采用统一结构，包含错误码、用户可读消息、请求追踪 ID 和可选字段错误。前端 API 客户端从 OpenAPI 自动生成，不手工重复维护接口类型。

## 10. 身份与权限

- 首个管理员通过环境变量初始化。
- 管理员创建一次性邀请链接，用户打开后自行设置密码。
- 邀请令牌仅保存哈希，过期、撤销或使用后不可再次使用。
- 密码使用 Argon2id。
- 角色固定为 `admin` 和 `user`。
- 会话使用高熵随机标识，实际状态保存在 Redis。
- Cookie 设置 `HttpOnly`、`Secure` 和 `SameSite=Lax`。
- 修改类请求必须通过 CSRF 校验。
- 登录、邀请验证、源提交和媒体会话创建必须限流。

## 11. Provider 与搜索

豆瓣和 TMDB 分别实现统一 Provider 接口，输出标准影视模型。优先使用明确的外部 ID 合并；无 ID 时使用标准化标题、年份和类型匹配，并保留数据来源。

Provider 单独设置超时、重试、熔断和 Redis TTL。TMDB Key 缺失或 Provider 故障时系统降级为可用 Provider，并在管理端显示告警，不能阻断 CMS 搜索和播放。

## 12. 资源源审核

1. 用户提交名称、地址和说明。
2. 后端进行格式、协议、DNS、目标 IP 和响应约束检查。
3. Worker 探测 CMS 接口能力并保存检测结果。
4. 提交进入 `pending` 状态。
5. 管理员批准或拒绝，并填写审核意见。
6. 批准后创建全局资源源；普通用户可以选择是否启用。

旧版自定义源导入后只生成待审核提交，不得自动成为可用源。

## 13. 播放与代理安全

前端不能传入任意目标 URL。播放流程如下：

1. 用户从已审核源的资源条目选择剧集。
2. 后端校验权限和资源状态，创建短期播放会话。
3. Redis 保存播放会话及允许访问的上游资源。
4. 前端通过 `/media/{session_id}/{resource_token}` 请求清单。
5. 后端将清单、分片、密钥和初始化段改写成内部令牌地址。
6. 媒体请求支持 Range、重定向和客户端中止。

每次 DNS 解析及每次重定向后都必须拒绝私网、回环、链路本地、保留地址和云元数据地址，同时限制响应大小、连接时间、读取时间、总时长、并发量和重定向次数。

## 14. AI 协作规范

### 14.1 指令层级

- 根 `AGENTS.md` 是全项目事实源。
- `apps/web/AGENTS.md` 增加前端专用规则。
- `services/api/AGENTS.md` 增加后端专用规则。
- 最近目录的规则在不违反根安全规则的前提下优先。
- Copilot 和 Claude 文件只引导读取 AGENTS，不复制完整规则。

### 14.2 强制要求

- 修改前先阅读相关方案、架构文档及最近的 `AGENTS.md`。
- 不得读取、记录或输出真实密钥和用户隐私。
- 不得直接修改生成的 API 客户端。
- 不得在 Vue 页面直接访问第三方 Provider 或 CMS。
- 不得新增任意 URL 代理或绕过 SSRF 防护。
- 数据库模型变化必须提供迁移和测试。
- 完成任务前运行受影响范围的测试和质量检查。
- 完成当天开发后更新每日工作记录。
- 可复用的 AI 失败经验必须脱敏后归档。
- 默认禁止修改 `legacy/v1/`。

## 15. 开发方案管理

每个跨模块功能在开发前创建 `docs/plans/active/<feature>.md`，至少包括：

- 背景与目标。
- 范围与非目标。
- 用户流程。
- 技术方案和数据流。
- API、数据结构或迁移变化。
- 安全影响。
- 测试与验收标准。
- 实施阶段、负责人和状态。
- 风险、回滚和遗留问题。

验收后将文档移动到 `docs/plans/completed/`，保留最终结论，不删除历史方案。

## 16. 每日工作记录

每日使用 `docs/worklogs/YYYY/YYYY-MM-DD.md`，同一天所有工作汇总到一份文件。模板如下：

```markdown
# YYYY-MM-DD 开发记录

## 今日目标

## 已完成

## 重要决策

## 修改范围

## 验证结果

## 遇到的问题

## 风险与待确认事项

## 下一步

## 相关链接
```

记录结论和证据，不记录无意义的命令流水；不得写入密钥、令牌、用户数据或完整 AI 对话。

## 17. AI 调优知识库

`docs/ai/` 保存：

- 可复用且脱敏的指令模板。
- 典型失败案例摘要。
- 失败原因与影响。
- 用于复现和判断效果的评测用例。
- 指令修改前后的结果对比。
- 最终采用或废弃某条规则的原因。

禁止保存完整聊天记录、系统提示、密钥、内部访问地址、真实用户内容和未经确认的模型输出。

## 18. 原型管理

Figma 是可编辑原型的事实源。仓库只保存确认版本的 PNG/PDF 快照和说明。

每组原型必须记录：

- Figma 文件或页面链接。
- 页面名称和用户流程。
- 原型版本与导出日期。
- 适用开发方案。
- 评审状态。
- 已知差异和后续调整。

命名格式：

```text
v0.1-login-20260710.png
v0.1-home-20260710.png
v0.1-player-20260710.pdf
```

已被新版本替代的原型移动到 `docs/prototypes/archive/`，不得直接覆盖导致历史丢失。

## 19. 工程质量与测试

### 19.1 前端

- Oxlint、Oxfmt、ESLint、Stylelint。
- TypeScript 严格模式。
- Vitest 单元和组件测试。
- Playwright 完整用户流程。
- 禁止无说明的 `any`、全局状态和直接 DOM 操作。

### 19.2 后端

- Ruff 格式和静态检查。
- mypy 类型检查。
- pytest、pytest-asyncio 和 respx。
- 使用 PostgreSQL、Redis 测试容器完成集成测试。

### 19.3 必测场景

- 邀请创建、过期、撤销、使用和重放。
- 登录、退出、会话过期、禁用用户和越权。
- CSRF、限流及审计。
- 用户提交源、恶意地址、安全检测、审核和启停。
- 豆瓣/TMDB 合并、缓存、单源故障和无 Key 降级。
- HLS 主清单、媒体清单、相对路径、密钥、初始化段和 Range。
- DNS 重绑定、私网重定向、超大响应和并发限制。
- 历史、进度、收藏和旧版 JSON 重复导入。

## 20. CI 与版本规范

CI 至少包括：

1. 前端安装、Lint、类型检查、单元测试和构建。
2. 后端依赖锁定检查、Ruff、mypy 和 pytest。
3. OpenAPI 客户端生成差异检查。
4. Docker 镜像构建。
5. 关键 Playwright 流程。

版本使用语义化版本和 Git 标签。`CHANGELOG.md` 记录用户可感知变化、迁移要求和安全修复，不再通过工作流自动提交时间戳版本。

## 21. 实施阶段

### 阶段一：归档与规范化

- 创建 `legacy-v1-final` 标签。
- 将 V1 完整移动到 `legacy/v1/`。
- 建立目录、文档、AGENTS、方案模板和工作记录模板。
- 替换旧 GitHub Actions。

### 阶段二：V1 系统审查

- 审查页面、功能、用户流程、浏览器数据和隐式业务规则。
- 还原搜索、详情、播放、换源、历史和代理链路。
- 对比四种部署实现并识别安全风险、缺陷和技术债。
- 建立 V1→V2 功能去向矩阵；未完成审查的功能不得直接开发。

### 阶段三：产品定义

- 根据审查结果编写产品需求、角色权限、信息架构和业务规则。
- 明确 V2 首版范围、非目标、异常状态和功能取舍。
- 为邀请、搜索、详情、播放、历史和资源审核建立状态机。
- 已完成，事实源见 [`docs/product/`](product/README.md)。

### 阶段四：流程与原型

- 先建立用户旅程、任务流程和页面流转，再设计页面。
- 完成低保真线框、交互原型和高保真 Figma 原型。
- 覆盖正常、空数据、加载、失败、超时、权限不足和恢复状态。
- 原型经评审确认并导出 PNG/PDF 后，才允许进入页面开发。
- 用户流程、低保真线框和 Figma 交付清单已形成 v0.1 草案，见 [`docs/prototypes/`](prototypes/README.md)；高保真 Figma 与评审尚未完成。

### 阶段五：技术设计

- 完成领域模型、PostgreSQL ER 图、API 契约和权限矩阵。
- 完成 Provider、搜索聚合、播放会话、Redis 和迁移设计。
- 完成威胁模型、关键时序图及 ADR。
- 使用可追踪矩阵确保产品需求、原型和技术设计相互对应。
- 已形成领域模型、API 资源、播放/推荐/广告追踪和 Redis/任务设计草案，进入评审。

### 阶段六：基础工程与垂直切片

- 引入 Vben `web-antd`。
- 建立 FastAPI、PostgreSQL、Redis、Alembic、ARQ 和 Nginx。
- 完成 Docker Compose、环境变量、日志和健康检查。
- 先验证“登录→搜索→详情→播放会话→播放”垂直切片，再扩展完整功能。

### 阶段七：身份与资源治理

- 实现管理员初始化、邀请、登录、会话和权限。
- 实现资源提交、探测、审核、启停和审计。

### 阶段八：内容与搜索

- 实现豆瓣/TMDB Provider。
- 实现标准影视条目、合并规则、首页、搜索和详情。

### 阶段九：播放能力

- 封装 ArtPlayer 与 hls.js。
- 实现短期播放会话、安全 HLS 代理、选集和换源。

### 阶段十：用户数据与迁移

- 实现历史、进度、收藏和偏好。
- 实现旧版 JSON 预览、导入和冲突处理。

### 阶段十一：验收与发布

- 完成端到端、安全和性能测试。
- 验证空数据库启动、管理员初始化和迁移。
- 更新所有文档，发布首个 V2 语义化版本。

## 22. 完成标准

- 根目录不再包含参与运行的旧 HTML、Express 或 Serverless 入口。
- `legacy/v1/` 内容完整且默认只读。
- 新开发者只根据 README 即可启动完整环境。
- `docker compose up` 能启动 Nginx、Web、API、Worker、PostgreSQL 和 Redis。
- 数据库可从空状态完成迁移和管理员初始化。
- 登录、搜索、详情、播放、换集、历史、收藏、源提交和审核全部通过端到端测试。
- 任意 URL 代理被移除，SSRF 安全测试通过。
- 豆瓣或 TMDB 单独故障时系统可以明确降级。
- 每项重大功能都有开发方案、测试证据和每日记录。
- AI 指令覆盖根目录、前端和后端，并明确验证命令与禁止事项。
- 目录结构及各目录职责在 README 和架构文档中保持同步。

## 23. 后续文档拆分

本文档评审通过后，将稳定内容拆分到对应长期文档：

- `README.md`
- `CONTRIBUTING.md`
- `AGENTS.md`
- `docs/architecture/overview.md`
- `docs/development/getting-started.md`
- `docs/deployment/docker.md`
- `docs/security/threat-model.md`
- `docs/migration/v1-to-v2.md`
- `docs/plans/templates/feature-plan.md`
- `docs/worklogs/templates/daily.md`
- `docs/ai/README.md`
- `docs/prototypes/README.md`

在正式实施前，本文件是 V2 重构范围与规范的总览依据。
