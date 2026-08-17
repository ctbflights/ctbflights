# CTB Flights

专供中国往返白俄罗斯留学生的机票时间段比价项目。

## 当前版本

`v1.1.5`

## 页面结构

- `site/index.html`：一级页面，负责时间范围、方向、城市、行程类型、乘客、舱位和经停条件
- `site/results.html`：二级结果页，显示价格日历与航班横向比较
- `site/js/version.js`：全站唯一运行时版本号来源
- `site/js/flight-data.js`：航班计划班期与航空公司基础数据
- `site/js/home.js`：首页搜索与 URL 参数跳转
- `site/js/results.js`：结果页 Ignav 实时查询、价格状态、航班段、行李和购买链接渲染
- `functions/api/search.js`：Cloudflare Pages Function，服务端调用 Ignav fare API
- `functions/api/booking-links.js`：根据 `ignav_id` 获取航空公司 / OTA 购买入口

## 实时查询链路

浏览器只请求同源接口：

`results.html → /api/search → Cloudflare Pages Function → Ignav Flight Prices API`

购买链接使用：

`results.html → /api/booking-links → Cloudflare Pages Function → Ignav booking-links`

- 单程使用 Ignav `POST /api/fares/one-way`。
- 往返使用 Ignav `POST /api/fares/round-trip`，不再把两个单程价格简单相加。
- 搜索结果仍以 CTB Flights 的计划班期作为候选，再用承运航司和航班号匹配 Ignav 当前报价。
- Ignav `verified` 显示为已核验价格；`unverified` 明确显示为参考价并提示去购买页确认。
- 不使用历史价格、人工核验价或静态票价兜底。
- Cloudflare 内部对完全相同的 Ignav fare 请求做 10 分钟边缘缓存，用于减少重复 API 消耗；浏览器端 `/api/search` 仍为 `no-store`。

## 凭据安全

- Ignav API Key 不写入 GitHub、不写入前端。
- Cloudflare Pages 使用加密 Secret：`IGNAV_API_KEY`。
- 浏览器无法读取 `IGNAV_API_KEY`，仅 Pages Function 在服务端通过 `env.IGNAV_API_KEY` 使用。

## v1.1.5 主要变化

- 正式移除生产查询链路中的 Supabase / Amadeus relay，主实时数据源切换为 Ignav。
- 新增 `functions/api/booking-links.js`，支持从搜索结果直接获取航司官网 / OTA 购买入口。
- 首页新增成人、儿童、舱位、经停筛选。
- 往返查询改用 Ignav round-trip 原生价格。
- 结果页展示 `verified / unverified` 价格状态、自行转机状态、实际航班段、机型、转机时间和 Ignav 返回的行李件数。
- 未返回的行李字段不再推断为 0 件；额外行李价格未返回时明确提示需在航司官网确认。

## Cloudflare Pages 部署

- Production branch: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `site`
- Root directory: 留空
