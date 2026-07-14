# V2 OpenAPI 设计草案

> 实现后以 FastAPI 生成的 OpenAPI 为接口事实源；本文只定义资源和行为。

## 1. 通用约定

- 前缀 `/api/v1`，JSON 使用 `snake_case`，时间为 UTC RFC 3339。
- 资源 ID 使用 UUID；分页使用不透明 cursor。
- 修改请求需要会话、CSRF 和按能力限流。
- 错误结构：`code`、`message`、`request_id`、可选 `field_errors` 和 `details`。
- 409 表示状态/版本冲突，422 表示字段语义错误，429 表示限流。
- 创建邀请、导入确认、来源审核、广告标记提交支持幂等键。

## 2. 身份与用户

| 方法与路径 | 权限 | 行为 |
| --- | --- | --- |
| `POST /auth/login` | 访客 | 创建 Redis 会话 |
| `POST /auth/logout` | 登录 | 撤销当前会话 |
| `GET /auth/me` | 登录 | 当前用户、角色、声明状态 |
| `GET/POST /invitations/{token}/accept` | 访客 | 检查/消费邀请，令牌不进入日志 |
| `GET /terms/current` | 访客/登录 | 当前声明 |
| `POST /terms/current/accept` | 登录 | 接受当前版本 |

## 3. 内容、搜索与推荐

| 方法与路径 | 权限 | 行为 |
| --- | --- | --- |
| `GET /home` | 登录 | 继续观看、收藏摘要、推荐区块及 Provider 状态 |
| `POST /searches` | 登录 | 创建有界聚合搜索并返回逐源状态/游标 |
| `GET /media/{media_id}` | 登录 | 标准详情 |
| `GET /media/{media_id}/sources` | 登录 | 用户可用来源、线路与剧集 |
| `GET /media/{media_id}/recommendations` | 登录 | 同类候选与可解释 reason_code |
| `GET /playback/context/{media_id}` | 登录 | 播放页来源选集和推荐的组合上下文，可分接口并行获取 |

## 4. 播放

| 方法与路径 | 权限 | 行为 |
| --- | --- | --- |
| `POST /playback/sessions` | 登录 | 输入内部 `source_episode_id`，创建短期会话 |
| `POST /playback/sessions/{id}/renew` | 同一用户 | 最多按策略续建当前剧集 |
| `GET /playback/sessions/{id}/manifest` | 会话令牌 | 返回重写后的内部清单 |
| `GET /media/{session}/{resource}` | 会话令牌 | 受控分片、密钥、初始化段和 Range |
| `PUT /progress/{canonical_episode_key}` | 登录 | 乐观合并观看进度 |

创建播放会话不接收 URL。请求包含 `source_episode_id`、可选预期 `media_version_id` 和恢复进度意图；服务端再次校验来源与用户选择。

## 5. 广告标记

| 方法与路径 | 权限 | 行为 |
| --- | --- | --- |
| `GET /media-versions/{id}/ad-segments` | 登录 | 返回本人有效标记和可信聚合区段 |
| `POST /media-versions/{id}/ad-markers` | 有效注册用户 | 提交个人开始/结束区段 |
| `POST /ad-markers/{id}/reports` | 有效注册用户 | 确认或报告错误 |
| `POST /ad-segments/{id}/skip-events` | 登录 | 可选脱敏跳过/撤销质量反馈 |
| `POST /admin/ad-markers/{id}/review` | 管理员 | 确认、否决或标记争议 |

广告标记请求必须携带媒体版本 ID、开始/结束毫秒、类型和客户端观察时间；服务端验证会话用户确实有权访问该 SourceEpisode，但不保存播放令牌。

## 6. 来源与用户库

包括 `/sources`、`/source-submissions`、`/favorites`、`/history`、`/preferences` 和 `/migration/legacy`。所有本人资源从会话确定用户 ID，不接受客户端指定任意 `user_id`。

## 7. 管理端

包括 `/admin/users`、`/admin/invitations`、`/admin/sources`、`/admin/source-submissions`、`/admin/providers`、`/admin/system` 和只读 `/admin/audit-events`。所有修改返回新版本号并写入审计。
