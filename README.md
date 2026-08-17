# CTB Flights

专供中国往返白俄罗斯留学生的机票时间段比价项目。

## 项目结构

- `site/`：Cloudflare Pages 静态前端
- `site/assets/logos/`：项目本地航空公司品牌资源（目前保留白俄罗斯航空本地资源）
- `site/brand.js` / `site/brand.css`：航空公司 Logo 映射、失败兜底与展示布局
- `functions/api/search.js`：Cloudflare Pages Functions 实时查询入口

## 品牌资源

- 中国国际航空：优先使用 Air China Limited 来源的正式 wordmark；失败时回退到国航官网当前 Logo 资源；不再使用自绘近似 Logo。
- 白俄罗斯航空：使用 CTB Flights 仓库内本地资源，避免外链破图。

## 部署

Cloudflare Pages：

- Production branch: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `site`
- Root directory: 留空

Pages Functions 会自动从仓库根目录的 `functions/` 部署，因此前端只请求同源 `/api/search`，不依赖其他项目的 Supabase 或 Worker。

## 版本

当前：`v1.0.21`
