# CTB Flights

专供中国往返白俄罗斯留学生的机票时间段比价项目。

## 项目结构

- `site/`：Cloudflare Pages 静态前端
- `site/assets/logos/`：项目本地航空公司品牌资源
- `site/brand.js` / `site/brand.css`：航空公司 Logo 映射、失败兜底与展示布局
- `functions/api/search.js`：Cloudflare Pages Functions 实时查询入口

## 品牌资源

- 中国国际航空：使用用户提供的完整 Air China Logo 图片，本地存放于 `site/assets/logos/air-china-user.png`。
- 白俄罗斯航空：使用 CTB Flights 仓库内本地资源，避免外链破图。
- 紧凑结果行不再重复显示航空公司 Logo；“直飞航班 / 经停中转”标签移到航线标题右侧。

## 实时查询

- 白俄罗斯航空：通过 Belavia 官网 GraphQL 当前搜索链路查询。
- v1.0.22 将白航搜索改为顺序执行，并等待价格档数据真正返回后再结束轮询；同时兼容 `B2-752` / `B2752` 等航班号格式，降低 9 月票价间歇性丢失的问题。
- 中国国际航空：实时价格接口仍待后续独立接入。

## 部署

Cloudflare Pages：

- Production branch: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `site`
- Root directory: 留空

Pages Functions 会自动从仓库根目录的 `functions/` 部署，因此前端只请求同源 `/api/search`，不依赖其他项目的 Supabase 或 Worker。

## 版本

当前：`v1.0.22`
