# 06 Result And History TodoList

## 目标

实现提交后结果页、重复访问锁定页、历史记录写入和统计更新。

## 依赖任务

- `02_DATABASE.md`
- `03_BACKEND_API.md`
- `05_FRONTEND_QUIZ.md`

## 具体任务列表

- [x] P0-RH-01 前端识别 submitted response 并切换结果页。
- [x] P0-RH-02 实现移动端结果页单列布局：成绩摘要、出题构成、题目解析。
- [x] P0-RH-03 实现 PC 结果页：左侧全 20 题号及正误状态，右侧当前选中题目详解。
- [ ] P0-RH-04 解析详情展示原题、全部选项、用户答案、正确答案、解説、出典 URL。
- [ ] P0-RH-05 正确/错误选项状态与用户答案状态可区分。
- [ ] P0-RH-06 已提交状态隐藏提交按钮，体现答案锁定。
- [ ] P0-RH-06A 已提交 token 再次打开时允许只读切换题目详情，不允许重新提交。
- [ ] P0-RH-07 后端首次提交时写入 `answer_records`。
- [ ] P0-RH-08 后端首次提交时更新 `user_question_stats`。
- [ ] P0-RH-09 后端首次提交时更新 `user_topic_stats`。
- [ ] P0-RH-10 重复访问已提交 token 时返回首次答案和结果。
- [ ] P1-RH-11 移动端默认展示错题解析，提供 `すべての解説を表示` 展开全部。
- [ ] P1-RH-12 PC 端不隐藏正确题，左侧按 1-20 原顺序展示全题列表。

## 推荐使用的成熟工具 / 库

- React state/hooks
- Zod
- Drizzle transactions
- Playwright

## 不建议自行开发的部分

- 数据事务管理
- Markdown renderer
- 自定义复杂虚拟列表；20 题无需虚拟化

## 可能涉及的文件或模块

- `src/quiz/components/MobileResultView.tsx`
- `src/quiz/components/DesktopResultView.tsx`
- `src/quiz/components/ResultQuestionList.tsx`
- `src/quiz/components/ExplanationDetail.tsx`
- `src/quiz/submit-service.ts`
- `src/db/app/repositories/stats.ts`

## 测试方式

- Unit：正确率、正确数、错误数计算。
- API：首次提交写历史，重复提交不写。
- Playwright：结果页包含原题、全部选项、用户答案、正确答案、解析、URL。
- Playwright：PC 左侧全 20 题可切换右侧详情。

## 验收标准

- 结果页满足 Figma 当前设计。
- 已提交 token 永久可查看。
- 重复提交不更新错题池和统计。

## 未确认问题 / AI 假设

- 已确认：移动端默认展示错题解析，提供展开全部。
- 已确认：PC 结果页左侧按 1-20 原顺序展示全部题号和正误状态。
- 已确认：已提交 token 再次打开时允许只读切换题目详情。
- 已确认：MVP 不做打印/分享功能。
