# Changelog

## v1.1.6

- 修复 Ignav 已返回同航司真实行程、但因航班号与本地计划班表不完全一致而被全部过滤的问题。
- 现在优先展示与计划航班号精确匹配的 Ignav 报价；若没有精确匹配，则保留 Ignav 返回的同航司、同日期、同航线真实可售方案。
- 替代方案的航班号、时间、经停、机型均继续使用 Ignav 实际 segments，不拿本地计划班表伪装成实时行程。
- 新增本地 Air China 品牌图资源并替换破损的内嵌图片来源。
- API 与前端版本统一升级为 v1.1.6。

## v1.1.5

- 主实时票价接口由 Supabase / Amadeus relay 切换为 Ignav Flight Prices API。
- Cloudflare Pages Function 通过 `IGNAV_API_KEY` Secret 服务端访问 Ignav，API Key 不进入前端或 GitHub。
- 单程使用 Ignav one-way；往返使用 Ignav round-trip，避免把两个单程价格直接相加。
- 新增 Ignav booking-links 代理接口，可按 `ignav_id` 获取航空公司官网及 OTA 购买链接。
- 首页新增成人、儿童、舱位和经停筛选，并把条件传递到结果页。
- 结果页新增 verified / unverified 状态、实际航班段、实际机型、转机时间、自行转机提示与行李件数。
- 未返回的行李字段不视为 0 件；额外行李加购价格未提供时明确标注需官网确认。
- 对相同 Ignav fare 请求增加 10 分钟 Cloudflare Cache API 边缘缓存，减少重复成功请求消耗。

## v1.1.0

- 搜索首页与结果页拆分为独立两级页面。
- 首页只负责日期、方向、城市和行程类型选择；结果通过 URL 参数进入 `results.html`。
- 结果页新增价格日历、人民币主价、原始币种、航班卡展开详情、行李折叠区和排序。
- 桌面端使用价格日历 / 航班比较双栏布局，移动端调整为单栏与横向日期列表。
- 全站版本号统一由 `site/js/version.js` 管理。
- 删除旧 `app.js`、`brand.js`、`brand.css`。
- Supabase Edge Function 升级为 publishable key 自定义鉴权，修复 `UNAUTHORIZED_LEGACY_JWT`。
- Cloudflare `/api/search` 改用现代 publishable key，仅在 `apikey` 头中传递。
- 保持“只显示本次实时查询结果”的原则，不恢复任何历史核验价或静态票价。

## v1.0.x

- 早期单页版本：完成计划班表、白航 GraphQL 实时查询探索、Cloudflare/Supabase 拆分以及本地航空公司 Logo 资源。
