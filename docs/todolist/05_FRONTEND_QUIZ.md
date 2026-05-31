# 05 Frontend Quiz TodoList

## 目标

按 Figma 实现 `/quiz/[token]` 未提交作答体验：移动端一题一屏、bottom sheet；PC 常驻右侧题号栏。

## 依赖任务

- `01_FOUNDATION.md`
- `03_BACKEND_API.md`

## 具体任务列表

- [x] P0-FE-01 建立 `/quiz/[token]` 页面数据加载状态：loading、active、submitted、not_found、expired、error。
- [x] P0-FE-02 实现 API client 和 Zod response parse。
- [x] P0-FE-03 实现 Top Progress：文字在上、进度条在下。
- [x] P0-FE-04 实现 QuestionContent：渲染题干 Markdown 和图片。
- [x] P0-FE-05 实现 OptionButton：未选、已选、提交后正确/错误状态。
- [x] P0-FE-06 实现本地未提交答案状态，按 token 保存到 `localStorage`，提交成功后清除。
- [x] P0-FE-07 实现上一题 / 下一题跳转。
- [x] P0-FE-08 移动端实现 Question Navigation bottom sheet，1-20 题号 5 列换行。
- [x] P0-FE-09 PC 端实现常驻右侧题号栏，1-20 题号换行。
- [x] P0-FE-10 未答满 20 题时禁用提交或提示未答题。
- [x] P0-FE-11 提交中禁用重复操作。
- [x] P1-FE-12 实现 token 错误页：不存在、过期、加载失败，提示返回 Telegram。
- [x] P1-FE-13 为移动端 390px 和桌面 1440px 写 Playwright 截图测试。
- [ ] P1-FE-14 对照当前 Figma 高保真稿做截图验收，重点检查移动端 bottom sheet、PC 常驻侧栏、结果页布局。（Blocked：当前仓库没有 Figma 文件链接或高保真导出，且结果页布局在 `06_RESULT_AND_HISTORY.md` 后续任务中实现；待结果页完成并提供 Figma 可读输入后执行）
- [x] P1-FE-15 图片加载失败时显示 alt / 文件名占位，并保留题目文本。

## 推荐使用的成熟工具 / 库

- Tailwind CSS
- shadcn/ui / Radix Dialog, Drawer
- react-markdown + rehype-sanitize
- Zod
- Playwright

## 不建议自行开发的部分

- bottom sheet/dialog focus trap
- Markdown renderer
- sanitizer
- API response validator

## 可能涉及的文件或模块

- `app/quiz/[token]/page.tsx`
- `src/quiz/client/api.ts`
- `src/quiz/components/QuizHeader.tsx`
- `src/quiz/components/QuestionContent.tsx`
- `src/quiz/components/OptionButton.tsx`
- `src/quiz/components/MobileQuestionSheet.tsx`
- `src/quiz/components/DesktopQuestionSidebar.tsx`
- `src/markdown/SafeMarkdown.tsx`

## 测试方式

- Component tests：选项点击、进度计算、提交按钮启用条件。
- Playwright：移动端 bottom sheet、PC 常驻侧栏、刷新后 localStorage 恢复。
- Playwright：图片加载失败时显示占位且题目文本仍可阅读。
- Playwright：截图对照当前 Figma 高保真稿。
- 验证提交前 DOM 不出现答案、解析、source URL。

## 验收标准

- 移动端和 PC 端使用响应式布局，不复制业务逻辑。
- 提交前不泄漏答案、解析、来源。
- 20 题未完成不能提交。
- 图片 Markdown 能正常渲染本地 `/assets/fe-siken/...`。

## 未确认问题 / AI 假设

- 已确认：断点采用 `< 1024px` 移动/平板布局，`>= 1024px` PC 布局。
- 已确认：UI 组件库使用 `shadcn/ui + Radix UI + Tailwind CSS`。
- 已确认：Markdown 渲染使用 `react-markdown + rehype-sanitize`。
- 已确认：UI design tokens 以当前 Figma 高保真稿为准。
