# CTB Flights

专供中国往返白俄罗斯留学生的机票时间段比价项目。

## 当前版本

`v1.1.3`

## 页面结构

- `site/index.html`：一级页面，仅负责搜索条件
- `site/results.html`：二级结果页，显示价格日历与航班横向比较
- `site/js/version.js`：全站唯一运行时版本号来源
- `site/js/flight-data.js`：航班班期与航空公司基础数据；国航 Logo 使用项目内固定资源，不再动态生成兜底 Logo
- `site/js/home.js`：首页搜索与 URL 参数跳转
- `site/js/results.js`：结果页实时查询、价格计算、可售座位与 UI 渲染
- `functions/api/search.js`：Cloudflare Pages 同源查询代理

## 实时查询链路

浏览器只请求同源 `/api/search`：

`results.html → /api/search → Cloudflare Pages Function → CTB Flights Supabase Edge Function → Amadeus Flight Offers Search`

- Supabase 项目：`ctbflights` (`bexiueimgpsboxvdkdsy`)
- Edge Function：`flight-live-search`
- 同一套 Flight Offers Search 适配器同时服务白俄罗斯航空 `B2` 与中国国际航空 `CA`。
- 生产环境请求指定 `currencyCode=CNY`，返回金额直接作为人民币主价格。
- 结果按计划航班的出发地、目的地、日期、承运人和航班号再次过滤，避免把同日其他航班错误挂到目标班次上。
- `numberOfBookableSeats` 映射为“当前可订”提示；若数据源没有返回具体数字，则不伪造余票数。
- 只允许 Amadeus **Production** 响应作为实时票价展示；Test 环境的有限缓存数据只用于连通性测试，不能在公开页面冒充实时价格。
- 不使用历史价格、人工核验价、静态票价或官网抓取结果兜底。

## 已废弃链路

以下方案已从运行代码中退出，不应恢复：

- `webapi.belavia.by/graphql/query/nemo`
- 白航旧 `RunSearch / SearchResults` GraphQL 抓取
- 通过伪造 Cookie、X-Token、User-Agent 继续修复旧白航接口
- “官网核验价 / 历史核验价 / 参考价”兜底
- 国航文字/红圈“凤凰”替代 Logo

旧白航 GraphQL 已通过服务器探针确认会出现 TLS 握手失败；当前白航 WebSky 售票页对普通服务器请求返回 401，因此项目不再把网页抓取作为稳定实时价格方案。

## Amadeus 配置

Supabase Edge Function 读取以下 Secret：

- `AMADEUS_CLIENT_ID`
- `AMADEUS_CLIENT_SECRET`
- `AMADEUS_ENV`：必须设为 `production` 才会在公开页面展示为实时票价；`test` 只用于接口联调

认证方式为 OAuth 2.0 Client Credentials。访问令牌在 Edge Function 实例内短时缓存，避免每个航段重复获取 token。

## v1.1.3 主要变化

- 白航和国航统一切换为 Amadeus Flight Offers Search 适配器。
- 删除旧白航 GraphQL 运行路径。
- 前端增加 `provider_not_configured`、`provider_test_mode`、实时 GDS、无当前报价、航班未匹配等明确状态。
- Amadeus Test 数据不会显示成实时价格。
- 国航 Logo 删除旧 SVG/文字兜底链路，改为项目内固定正确资源。
- `/api/search` 保持同源代理，浏览器不直接暴露第三方票价 API 凭据。

## Cloudflare Pages 部署

- Production branch: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `site`
- Root directory: 留空
