# Changelog

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
