# 沪屙屙 · 微信小程序迁移计划

> 原项目：浏览器端 React 静态原型（CDN + Babel Standalone + MapLibre）
> 目标：上线为微信小程序

## 一、约束条件

| 项 | 值 | 影响 |
|---|---|---|
| 小程序主体 | **个人主体** | 不能用 `<web-view>`、不能开通微信支付、类目受限（"交通出行"不可选） |
| 上线时间 | **不急，追求最佳体验** | 排除 web-view 嵌入路径，选原生重写 |
| 已有资源 | 仅 GitHub 仓库 | 无 ICP 备案域名、无腾讯地图商业 Key |
| 代码现状 | React JSX + window 全局 | 业务逻辑（data/strategy）可复用，UI/地图层必须重写 |

## 二、路径选择

可选路径与决策：

| 路径 | 主体 | 域名 | 工作量 | 体验 | 决策 |
|---|---|---|---|---|---|
| 原生小程序重写 | 个人可 | 不需 | 大 | 最佳 | **✓ 选用** |
| Taro 跨端重写 | 个人可 | 不需 | 中 | 好 | ✗ 跨端优势意义不大 |
| `<web-view>` 嵌入 H5 | **必须企业** | 必须 ICP 备案 | 小 | 一般 | ✗ 个人主体不可用 |

**结论**：原生小程序重写。业务逻辑（`strategy.jsx` / `data_*.jsx`）几乎原样迁移，UI 与地图层按小程序规范重写。

## 三、技术映射

| 浏览器技术 | 小程序对应 | 迁移动作 |
|---|---|---|
| `<script type="text/babel">` + Babel Standalone | 预编译 JS | 所有 `.jsx` 改为 `.js`，去除 Babel |
| `window` 全局挂载 | CommonJS `require/module.exports` | `Object.assign(window, {...})` → `module.exports = {...}` |
| React JSX | WXML + WXSS | UI 完全重写（阶段 3） |
| MapLibre GL（WebGL + DOM） | 内置 `<map>` 组件（腾讯地图） | 地图重写（阶段 4） |
| `navigator.geolocation` | `wx.getLocation({type:'gcj02'})` | API 适配（阶段 5） |
| `localStorage` | `wx.getStorageSync` | API 适配（阶段 5） |
| CDN 脚本 | 小程序禁止外链 | 依赖内置/分包 |
| HTML/CSS | WXML/WXSS（rpx 单位） | 模板重写 |
| GeoJSON 本地文件 | 主包 2MB 限制 | 可能需分包/后端化（阶段 6） |

## 四、坐标系特别说明

| 项 | 浏览器版 | 小程序版 |
|---|---|---|
| 源 GeoJSON 坐标系 | GCJ-02 | GCJ-02 |
| 底图坐标系 | WGS-84（OpenFreeMap/Esri） | **GCJ-02**（腾讯地图） |
| 是否需要纠偏 | **需要**（141b8a8 那套 GCJ-02→WGS-84 转换） | **不需要**（源数据与底图同坐标系） |

→ 阶段 4 地图重写时，**省去 `gcj02ToWgs84` 整套转换逻辑**。

## 五、7 阶段路线图

### ✅ 阶段 1：账号与工具准备
- [x] 创建分支 `feat/miniprogram-migration`
- [x] 小程序项目骨架（`app.json` / `app.js` / `app.wxss` / `sitemap.json` / `project.config.json`）
- [x] 配置定位权限 `scope.userLocation` + `requiredPrivateInfos`
- [ ] 注册小程序账号、获取 AppID（**用户操作**，填入 `project.config.json`）
- [ ] 下载微信开发者工具（**用户操作**）

### ✅ 阶段 2：业务逻辑迁移
- [x] `data_0.jsx ~ data_8.jsx + data_build.jsx` → `utils/data.js`（CommonJS 模块）
- [x] `strategy.jsx` → `utils/strategy.js`（仅改导出方式，逻辑字节级等价）
- [x] Node.js 验证：410 站 / 19 线路 / 490 厕所（去重 30 条）
- [x] `findRoute` 验证：人民广场→徐家汇 6 站 12.5min 0 换乘 ✓
- [x] 短驳惩罚验证：嘉定北→锦绣路 走 11→2→7 而非 11→12→7 ✓
- [x] `recommend` 验证：4 个用例输出合理 ✓
- [x] 测试页 `pages/test/`：5 个快捷用例 + 手动输入交互验证

### ⏳ 阶段 3：UI 层重写（5-10 天）
- [ ] `home.jsx` → `pages/home/`（WXML/WXSS）
- [ ] `sheets.jsx` 底部弹窗 → 自定义组件
- [ ] `components.jsx` GlassCard/SectionLabel/Segmented → 自定义组件
- [ ] `icons.jsx` SVG → `<image>` base64 或字体图标
- [ ] `app.jsx` 页面切换 → TabBar 或自定义路由
- [ ] JSX `{cond && <X/>}` → WXML `<x wx:if="{{cond}}"/>`
- [ ] `.map(...)` → `wx:for`
- [ ] CSS 单位 `px` → `rpx`（750rpx = 屏宽）

### ⏳ 阶段 4：地图层重写（3-5 天，最关键）
- [ ] MapLibre → 内置 `<map>` 组件
- [ ] `geo/shanghai_subway_line.geojson` → `polyline` 数组（每线一个对象）
- [ ] `geo/shanghai_subway_station.geojson` → `markers` 数组
- [ ] 厕所详情弹窗 → `bindmarkertap` 事件 + 自定义 Sheet
- [ ] 自动视野 → `include-points` 属性
- [ ] **不要**移植 `gcj02ToWgs84` 转换（坐标系已对齐）
- [ ] polyline 单条 ≤1000 点（长线路分段）
- [ ] markers >100 个需做视野裁剪或聚合
- [ ] 用 `cover-view`/`cover-image` 覆盖在原生 map 上

### ✅ 阶段 5：原生 API 适配
- [x] `navigator.geolocation` → `wx.getLocation({type:'gcj02'})` + Haversine 最近车站查找（`utils/location.js`）
- [x] `localStorage` → `wx.getStorageSync/setStorageSync`（home.js 状态持久化：cur/dest/gender/need/hold）
- [x] `fetch/XHR` → 不需要（纯离线应用，无网络请求）
- [x] `alert` → `wx.showToast`（定位成功/失败提示）
- [x] `history.pushState` → `wx.navigateTo`（阶段 3 已完成）
- [x] 新增"我的"页面（`pages/user/`）+ tabBar 第三 Tab

### ✅ 阶段 6：包体积处理
- [x] 检查总大小：**377 KB**（远低于 2MB 主包限制）
- [x] 最大文件 `metro-geo.js` 235 KB（已 DP 抽稀，20 线 390 站）
- [x] 无需分包加载 / 后端化 / 进一步精简

### ⏳ 阶段 7：提交审核与发布（需用户操作）
- [ ] **填 AppID**：`project.config.json` 的 `"appid"` 字段
- [ ] **微信开发者工具上传**：打开 `miniprogram/` 目录 -> 点"上传" -> 填版本号 1.0.0 + 备注
- [ ] **mp.weixin.qq.com 后台**：
  - [ ] 类目选择：**工具**（个人主体可选，避开"交通出行"）
  - [ ] 隐私设置：勾选"位置信息"（用于定位最近车站）
  - [ ] 提交审核
- [ ] 审核通过后 -> 发布上线
- [ ] （可选）审核前从 `app.json` pages 数组移除 `pages/test/test`（调试页，不影响功能）

## 六、个人主体限制提醒

- ❌ 不能用 `<web-view>` 组件
- ❌ 不能开通微信支付
- ❌ 不能选"交通出行"等需资质类目（选"工具"）
- ❌ 不能开放"附近的小程序"
- ❌ 不能开通开放平台账号
- ✓ 核心搜索、分享、收藏均可用

## 七、当前代码结构

```
miniprogram/
├── app.js                    # 入口：onLaunch 数据自检
├── app.json                  # 配置：页面/权限/tabBar(首页+地铁图+我的)
├── app.wxss                  # 全局样式
├── sitemap.json              # 索引规则
├── project.config.json       # 工程配置（AppID 待填）
├── assets/
│   ├── dot.png               # 地图 marker 占位图
│   └── tab/                  # tabBar 图标（6 个 PNG）
├── pages/
│   ├── home/                 # 首页（路线卡/需求/憋多久/CTA）
│   ├── map/                  # 地铁图（<map> + polyline + markers）
│   ├── user/                 # 我的（数据概况/关于/使用提示）
│   └── test/                 # 验证页（5 个快捷用例）
├── components/               # 6 个自定义组件
│   ├── glass-card/
│   ├── line-badge/
│   ├── section-label/
│   ├── segmented/
│   ├── sheet-shell/
│   ├── result-sheet/
│   ├── station-picker/
│   └── toilet-detail/
└── utils/
    ├── data.js               # 数据层（19 线 / 410 站 / 490 厕所）
    ├── strategy.js           # 策略层（findRoute/recommend/...）
    ├── location.js           # 定位（wx.getLocation + Haversine 最近站）
    ├── metro-geo.js          # 预处理 GeoJSON（235KB，20 线 390 站）
    └── icon.js               # SVG 图标 -> data URI
```

## 八、验证基线

阶段 2 完成后，以下用例在 Node.js 中实测通过，可作为后续阶段的回归基线：

| 用例 | 期望输出 |
|---|---|
| `findRoute('人民广场','徐家汇')` | 6 站 / 12.5min / 0 换乘，路径含 5 站 |
| `findRoute('嘉定北','锦绣路')` | 29 站 / 80min / 2 换乘，经江苏路(11→2)、龙阳路(2→7) |
| `recommend({cur:'人民广场',dest:'徐家汇',gender:'m',hold:12})` | strat=near, 候选 3 个, 榜首=人民广场(2min) |
| `recommend({cur:'人民广场',dest:'陆家嘴',gender:'f',hold:4})` | strat=near（hold≤3 触发紧急），榜首=人民广场 |
| `recommend({cur:'虹桥火车站',dest:'陆家嘴',gender:'acc',hold:20})` | strat=near，榜首=虹桥火车站 |
| 数据统计 | 410 站 / 19 线 / 490 厕所（520 原始 → 去重 30） |

阶段 3+ 完成 UI/地图后，需在小程序模拟器中重新验证以上用例，确保 UI 渲染与逻辑输出均与基线一致。
