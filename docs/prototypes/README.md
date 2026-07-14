# 原型管理规范

Figma 是可编辑原型的事实源。本目录保存经过确认的 PNG/PDF 快照及评审说明。

## 当前阶段

当前为 v0.1 低保真规格草案，尚未形成经过评审的 Figma 导出物：

- [核心用户流程](flows/v2-user-flows.md)
- [低保真线框](v2-wireframes.md)
- [交互规格](v2-interaction-spec.md)
- [Figma 交付清单](v2-figma-handoff.md)
- [观影主流程可点击原型 v0.2](interactive/v0.2/viewer-flow/README.md)
- [观影主流程可点击原型 v0.3](interactive/v0.3/viewer-flow/README.md)
- [观影、推荐与广告追踪原型 v0.4](interactive/v0.4/viewer-flow/README.md)
- [观影、推荐、来源选集与广告追踪原型 v0.5](interactive/v0.5/viewer-flow/README.md)
- [悬浮搜索版观影原型 v0.6](interactive/v0.6/viewer-flow/README.md)

以上 Markdown 是 Figma 制作输入，不替代可编辑 Figma 文件。完成 Figma 评审后，以确认导出物和评审记录更新本索引。

## 子目录

- `pages`：登录、首页、详情、播放器、设置和管理页面。
- `flows`：邀请、搜索、播放和资源审核流程。
- `components`：关键组件及其交互状态。
- `archive`：已被替代的历史原型。

## 命名

格式为 `<版本>-<页面或流程>-<YYYYMMDD>.<扩展名>`，例如：

```text
v0.1-login-20260710.png
v0.1-player-20260710.pdf
```

每次导出需同时记录 Figma 链接、适用方案、评审状态和已知差异。不得直接覆盖历史版本。

## 版本登记

| 版本 | 日期 | 状态 | Figma | 说明 |
| --- | --- | --- | --- | --- |
| v0.1 | 2026-07-13 | 已由 v0.2 替代 | 待建立 | 首次本地交互草案，未导出确认版本 |
| v0.2 | 2026-07-13 | 已由 v0.3 替代 | 待建立 | 优化主动作、选集选源、故障演示和换源恢复 |
| v0.3 | 2026-07-13 | 本地交互原型待评审 | 待建立 | 新增页面、列表、选择、错误与恢复动效及减少动态效果兼容；暂无 Figma PNG/PDF |
| v0.4 | 2026-07-14 | 本地交互原型待评审 | 待建立 | 页面整版重设计；新增同类推荐、广告标记、可信手动/自动跳过及撤销；暂无 Figma PNG/PDF |
| v0.5 | 2026-07-14 | 本地交互原型待评审 | 待建立 | 图标下滑搜索、播放页按配置来源选集、广告标记注册用户权限；暂无 Figma PNG/PDF |
| v0.6 | 2026-07-14 | 本地交互原型待评审 | 待建立 | 搜索改为原生悬浮模态框，支持焦点管理、Esc、遮罩关闭和最近搜索填充；暂无 Figma PNG/PDF |
