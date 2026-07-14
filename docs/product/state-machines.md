# V2 业务状态机

## 1. 邀请

`pending → accepted | expired | revoked`

- `accepted`：有效期内成功创建账号，原子消费邀请。
- `expired`：系统时间超过有效期。
- `revoked`：管理员在使用前撤销。
- 三个终态均不可恢复或再次使用。

## 2. 用户、会话与声明

### 用户

`active ⇄ disabled`；`active(user) ⇄ active(admin)`。

- 禁用同时撤销全部会话。
- 最后一个有效管理员不能进入 `disabled`，也不能降为 `user`。

### 登录会话

`unauthenticated → authenticated → logged_out | expired | revoked`

- 登录成功创建服务端会话和安全 Cookie。
- 用户退出为 `logged_out`；超时为 `expired`；管理员禁用或安全操作为 `revoked`。

### 声明

`current_accepted → outdated → current_accepted`

发布新版本使现有接受状态变为 `outdated`；重新确认后恢复。`outdated` 仅可访问声明与退出。

## 3. 搜索

```text
idle → validating → loading
                  ├→ success
                  ├→ partial_success
                  ├→ empty
                  ├→ failed
                  └→ cancelled
```

- 输入不合法或无可用来源：停留在 `validating` 并显示修正动作。
- 至少一源成功且有结果：`success` 或存在失败时 `partial_success`。
- 至少一源成功但无结果：`empty`，仍保留失败来源说明。
- 全源失败：`failed`；新查询或离开页面：`cancelled`。
- 加载更多是当前搜索的子任务，各来源游标独立推进。

## 4. 来源提交与全局来源

### 用户提交

```text
submitted → security_check
  ├─失败→ rejected_security
  └─通过→ probing
          ├─失败→ needs_revision
          └─通过→ pending_review
                    ├→ approved
                    ├→ rejected
                    └→ needs_revision
submitted | needs_revision | pending_review → withdrawn（尚未开始最终审核时）
```

- `rejected_security`、`approved`、`rejected`、`withdrawn` 为终态。
- 修改不是原记录回退；用户基于原记录创建新提交，保留审计链。
- 管理员只审核 `pending_review`，批准和拒绝必须带结论。

### 全局来源

`approved_disabled → active ⇄ degraded ⇄ paused → archived`

- 审核批准创建 `approved_disabled`，需管理员显式启用。
- 连续健康检查失败可使 `active → degraded`；恢复检查可回到 `active`。
- 管理员可暂停或恢复；`archived` 为不可对用户展示的终态。
- 系统不得因探测失败自动归档来源。

## 5. 播放

```text
idle → creating_session → loading_manifest → ready → playing ⇄ paused
                                  │             ├⇄ buffering
                                  │             └→ ended
                                  └──────────────→ error
expired_session → renewing_session → loading_manifest | error
```

- 创建会话前校验用户、来源、剧集和全局来源状态。
- 可恢复网络/HLS 错误进入 `buffering` 或内部恢复；超过策略阈值进入 `error`。
- `error` 可重试当前来源，或展示候选来源；只有用户确认才创建新来源会话。
- 会话过期且登录仍有效时可续建一次；失败后保持明确错误，不循环续建。
- `ended` 根据自动连播偏好提示或进入下一集；下一集仍需通过授权创建会话。

## 6. 数据导入

`uploaded → validating → preview_ready → confirmed → processing → completed | partial | failed`

- `validating` 只解析白名单和生成预览，不写业务数据。
- 用户在 `preview_ready` 确认后才进入 `processing`。
- 所有项目成功为 `completed`；有成功也有跳过/失败为 `partial`；无可写入项或事务失败为 `failed`。
- 重复文件依靠导入指纹和业务唯一键保持幂等。

## 6.1 广告时间段

`marking_start → marking_end → draft → personal_active → aggregated_candidate → verified | disputed | rejected`

- 用户点击“广告开始”进入 `marking_start`，点击“广告结束”形成可调整的 `draft`。
- 用户确认后成为 `personal_active`，立即用于本人手动跳过，但不能直接影响其他用户。
- 系统检测或多用户近似区段形成 `aggregated_candidate`，根据媒体版本、重合度和报告质量计算置信度。
- 高置信度或管理员确认进入 `verified`；互相冲突或错误报告进入 `disputed`；越界、无效或确认错误进入 `rejected`。
- 媒体版本指纹变化后，旧标记保留历史但不自动作用于新版本。

播放器进入广告区段时：`approaching → skippable → skipped → undo_available → completed`。自动跳过仅在用户开启且区段为 `verified` 时发生；撤销回到区段开始位置并暂停本次区段的再次自动跳过。

## 7. Provider 健康

`unconfigured → healthy ⇄ degraded ⇄ unavailable`

- 缺少配置为 `unconfigured`，不得显示秘密值。
- 部分能力或高错误率为 `degraded`；核心能力不可用为 `unavailable`。
- Provider 状态只影响依赖它的推荐或元数据，不阻断收藏、历史和 CMS 搜索。
