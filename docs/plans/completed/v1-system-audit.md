# V1 系统审查方案

## 状态

- 状态：已完成
- 日期：2026-07-10
- 范围：`legacy/v1` 全部运行代码、配置和部署适配

## 目标

- 建立 V1 功能、页面、流程和业务规则清单。
- 识别浏览器数据、配置格式及隐式状态依赖。
- 还原搜索、详情、播放和代理完整链路。
- 对比 Express、Vercel、Netlify、Cloudflare 部署行为。
- 识别安全风险、缺陷和技术债。
- 建立 V1 功能在 V2 中的保留、重做、替换或删除决策矩阵。

## 审查方法

1. 静态读取所有 HTML、JavaScript、服务端与部署文件。
2. 提取脚本加载顺序、全局函数、存储键和外部请求。
3. 按用户流程还原跨文件调用关系。
4. 对代理鉴权、URL 验证、HLS 重写和响应转发进行实现对比。
5. 对无法从静态代码确认的行为明确标注“待运行验证”。

## 输出

- `docs/audits/v1-feature-inventory.md`
- `docs/audits/v1-code-architecture.md`
- `docs/audits/v1-data-storage.md`
- `docs/audits/v1-playback-pipeline.md`
- `docs/audits/v1-security-review.md`
- `docs/audits/v1-deployment-differences.md`
- `docs/audits/v1-issues-and-debt.md`
- `docs/audits/v1-to-v2-feature-matrix.md`

## 验收条件

- 旧版所有用户可见页面和主要功能均有记录。
- 所有 localStorage 键、环境变量和外部数据入口均有归类。
- 播放及代理链路可以从入口追踪到上游响应。
- 四种部署方式的能力差异有明确对比。
- 每项高风险发现均附带代码位置或实现证据。
- 功能矩阵能够直接作为下一阶段产品需求输入。

## 验收结果

- 已建立 8 份审查文档及索引。
- 已覆盖所有用户可见页面、15 个第一方脚本、四种代理/部署路径及浏览器数据。
- 已标记 3 项 P0 安全架构风险、12 项确认缺陷和主要技术债。
- 已建立 V1→V2 功能去向矩阵，并列出 7 项待产品确认问题。
- 未发起第三方网络请求；需要运行环境的行为均标记为待验证。
