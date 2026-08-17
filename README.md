# CTB Flights

专供中国往返白俄罗斯留学生的机票时间段比价项目。

## 当前版本

`v1.1.0`

## 页面结构

- `site/index.html`：一级页面，仅负责搜索条件
- `site/results.html`：二级结果页，显示价格日历与航班横向比较
- `site/js/version.js`：全站唯一运行时版本号来源
- `site/js/flight-data.js`：航班班期与航空公司基础数据
- `site/js/home.js`：首页搜索与 URL 参数跳转
- `site/js/results.js`：结果页实时查询、价格计算与 UI 渲染
- `site/assets/logos/`：本地航空公司 Logo

## 实时查询链路

浏览器只请求同源 `/api/search`：

`results.html → /api/search → Cloudflare Pages Function → CTB Flights Supabase Edge Function → Belavia GraphQL`

- Cloudflare Pages Function 只做请求校验和转发，不直接访问 Belavia。
- Supabase 项目：`ctbflights` (`bexiueimgpsboxvdkdsy`)
- Edge Function：`flight-live-search`
- v1.1.0 起使用现代 Supabase publishable key；旧平台 `verify_jwt` 网关检查关闭，Edge Function 内部自行校验 `apikey`。
- 白航只显示本次查询实际返回的当前报价，不使用历史价格、人工核验价或静态票价兜底。
- 国航实时票价源未可靠接通前不伪造当前价格。

## v1.1.0 主要变化

- 首页与结果页彻底拆分为两级页面。
- 点击“搜索时间段内的航班”后，通过 URL 参数跳转到独立结果页，搜索条件可分享、可刷新恢复。
- 结果页采用“左侧价格日历 + 右侧航班横向比较”的桌面布局，并提供移动端响应式布局。
- 删除旧 `app.js`、`brand.js`、`brand.css` 单页运行时代码，避免旧版本覆盖新页面。
- 版本号统一由 `site/js/version.js` 管理。
- 修复 Supabase 新 API key 与旧 JWT 网关不兼容导致的 `UNAUTHORIZED_LEGACY_JWT`。
- 删除全部历史核验/参考价兜底逻辑。

## Cloudflare Pages 部署

- Production branch: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `site`
- Root directory: 留空
