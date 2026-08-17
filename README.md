# CTB Flights

专供中国往返白俄罗斯留学生的机票时间段比价项目。

## 当前版本

`v1.1.4`

## 页面结构

- `site/index.html`：一级页面，仅负责搜索条件
- `site/results.html`：二级结果页，显示价格日历与航班横向比较
- `site/js/version.js`：全站唯一运行时版本号来源
- `site/js/flight-data.js`：航班班期与航空公司基础数据
- `site/js/home.js`：首页搜索与 URL 参数跳转
- `site/js/results.js`：结果页实时查询、价格计算与 UI 渲染

## 实时查询链路

浏览器只请求同源 `/api/search`：

`results.html → /api/search → Cloudflare Pages Function → CTB Flights Supabase Edge Function → Amadeus Flight Offers Search`

- Cloudflare Pages Function 只做请求校验和转发，不直接访问航空公司官网。
- Supabase 项目：`ctbflights` (`bexiueimgpsboxvdkdsy`)
- Edge Function：`flight-live-search`
- B2（Belavia）和 CA（Air China）统一通过实时 GDS 适配器查询。
- Test 环境只用于验证接入，不把缓存测试价格展示为实时价格。
- Production 环境才允许作为公开站点的实时票价源。
- 不使用历史价格、人工核验价或静态票价兜底。

## 凭据安全

- Amadeus Client ID / Secret 不写入 GitHub、不写入前端。
- CTB Flights Supabase 已启用 Vault，并提供仅供 Edge Function 调用的安全读取函数。
- Vault secret names：
  - `ctb_amadeus_client_id`
  - `ctb_amadeus_client_secret`
  - `ctb_amadeus_env` (`test` / `production`)

## v1.1.4 主要变化

- 首页与结果页保持两级页面结构。
- 删除旧 Belavia GraphQL 运行链路；不再调用 `webapi.belavia.by/graphql/query/nemo`。
- B2 与 CA 统一切换为 Amadeus Flight Offers Search 适配层。
- 修复 Supabase 新 API key 与旧 JWT 网关不兼容问题。
- 增加 Supabase Vault 凭据读取能力。
- Amadeus Test 缓存数据不会被误标为实时价格。
- 国航使用用户确认的本地品牌 Logo 资源，不再生成文字兜底 Logo。
- 删除全部历史核验/参考价兜底逻辑。

## Cloudflare Pages 部署

- Production branch: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `site`
- Root directory: 留空
