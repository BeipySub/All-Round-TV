# Web 前端 AI 规范

## 技术约束

- 使用 Vue 3、TypeScript、Vite、Pinia、Vue Router、Ant Design Vue 和 Vben。
- 组件默认使用 `<script setup lang="ts">`。
- TypeScript 使用严格模式；禁止无说明的 `any`。
- ArtPlayer 与 hls.js 只能通过 `src/player` 中的封装使用。

## 目录职责

- `views`：路由页面，不放通用组件。
- `components`：项目级通用组件。
- `composables`：可组合的状态与副作用逻辑。
- `stores`：真正跨页面的 Pinia 状态。
- `api`：调用生成客户端的适配层，不手写重复接口类型。
- `layouts`：前台观影布局与后台管理布局。

## 禁止事项

- 不直接调用豆瓣、TMDB、CMS 或上游媒体 URL。
- 不使用 `window.*` 共享业务状态。
- 不依赖脚本加载顺序和内联 DOM 事件。
- 不手工编辑 `packages/api-client` 的生成文件。
- 不在组件中混合权限判断、请求编排和复杂数据转换。

## 验证

前端工程初始化后，修改必须通过格式检查、Lint、TypeScript、Vitest；关键用户流程还需通过 Playwright。

