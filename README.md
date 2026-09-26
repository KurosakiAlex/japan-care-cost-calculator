# 親の介護費用・自己負担かんたん計算

面向普通家庭的介护费用目安。计算在浏览器里完成。没有登录、数据库、AI 或支付。

## 改一条计算规则

金额和门槛只放在 `src/rules/`，不要写进页面文案。

1. 打开对应文件：负担比例 `copayRatio.ts`，限度额 `benefitLimit.ts`，高额介护 `highCost.ts`，食费居住费 `foodResidence.ts`。
2. 用更新后的厚生劳动省通知、告示或国税厅表格替换数字。
3. 改该文件里的 `effectiveFrom`、`checkedOn`、`official`、`simplification`。
4. 改 `src/rules/estimate.test.ts` 里会被这条规则影响的对照例。
5. 运行 `npm test`。结果页和 `/sources` 会读这些元数据。

公开解说页如果还写着改定前的食费或所得线，以较新的法令、告示、介護保険最新情報为准。

## 部署到 Vercel

1. 把这个目录推到 Git 远程仓库。
2. 在 Vercel 用 Next.js 预设导入。
3. 要记下使用类型时，在 Supabase 建好 `usage_events` 表，并在 Vercel 设置 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`。不要设置邮件变量。
4. 未设置这两个变量时，结果页仍可使用，使用记录不会写入。金额和邮箱不会上传。
5. 每次改规则，先在预览部署上对照 `npm test`，再合并到生产。

本地：

```bash
npm install
npm test
npm run dev
```
