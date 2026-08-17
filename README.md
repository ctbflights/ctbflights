# CTB Flights

专供中国往返白俄罗斯留学生的机票时间段比价项目。

## 项目结构

- `site/`：Cloudflare Pages 静态前端
- `site/assets/logos/`：项目本地航空公司品牌资源
- `site/brand.js` / `site/brand.css`：航空公司品牌渲染与布局
- `site/stability-v1.0.25.js`：白航单航班隔离查询与临时错误重试层
- `functions/api/search.js`：Cloudflare Pages Functions 白航官网 GraphQL 查询入口

## v1.0.26

- 前端只接受本次实时查询返回的当前报价。
- 删除所有历史价格常量、历史价格回填函数、历史价格状态分支以及对应样式。
- 实时连接失败、结果缺失或官网未返回当前报价时，价格保持为空并明确显示当前查询状态。
- 白俄罗斯航空继续采用单航班日期独立请求，浏览器最多并发 2 个查询；明确的临时错误只针对该航班重试一次。
- 保留官网 RunSearch → SearchResults、X-Token、Cookie、BYN 原币价、税费、舱位与行李票价档解析。
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

当前：`v1.0.26`
