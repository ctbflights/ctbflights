# CTB Flights

专供中国往返白俄罗斯留学生的机票时间段比价项目。

## 项目结构

- `site/`：Cloudflare Pages 静态前端
- `site/assets/logos/`：项目本地航空公司品牌资源
- `site/brand.js` / `site/brand.css`：Logo 映射、失败兜底与展示尺寸
- `functions/api/search.js`：Cloudflare Pages Functions 实时查询入口

## 部署

Cloudflare Pages：

- Production branch: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `site`
- Root directory: 留空

Pages Functions 会自动从仓库根目录的 `functions/` 部署，因此前端只请求同源 `/api/search`，不依赖其他项目的 Supabase 或 Worker。航空公司 Logo 已改为 CTB Flights 仓库本地资源，不再依赖外部图片站点。

## 版本

当前：`v1.0.20`
