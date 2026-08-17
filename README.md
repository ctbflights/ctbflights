# CTB Flights

专供中国往返白俄罗斯留学生的机票时间段比价项目。

## 项目结构

- `site/`：Cloudflare Pages 静态前端
- `site/assets/logos/`：项目本地航空公司品牌资源
- `site/brand.js` / `site/brand.css`：航空公司品牌渲染与布局
- `site/stability.js`：仅针对白航临时接口失败的前端单次重试层
- `functions/api/search.js`：Cloudflare Pages Functions 实时查询入口

## v1.0.24

- 中国国际航空使用用户提供的正式品牌图作为唯一源图；浏览器本地 Canvas 自动去除深色背景、保留红色凤凰并将白色英文/中文题字渲染为深色字，适配浅色卡片。
- 紧凑结果行不再重复显示航空公司 Logo；“直飞航班 / 经停中转”标签与航线标题同行显示。
- 白俄罗斯航空查询恢复短轮询模型，并保留 `B2-752` / `B2752` 航班号统一匹配。
- 航班先返回、价格稍后返回时只额外等待少量轮询，不再重建 Search ID，避免长耗时导致整批 Pages Function 超时。
- 并发限制为 2；只有明确的临时查询错误才由浏览器重试一次，不把“没有当前报价”误判为连接失败。
- 国航实时价格接口尚未独立接通时，不伪造当前票价。

## 部署

Cloudflare Pages：

- Production branch: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `site`
- Root directory: 留空

Pages Functions 会自动从仓库根目录的 `functions/` 部署，因此前端只请求同源 `/api/search`，不依赖食光项目、Supabase 或旧 Worker。

## 版本

当前：`v1.0.24`
