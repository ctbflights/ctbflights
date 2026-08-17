# CTB Flights

专供中国往返白俄罗斯留学生的机票时间段比价项目。

## 项目结构

- `site/`：Cloudflare Pages 静态前端
- `site/assets/logos/`：项目本地航空公司品牌资源
- `site/brand.js` / `site/brand.css`：航空公司品牌渲染与布局
- `site/stability-v1.0.25.js`：白航单航班隔离查询与临时错误重试层
- `functions/api/search.js`：Cloudflare Pages Functions 白航官网 GraphQL 查询入口

## v1.0.25

- 修正上一版部署错误：稳定查询脚本现在由 `index.html` 明确加载，不再出现“代码已提交但线上根本没执行”的情况。
- 白俄罗斯航空从“整批航班共用一次 Pages Function 请求”改为“每个航班日期单独请求”，浏览器最多同时发起 2 个白航查询；单条失败不会拖累整批。
- 明确的临时错误只针对该航班自动重试一次；官网没有返回当前报价时不会伪造成“有票”。
- 保留官网 RunSearch → SearchResults、X-Token、Cookie、BYN 原币价、税费、舱位与行李票价档解析。
- 国航使用用户确认的红色凤凰 + 黑色 AIR CHINA + 黑色中文题字透明品牌图，资源完全存放在 CTB Flights 自己仓库。
- 紧凑结果行不显示多余航空公司 Logo；“直飞航班 / 经停中转”标签与航线标题同行。
- 国航实时价格源尚未可靠接通前不伪造当前价格。

## 部署

Cloudflare Pages：

- Production branch: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `site`
- Root directory: 留空

Pages Functions 自动从仓库根目录的 `functions/` 部署。CTB Flights 不依赖食光项目、食光 Supabase 或旧食光 Worker。

## 版本

当前：`v1.0.25`
