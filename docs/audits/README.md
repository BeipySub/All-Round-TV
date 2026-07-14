# V1 系统审查索引

本目录记录对 `legacy/v1` 的静态审查结果，作为 V2 产品定义的输入，不作为 V2 实现说明。

| 文档 | 内容 |
| --- | --- |
| [功能清单](v1-feature-inventory.md) | 页面、用户功能、搜索、详情、播放、历史和配置 |
| [代码架构](v1-code-architecture.md) | 脚本顺序、全局依赖、状态模型和模块问题 |
| [数据存储](v1-data-storage.md) | localStorage、历史结构、配置格式和迁移建议 |
| [播放链路](v1-playback-pipeline.md) | 搜索到播放、HLS、进度、换源和 V2 播放模型 |
| [部署差异](v1-deployment-differences.md) | Express、Vercel、Netlify、Cloudflare 行为对比 |
| [安全审查](v1-security-review.md) | 鉴权、SSRF、XSS、媒体隐私和安全门槛 |
| [缺陷与技术债](v1-issues-and-debt.md) | 已确认缺陷、性能、架构、测试和产品逻辑债 |
| [V1→V2 功能矩阵](v1-to-v2-feature-matrix.md) | 每项旧功能的保留、替换、删除和已确认决策 |

## 审查边界

- 当前结论来自静态代码与配置分析。
- 未启动旧服务，也未对第三方 CMS 或媒体地址发起请求。
- 标记为“待运行验证”的内容不能当作已确认运行事实。
- 产品决策已收敛，后续事实源见 [`docs/product/`](../product/README.md)。
