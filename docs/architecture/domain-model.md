# V2 领域模型

> 本文定义逻辑实体和约束，不等同于最终 SQLAlchemy 字段清单。

## 1. 身份领域

| 实体 | 关键关系与约束 |
| --- | --- |
| User | UUID；规范化用户名唯一；角色 `user/admin`；状态 `active/disabled`；最后管理员保护 |
| Invitation | 创建管理员；令牌摘要唯一；`pending/accepted/expired/revoked`；一次消费 |
| TermsVersion | 版本唯一、发布时间、内容摘要 |
| TermsAcceptance | `(user_id, terms_version_id)` 唯一 |
| AuditEvent | 操作者、动作、对象类型/ID、脱敏摘要、请求 ID；只追加 |

登录会话保存在 Redis，但用户和声明接受记录保存在 PostgreSQL。

## 2. 内容与来源领域

| 实体 | 关键关系与约束 |
| --- | --- |
| MediaItem | 标准影视条目；类型、标题、年份和选定元数据 |
| ProviderMapping | `(provider, external_id)` 唯一并映射 MediaItem |
| MediaGenre | 标准分类；供筛选和推荐使用 |
| MediaItemGenre | `(media_item_id, genre_id)` 唯一 |
| MediaSource | 已审核全局来源；状态、能力和健康摘要 |
| UserSourceSelection | `(user_id, media_source_id)` 唯一 |
| SourceEntry | 来源中的影视条目；映射 MediaItem，可保留未标准化状态 |
| SourceRoute | SourceEntry 的播放线路，保存受控上游引用而非暴露给前端 |
| SourceEpisode | 路线内剧集；稳定内部 ID、原始显示名、季/集映射和顺序 |
| SourceSubmission | 用户候选来源和检测/审核生命周期；旧版本不可覆盖 |

同一标准剧集可能对应多个 SourceEpisode。跨来源沿用进度必须通过标准季/集映射，不按数组索引猜测。

## 3. 用户库领域

| 实体 | 唯一约束或保留策略 |
| --- | --- |
| Favorite | `(user_id, media_item_id)` 唯一 |
| ViewingProgress | `(user_id, media_item_id, canonical_episode_key)` 唯一 |
| ViewingHistory | `(user_id, media_item_id)` 唯一，指向最后活跃剧集 |
| SearchHistory | `(user_id, normalized_query)` 逻辑唯一；最多 50 条、90 天 |
| UserPreference | 每用户一份版本化偏好 |

## 4. 播放与广告领域

| 实体 | 说明 |
| --- | --- |
| MediaVersion | SourceEpisode 当前媒体版本指纹；依据清单结构、时长及稳定响应特征生成，不保存完整 URL |
| AdMarker | 创建用户可空；绑定 MediaVersion；开始/结束毫秒、类型、来源、状态和版本 |
| AdMarkerReport | 用户对标记的确认或错误报告；`(marker_id, user_id)` 保留最新有效意见 |
| AdSegment | 聚合后的有效区段；绑定 MediaVersion；置信等级、状态和依据摘要 |
| AdSkipEvent | 可选的脱敏质量事件；只记录区段、跳过/撤销和时间，不记录完整媒体地址 |

约束：`start_ms >= 0`、`end_ms > start_ms`、区段不得超过媒体时长容差。用户标记必须关联创建者，系统检测标记创建者为空但记录检测版本。

## 5. 推荐领域

推荐不是永久用户事实，可从以下数据重建：

- MediaItem 类型、分类、地区、年份和 Provider 标签。
- 用户收藏和观看历史的聚合偏好，不输出单条隐私给管理员。
- 可播放来源覆盖和健康状态。

可选物化实体 `RecommendationCandidate` 保存 `(seed_media_id, candidate_media_id, reason_code, score_version)`；Redis 只缓存排序结果。

## 6. 删除与保留

- 首版用户不物理删除，以禁用保持外键和审计主体。
- 来源归档不删除 SourceEntry、历史或广告版本记录。
- MediaVersion 变化使旧广告区段失效但保留历史。
- 推荐缓存和候选可重建；收藏、进度、用户标记与审核结论不可只存在缓存。
