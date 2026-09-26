# 系统架构

以当前代码为准。描述的是已经实现的结构，不是目标架构。

## 技术栈

- Next.js 15（App Router）+ React 19 + TypeScript
- Tailwind CSS 4
- Vitest，只测 `src/rules/`
- 无数据库、无登录、无支付、无 AI

`next.config.ts` 为空配置。没有 `vercel.json`。

## 前端结构

页面只有两个：

- `/`：`app/page.tsx` 渲染 `src/components/App.tsx`。向导和结果在同一页，步骤为 start → who → income → usage → result。
- `/sources`：`app/sources/page.tsx` 列出规则出处。

`app/layout.tsx` 用 `Providers` 包住全站。界面是窄栏（`max-w-lg`）。`src/components/SiteFrame.tsx` 存在，但没有任何页面引用它。

计算在浏览器里完成：`App` 调用 `estimate()`，不把年金或月额发给服务器。

## 核心计算

入口是 `src/rules/estimate.ts` 的 `estimate()`。它依次使用：

| 模块 | 作用 |
| --- | --- |
| `copayRatio.ts` | 判断 1割 / 2割 / 3割，或无法判定为单一比例 |
| `benefitLimit.ts` | 在宅的区分支給限度额；不知道金额时用 30% / 60% / 100% 假设 |
| `foodResidence.ts` | 设施食费、居住费。在宅不计入 |
| `highCost.ts` | 只判断高额介护可能落在哪一档。默认不从「先付」金额里扣减 |

金额和门槛写在这些文件的常量里。每个规则对象带 `sourceUrl`、`effectiveFrom`、`checkedOn`、`official`、`simplification`。`src/rules/index.ts` 的 `RULES` 供 `/sources` 和结果页使用。

信息不足时返回范围或「无法判定」，不取中间值。

## 数据存储

没有服务器端存储。

浏览器 `localStorage` 只有两键：

- `kaigo-draft-v1`：向导草稿
- `kaigo-locale`：语言。未保存时默认 `ja`，不读取浏览器语言

## 多语言

`src/i18n/ja.ts`、`en.ts`、`zh.ts` 都实现 `src/i18n/types.ts` 的 `Messages`。`Providers` 用当前语言取出整份文案。

规则说明正文（`official`、`simplification`）是日文，写在规则文件里，三语切换不会翻译它们。比例数字用 `formatRatio` / `formatRatioRange` 填进文案模板。

## 反馈

结果页的 `FeedbackForm` 向 `POST /api/feedback` 发送评分、意见、可选邮箱。默认不附带计算输入，除非用户勾选。

`app/api/feedback/route.ts`：

- 同时有 `RESEND_API_KEY` 和 `FEEDBACK_TO_EMAIL` 时，请求 [Resend](https://api.resend.com/emails) 发一封邮件。发件地址用 `FEEDBACK_FROM_EMAIL`，没有则用 `feedback@localhost`。
- 缺少上述变量，或 Resend 返回失败：接口返回 `mailto` 链接，页面显示「用邮件应用送出」。
- 不写数据库，不落盘。

## 部署形态

上次 `next build` 的路由类型：

- `/`、`/sources`：静态页（○）
- `/api/feedback`：按请求执行的 Serverless 函数（ƒ）

部署到 Vercel 后，静态页由 Vercel 托管。反馈函数只在有人提交时运行，跑完即结束。本机不需要开机，也没有需要一直运行的后台进程。

## 目录关系

```
app/page.tsx              → src/components/App.tsx
app/sources/page.tsx      → src/rules/index.ts
app/api/feedback/route.ts → 仅发信或返回 mailto
app/layout.tsx            → src/components/Providers.tsx
src/components/App.tsx    → estimate()、localStorage
src/components/ResultView.tsx → 结果、FeedbackForm
src/i18n/                 → 三语文案
src/rules/                → 规则、汇总、测试
src/lib/money.ts          → 金额格式和输入换算
```
