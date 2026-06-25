# 真实上海地铁 GeoJSON 地图集成设计

## 背景

当前地图页已经接入 MapLibre，但地铁线路由 `SEED_GEO`、Overpass 拉取到的站点坐标、以及 `LINES` 站序拼接而成。这个方式只能把站点直线相连，无法表达真实轨道曲线、环线、绕行和复杂换乘结构；当站点坐标缺失或偏移时，整张线路图会明显失真。

本设计采用本地真实 GeoJSON 作为地图地理层，继续使用现有 `data.jsx` / `STATIONS` 作为厕所业务层。

## 目标

- 用真实上海地铁线路 GeoJSON 绘制地图线路，替代站点直连线路。
- 用真实上海地铁站点 GeoJSON 绘制站点点位。
- 点击地图站点时，通过站名匹配复用现有厕所数据并显示 `StationCard`。
- 保持当前静态 HTML + React UMD + Babel Standalone 架构，不引入 npm 构建链。
- 优先验证 `沪屙屙.html` 主预览入口。

## 不在本轮范围内

- 不接入高德、百度、腾讯地图 API。
- 不处理 GCJ-02 / BD-09 坐标转换。
- 不做实时 Overpass 查询。
- 不做站内导航、出入口级路径、厕所到出口的步行路线。
- 不重构打包体系。
- 不强制同步所有历史 bundled artifacts。

## 数据来源与文件结构

新增目录和文件：

```text
geo/
  shanghai_subway_line.geojson
  shanghai_subway_station.geojson
```

数据来自 `huiyan-fe/mapv-three-showcases` 的上海地铁 GeoJSON：

- `src/pages/subway/data/shanghai_subway_line3.geojson`
- `src/pages/subway/data/shanghai_subway_station3.geojson`

下载后放入本地 `geo/` 目录，运行时从本地静态服务器读取，不依赖 GitHub raw URL。

## 架构

地图数据拆成两层：

1. **地理层**
   - 来源：`geo/*.geojson`。
   - 负责真实线路形状和站点坐标。
   - 用于 MapLibre source/layer。

2. **业务层**
   - 来源：现有 `data.jsx` 构建出的 `STATIONS`、`byId`、`LINES`。
   - 负责厕所数量、位置描述、付费区、无障碍、换乘属性、推荐逻辑。
   - 不参与线路几何构造。

`map.jsx` 会移除或废弃以下站点直连逻辑：

- `GEO_CACHE`
- `SEED_GEO`
- `seedGeo()`
- `fetchGeo()`
- `buildGeoJSON(geo)`

保留并改造：

- MapLibre 初始化。
- 道路/卫星底图切换。
- 地铁图层挂载逻辑。
- `StationCard`。
- loading/error/coverage UI。

## 数据加载流程

`MapScreen` 初始化 MapLibre 后，并行加载本地 GeoJSON：

```js
Promise.all([
  fetch('geo/shanghai_subway_line.geojson').then((r) => r.json()),
  fetch('geo/shanghai_subway_station.geojson').then((r) => r.json()),
])
```

加载成功后：

1. 校验两个对象都是 `FeatureCollection`。
2. 标准化线路 feature 属性。
3. 标准化站点 feature 属性并尝试匹配业务站点。
4. 添加/刷新 MapLibre 图层。
5. 更新 coverage 为站点业务匹配数。

加载失败时进入 error 状态，并在 UI 中提示通过本地服务器打开页面。

## GeoJSON 标准化

### 线路 feature

标准化后每个线路 feature 应尽量具有：

```js
properties: {
  name,
  lineKey,
  color,
}
```

颜色优先级：

1. GeoJSON 自带 `properties.color`。
2. 从 `name` / `ref` / `line` 中解析线路号后，用项目内 `LINE_COLORS[lineKey]`。
3. fallback 到 `#888`。

线路号解析覆盖：

- `上海地铁1号线`、`1号线`、`Line 1` -> `1`
- `上海轨道交通16号线` -> `16`
- `上海浦江线`、`浦江线` -> `pj`

### 站点 feature

标准化后每个站点 feature 应尽量具有：

```js
properties: {
  name,
  normalizedName,
  appStationId,
  matched,
  toiletCount,
  hasPlatform,
  hasPaid,
  isHub,
}
```

其中业务字段来自 `byId(appStationId)` 返回的 station 对象。

## 站名匹配策略

匹配分三层：

1. **直接匹配**

```js
byId(name)
```

2. **标准化匹配**

```js
function normalizeStationName(name) {
  return String(name || '')
    .replace(/\s+/g, '')
    .replace(/站$/, '')
    .trim();
}
```

启动时建立：

```js
const stationNameIndex = {};
STATIONS.forEach((s) => {
  stationNameIndex[normalizeStationName(s.name)] = s.id;
});
```

3. **手动别名表**

```js
const STATION_ALIASES = {
  '一大会址黄陂南路': '黄陂南路',
  '一大会址新天地': '一大会址·新天地',
  '上海火车站站': '上海火车站',
};
```

未匹配站点不阻塞地图渲染，只在控制台 `console.warn` 输出，后续按需补充别名。

## MapLibre 图层

使用五层结构：

```text
line-casing   线路白色描边
line-fill     线路彩色主体
stn-dot       普通站点圆点
stn-hub       换乘站外圈
stn-label     站名标签
```

线路层使用真实 GeoJSON 的 LineString/MultiLineString，颜色取 `properties.color`。

站点层使用真实 GeoJSON 的 Point，点击时读取 `properties.appStationId`。

站名标签 `minzoom: 13`，避免低缩放级别拥挤。

## 点击交互

点击站点后：

```text
feature.properties.appStationId
-> byId(appStationId)
-> 找到则显示 StationCard
-> 未找到则显示轻量未匹配提示或不展示厕所详情
```

第一版以“匹配到才展示完整厕所卡”为主，未匹配情况不影响地图浏览。

## 覆盖率提示

原来的 `{coverage} 站已定位` 改为业务匹配含义：

```text
{matchedCount}/{totalCount} 站已匹配
```

这能反映真实 GeoJSON 站点与现有厕所业务数据的融合程度。

## 错误处理

1. GeoJSON 加载失败：进入 error 状态，提示本地服务器运行方式，并输出控制台错误。
2. MapLibre 未加载：保留现有检查，进入 error 状态。
3. GeoJSON 格式异常：进入 error 状态。
4. 站点匹配不完整：地图继续运行，coverage 显示匹配比例，控制台输出 unmatched names。

## HTML 入口同步

本轮主要修改：

```text
map.jsx
app.jsx
沪屙屙.html
geo/*.geojson
```

`app.jsx` 的地图 tab 从 placeholder 改为 `<MapScreen />`。`沪屙屙.html` 内嵌版本同步对应 `map.jsx` 和 `app.jsx` 片段，使主预览入口能直接验证。

`沪屙屙-真机版.html` 暂不接入 MapLibre 和地图页，避免移动入口突然增加大地图依赖。`build.html` 和自解包 bundled artifacts 暂不作为本轮验证目标。

## 验证方式

运行：

```bash
python -m http.server 8000
```

打开：

```text
http://localhost:8000/沪屙屙.html
```

验证：

1. 页面正常加载。
2. 点击底部“地铁图”。
3. MapLibre 地图出现。
4. 上海地铁线路形状贴近真实地图，不再是站点直连错乱图。
5. 线路颜色正常。
6. 道路/卫星切换正常。
7. 站点圆点显示。
8. 放大后站名显示。
9. 点击人民广场、徐家汇、世纪大道、虹桥火车站等站点能弹出厕所卡。
10. coverage 显示匹配数量。
11. 控制台没有致命错误。
12. 未匹配站点只产生 warning，不影响地图使用。

## 成功标准

- 地图线路改为真实 GeoJSON 线形。
- 站点点位来自真实 GeoJSON。
- 现有厕所业务数据仍能通过站名匹配展示。
- 主预览入口 `沪屙屙.html` 可通过本地服务器运行并验证。
- 方案不引入新构建链或在线运行时数据依赖。
