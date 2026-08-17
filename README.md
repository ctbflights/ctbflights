# CTB Flights

专供中国往返白俄罗斯留学生的机票时间段比价项目。

## 项目结构

- `site/`：Cloudflare Pages 静态前端
- `site/assets/logos/`：项目本地航空公司品牌资源
- `site/brand.js` / `site/brand.css`：航空公司品牌渲染与布局
- `site/backend-v1.0.27.js`：前端查询路由层；将白航请求送往 CTB Flights 专属 Supabase Edge Function
- `functions/api/search.js`：Cloudflare Pages Function 备用实现；v1.0.27 起不作为白航主查询出口
- Supabase 项目 `ctbflights` (`bexiueimgpsboxvdkdsy`)：独立白航实时查询后端
- Edge Function `flight-live-search`：Belavia RunSearch → SearchResults、X-Token、Cookie、BYN 票价、税费、舱位与行李票价档解析

## v1.0.27

- 新建完全独立的 Supabase 项目 `ctbflights`，区域 `eu-central-1`，不复用食光 Supabase。
- 白俄罗斯航空实时查询主链路从 Cloudflare Pages Function 切换到 CTB Flights 专属 Supabase Edge Function。
- 每个白航日期继续独立查询，浏览器最多并发 2 个；明确的临时错误只针对该航班重试一次。
- 前端只接受本次实时查询返回的当前报价；不使用任何历史价格、人工核验价格或静态价格兜底。
- 国航实时价格源尚未可靠接通前不伪造当前价格。
- Cloudflare Pages 只负责前端展示与部署；食光项目、食光 Supabase 和旧食光 Worker 均不参与 CTB Flights 当前查询链路。

## Cloudflare Pages 部署

- Production branch: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `site`
- Root directory: 留空

## 版本

当前：`v1.0.27`
