# CTB Flights

专供中国往返白俄罗斯留学生的机票时间段比价项目。

## 项目结构

- `site/`：Cloudflare Pages 静态前端
- `site/assets/logos/`：项目本地航空公司品牌资源
- `site/brand.js` / `site/brand.css`：航空公司品牌渲染与布局
- `functions/api/search.js`：浏览器同源 `/api/search` 入口，只负责把查询安全转发到 CTB Flights 专属 Supabase Edge Function
- Supabase 项目 `ctbflights` (`bexiueimgpsboxvdkdsy`)：独立白航实时查询后端
- Edge Function `flight-live-search`：Belavia RunSearch → SearchResults、X-Token、Cookie、BYN 票价、税费、舱位与行李票价档解析

## v1.0.28

- 修复浏览器直连 Supabase 时 CORS 预检 `OPTIONS 500` 导致真正 POST 根本无法发出的故障。
- 浏览器不再跨域直连 Supabase；统一请求同源 `/api/search`。
- Cloudflare Pages Function 不再直接访问白航官网，只负责把查询转发到 CTB Flights 专属 Supabase Edge Function。
- Supabase Edge Function 继续保持 JWT 校验开启。
- 删除 `site/backend-v1.0.27.js` 浏览器 fetch 拦截层，避免重复路由与 CORS 问题。
- `index.html`、`app.js`、`brand.js` 版本统一为 `v1.0.28`。
- 国航和白航默认 Logo 均使用项目本地资源。
- 前端只接受本次实时查询返回的当前报价；不使用任何历史价格、人工核验价格或静态价格兜底。
- 国航实时价格源尚未可靠接通前不伪造当前价格。
- 食光项目、食光 Supabase 和旧食光 Worker 均不参与 CTB Flights 当前查询链路。

## Cloudflare Pages 部署

- Production branch: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `site`
- Root directory: 留空

## 版本

当前：`v1.0.28`
