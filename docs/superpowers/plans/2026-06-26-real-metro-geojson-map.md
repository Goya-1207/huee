# Real Metro GeoJSON Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current approximate Shanghai Metro map with locally bundled real line/station GeoJSON while preserving existing toilet data and station-detail interactions.

**Architecture:** Add local GeoJSON assets under `geo/`, refactor `map.jsx` to load and normalize those assets, then render them through the existing MapLibre layer pattern. Keep the existing `data.jsx` business model as the source of toilet details and connect map stations to business stations through direct, normalized, and alias-based name matching.

**Tech Stack:** Static HTML, React UMD, Babel Standalone JSX, MapLibre GL JS, local GeoJSON, browser `fetch`.

---

## File Structure

- Create: `geo/shanghai_subway_line.geojson`  
  Real Shanghai Metro line geometry copied from the MIT-licensed upstream GeoJSON.

- Create: `geo/shanghai_subway_station.geojson`  
  Real Shanghai Metro station point geometry copied from the MIT-licensed upstream GeoJSON.

- Modify: `map.jsx`  
  Replace station-coordinate seeding and Overpass station-node fetching with local GeoJSON loading, normalization, layer mounting, coverage reporting, and station click matching.

- Modify: `app.jsx`  
  Use `<MapScreen />` for the map tab when `MapScreen` is available, with a placeholder fallback for entry points that do not include `map.jsx`.

- Modify: `沪屙屙.html`  
  Sync the inline `map.jsx` and `app.jsx` script bodies so the main preview entry point immediately uses the new map implementation.

- Optional Modify: `CLAUDE.md`  
  Update map notes only if implementation changes make existing guidance inaccurate.

---

## Task 1: Add local GeoJSON assets

**Files:**
- Create: `geo/shanghai_subway_line.geojson`
- Create: `geo/shanghai_subway_station.geojson`

- [ ] **Step 1: Download upstream line GeoJSON**

Run:

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/huiyan-fe/mapv-three-showcases/739c1e92a5dc357b1741d369f110c7d051288133/src/pages/subway/data/shanghai_subway_line3.geojson" -OutFile "D:\Files\AI_Project\huee\geo\shanghai_subway_line.geojson"
```

Expected: command exits successfully and creates `geo/shanghai_subway_line.geojson`.

- [ ] **Step 2: Download upstream station GeoJSON**

Run:

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/huiyan-fe/mapv-three-showcases/739c1e92a5dc357b1741d369f110c7d051288133/src/pages/subway/data/shanghai_subway_station3.geojson" -OutFile "D:\Files\AI_Project\huee\geo\shanghai_subway_station.geojson"
```

Expected: command exits successfully and creates `geo/shanghai_subway_station.geojson`.

- [ ] **Step 3: Verify both files are present and non-empty**

Run:

```powershell
Get-Item "D:\Files\AI_Project\huee\geo\shanghai_subway_line.geojson", "D:\Files\AI_Project\huee\geo\shanghai_subway_station.geojson" | Select-Object Name,Length
```

Expected: both files are listed. `shanghai_subway_line.geojson` should be much larger than `shanghai_subway_station.geojson`; neither length should be `0`.

- [ ] **Step 4: Inspect top-level GeoJSON shape**

Run:

```powershell
$line = Get-Content "D:\Files\AI_Project\huee\geo\shanghai_subway_line.geojson" -Raw | ConvertFrom-Json
$station = Get-Content "D:\Files\AI_Project\huee\geo\shanghai_subway_station.geojson" -Raw | ConvertFrom-Json
"line type=$($line.type) features=$($line.features.Count)"
"station type=$($station.type) features=$($station.features.Count)"
```

Expected: both report `type=FeatureCollection` and non-zero feature counts.

- [ ] **Step 5: Commit asset addition if this repository is later initialized as git**

This directory is currently not a git repository. If it becomes one before implementation, run:

```bash
git add geo/shanghai_subway_line.geojson geo/shanghai_subway_station.geojson
git commit -m "feat: add Shanghai Metro GeoJSON assets"
```

Expected: commit succeeds. If still not a git repository, skip this step and note it in the implementation summary.

---

## Task 2: Replace `map.jsx` data loading and normalization

**Files:**
- Modify: `map.jsx`

- [ ] **Step 1: Remove approximate coordinate data and Overpass fetch helpers**

In `map.jsx`, delete these definitions completely:

```js
const GEO_CACHE   = 'sh_metro_geo_v4';
```

```js
const SEED_GEO = {
  // entire object
};
```

```js
function seedGeo() {
  let geo = { ...SEED_GEO };
  const cached = localStorage.getItem(GEO_CACHE);
  if (cached) { try { geo = { ...geo, ...JSON.parse(cached) }; } catch(e){} }
  return geo;
}
async function fetchGeo() {
  const q = `[out:json][timeout:40];node["railway"="station"](30.4,120.7,31.9,122.3);out;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', body: 'data=' + encodeURIComponent(q),
    signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined,
  });
  const { elements } = await res.json();
  const geo = {};
  for (const el of (elements || [])) {
    const name = el.tags?.name;
    if (name && el.lat && el.lon && !geo[name]) geo[name] = [el.lon, el.lat];
  }
  localStorage.setItem(GEO_CACHE, JSON.stringify(geo));
  return geo;
}
```

```js
function buildGeoJSON(geo) {
  // entire function
}
```

Expected: no references to `GEO_CACHE`, `SEED_GEO`, `seedGeo`, `fetchGeo`, or `buildGeoJSON` remain in `map.jsx`.

- [ ] **Step 2: Add local GeoJSON constants below `SH_CENTER`**

Add this block near the top of `map.jsx`, directly below `const SH_CENTER = ...`:

```js
const METRO_LINE_GEOJSON_URL = 'geo/shanghai_subway_line.geojson';
const METRO_STATION_GEOJSON_URL = 'geo/shanghai_subway_station.geojson';
```

Expected: URLs are relative to the HTML page and work from `python -m http.server 8000`.

- [ ] **Step 3: Add station alias and name normalization helpers**

Add this block above `mountLayers`:

```js
const STATION_ALIASES = {
  '一大会址黄陂南路': '黄陂南路',
  '一大会址新天地': '一大会址·新天地',
  '上海火车站站': '上海火车站',
  '上海南站站': '上海南站',
  '虹桥火车站站': '虹桥火车站',
  '虹桥2号航站楼站': '虹桥2号航站楼',
  '浦东国际机场站': '浦东国际机场',
};

function normalizeStationName(name) {
  return String(name || '')
    .replace(/\s+/g, '')
    .replace(/[·・]/g, '')
    .replace(/站$/, '')
    .trim();
}

function stationDisplayName(props) {
  return props.name || props.NAME || props.Name || props.station || props.title || '';
}

function buildStationNameIndex() {
  const idx = {};
  for (const st of STATIONS || []) {
    idx[normalizeStationName(st.name)] = st.id;
  }
  return idx;
}

function matchAppStationId(rawName, idx) {
  if (!rawName) return null;
  const direct = byId(rawName);
  if (direct) return direct.id;
  const normalized = normalizeStationName(rawName);
  if (idx[normalized]) return idx[normalized];
  const alias = STATION_ALIASES[normalized];
  if (alias && byId(alias)) return alias;
  return null;
}
```

Expected: helpers are pure and depend only on existing `STATIONS` and `byId` globals.

- [ ] **Step 4: Add line parsing and GeoJSON validation helpers**

Add this block below the station helpers:

```js
function lineKeyFromProps(props) {
  const raw = [props.lineKey, props.ref, props.line, props.name, props.NAME, props.Name]
    .filter(Boolean)
    .join(' ');
  if (/浦江/.test(raw) || /pujiang/i.test(raw)) return 'pj';
  const m = raw.match(/(?:地铁|交通|Line\s*)?(\d{1,2})\s*(?:号线|号|线)?/i);
  return m ? Number(m[1]) : null;
}

function normalizeLineFeature(feature) {
  const props = { ...(feature.properties || {}) };
  const lineKey = lineKeyFromProps(props);
  const color = props.color || props.colour || props.COLOR || LINE_COLORS[lineKey] || '#888';
  return {
    ...feature,
    properties: {
      ...props,
      name: props.name || props.NAME || props.Name || (lineKey ? lineName(lineKey) : '地铁线路'),
      lineKey: lineKey == null ? '' : String(lineKey),
      color,
    },
  };
}

function assertFeatureCollection(data, label) {
  if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error(`${label} GeoJSON 格式异常`);
  }
  return data;
}
```

Expected: line features always get a `properties.color` string.

- [ ] **Step 5: Add station feature normalization**

Add this block below `assertFeatureCollection`:

```js
function normalizeStationFeature(feature, idx) {
  const props = { ...(feature.properties || {}) };
  const name = stationDisplayName(props);
  const appStationId = matchAppStationId(name, idx);
  const st = appStationId ? byId(appStationId) : null;
  const toilets = st?.toilets || [];
  return {
    ...feature,
    properties: {
      ...props,
      name: name || appStationId || '未命名站点',
      normalizedName: normalizeStationName(name),
      appStationId: appStationId || '',
      matched: st ? 1 : 0,
      toiletCount: toilets.length,
      hasPlatform: toilets.some((t) => t.place === 'platform') ? 1 : 0,
      hasPaid: toilets.some((t) => t.area === '付费区') ? 1 : 0,
      isHub: st?.hub ? 1 : 0,
    },
  };
}

function prepareMetroGeoJSON(lineRaw, stationRaw) {
  const stationIdx = buildStationNameIndex();
  const lines = assertFeatureCollection(lineRaw, '线路');
  const stations = assertFeatureCollection(stationRaw, '站点');
  const normalizedLines = {
    ...lines,
    features: lines.features.map(normalizeLineFeature),
  };
  const normalizedStations = {
    ...stations,
    features: stations.features.map((f) => normalizeStationFeature(f, stationIdx)),
  };
  const unmatched = normalizedStations.features
    .filter((f) => !f.properties.matched)
    .map((f) => f.properties.name)
    .filter(Boolean);
  if (unmatched.length) console.warn('[map] 未匹配站点', unmatched);
  const matchedCount = normalizedStations.features.length - unmatched.length;
  return { lines: normalizedLines, stations: normalizedStations, matchedCount, totalCount: normalizedStations.features.length };
}
```

Expected: `prepareMetroGeoJSON` returns the exact shape consumed by `mountLayers` and coverage UI.

---

## Task 3: Update MapLibre layer mounting in `map.jsx`

**Files:**
- Modify: `map.jsx`

- [ ] **Step 1: Replace `mountLayers` with real GeoJSON source mounting**

Replace the existing `mountLayers(map, gjson)` function with:

```js
function mountLayers(map, gjson) {
  ['stn-label','stn-hub','stn-dot','line-fill','line-casing'].forEach(id => {
    try { if (map.getLayer(id)) map.removeLayer(id); } catch(e){}
  });
  ['metro-lines','metro-stn'].forEach(id => {
    try { if (map.getSource(id)) map.removeSource(id); } catch(e){}
  });

  map.addSource('metro-lines', { type: 'geojson', data: gjson.lines });
  map.addSource('metro-stn',   { type: 'geojson', data: gjson.stations });

  map.addLayer({ id: 'line-casing', type: 'line', source: 'metro-lines',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#fff',
      'line-width': ['interpolate',['linear'],['zoom'], 8,4, 14,14],
      'line-opacity': 0.9 }
  });

  map.addLayer({ id: 'line-fill', type: 'line', source: 'metro-lines',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': ['coalesce', ['get','color'], '#888'],
      'line-width': ['interpolate',['linear'],['zoom'], 8,2.5, 14,9],
      'line-opacity': 0.95 }
  });

  map.addLayer({ id: 'stn-dot', type: 'circle', source: 'metro-stn',
    paint: {
      'circle-radius':       ['interpolate',['linear'],['zoom'], 8,2, 11,4.5, 15,9],
      'circle-color':        ['case', ['==',['get','matched'],1], 'var(--brand)', '#8a8a8a'],
      'circle-opacity':      ['case', ['==',['get','matched'],1], 0.96, 0.58],
      'circle-stroke-width': ['interpolate',['linear'],['zoom'], 8,1, 12,2.5],
      'circle-stroke-color': '#fff',
    }
  });

  map.addLayer({ id: 'stn-hub', type: 'circle', source: 'metro-stn',
    filter: ['==',['get','isHub'],1],
    paint: {
      'circle-radius':       ['interpolate',['linear'],['zoom'], 8,4, 11,8, 15,14],
      'circle-color':        'rgba(0,0,0,0)',
      'circle-stroke-width': 2.5,
      'circle-stroke-color': '#fff',
    }
  });

  try {
    map.addLayer({ id: 'stn-label', type: 'symbol', source: 'metro-stn', minzoom: 13,
      layout: {
        'text-field': ['get','name'],
        'text-size': ['interpolate',['linear'],['zoom'], 13,9, 16,13],
        'text-offset': [0,1.1], 'text-anchor': 'top',
        'text-allow-overlap': false,
      },
      paint: { 'text-color': '#111', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 2 }
    });
  } catch(e) {}
}
```

Expected: sources are loaded from already-normalized real line/station GeoJSON.

- [ ] **Step 2: Verify no old GeoJSON builder assumptions remain**

Search `map.jsx` for these strings:

```text
buildGeoJSON
seedGeo
fetchGeo
SEED_GEO
GEO_CACHE
Overpass
```

Expected: no matches for old helper names. The string `Overpass` may remain only in comments if intentionally documenting removal; prefer no matches.

---

## Task 4: Update `MapScreen` lifecycle in `map.jsx`

**Files:**
- Modify: `map.jsx`

- [ ] **Step 1: Replace the initial data preparation block in `React.useEffect`**

Inside `MapScreen`, replace the current `React.useEffect` body with this version:

```js
React.useEffect(() => {
  let dead = false;
  try {
    if (typeof maplibregl === 'undefined') throw new Error('MapLibre 库未加载');

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: ROAD_STYLE,
      center: SH_CENTER, zoom: 10.5,
      pitch: 50, bearing: -17,
      attributionControl: false,
      preserveDrawingBuffer: true,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-left');

    let mounted = false;
    const attachHandlers = () => {
      const click = (e) => {
        const p = e.features?.[0]?.properties;
        if (!p) return;
        const st = p.appStationId ? byId(p.appStationId) : null;
        setSelected(st || { name: p.name, toilets: [], lines: [], hub: false, unmatched: true });
      };
      map.on('click', 'stn-dot', click);
      map.on('click', 'stn-hub', click);
      ['stn-dot','stn-hub'].forEach(id => {
        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
      });
    };

    const tryMount = (force) => {
      if (dead || mounted || !gjsonRef.current) return;
      if (!force && !(map.isStyleLoaded && map.isStyleLoaded())) return;
      mounted = true;
      try { mountLayers(map, gjsonRef.current); attachHandlers(); } catch(e){ console.warn('[map] mount', e.message); }
      setPhase('ready');
    };

    Promise.all([
      fetch(METRO_LINE_GEOJSON_URL).then((r) => {
        if (!r.ok) throw new Error(`线路数据加载失败：${r.status}`);
        return r.json();
      }),
      fetch(METRO_STATION_GEOJSON_URL).then((r) => {
        if (!r.ok) throw new Error(`站点数据加载失败：${r.status}`);
        return r.json();
      }),
    ]).then(([lineRaw, stationRaw]) => {
      if (dead) return;
      const prepared = prepareMetroGeoJSON(lineRaw, stationRaw);
      gjsonRef.current = { lines: prepared.lines, stations: prepared.stations };
      setCoverage({ matched: prepared.matchedCount, total: prepared.totalCount });
      tryMount(false);
    }).catch((e) => {
      console.warn('[map] GeoJSON 加载失败', e.message);
      if (!dead) { setPhase('error'); setErrMsg(e.message); }
    });

    map.on('load', () => tryMount(false));
    map.on('styledata', () => tryMount(false));
    map.on('idle', () => tryMount(false));
    setTimeout(() => tryMount(true), 2500);
    map.on('error', e => console.warn('[map]', e.error?.message));
  } catch(e) {
    setPhase('error'); setErrMsg(e.message);
  }
  return () => {
    dead = true;
    mapRef.current?.remove();
    mapRef.current = null;
  };
}, []);
```

Expected: `MapScreen` fetches local GeoJSON once, mounts layers when both map style and data are ready, and no longer calls Overpass.

- [ ] **Step 2: Change coverage state initialization**

Replace:

```js
const [coverage,   setCoverage]  = React.useState(0); // matched station count
```

with:

```js
const [coverage,   setCoverage]  = React.useState({ matched: 0, total: 0 });
```

Expected: coverage state matches the object set in the new useEffect.

- [ ] **Step 3: Update the style switch callback to remount real data**

Keep the existing `switchStyle` structure, but ensure it uses `gjsonRef.current` and `mountLayers` exactly like this:

```js
const switchStyle = React.useCallback((mode) => {
  setStyleMode(mode);
  const map = mapRef.current;
  if (!map) return;
  map.setStyle(mode === 'satellite' ? satStyle() : ROAD_STYLE);
  map.once('style.load', () => {
    if (gjsonRef.current) mountLayers(map, gjsonRef.current);
  });
}, []);
```

Expected: switching between map and satellite restores the metro layers.

- [ ] **Step 4: Update coverage badge rendering**

Replace the existing coverage badge block with:

```jsx
{phase === 'ready' && coverage.total > 0 && (
  <div className="map-coverage-badge glass">
    {coverage.matched}/{coverage.total} 站已匹配
  </div>
)}
```

Expected: the badge reports matched business station count instead of coordinate count.

- [ ] **Step 5: Update error helper copy**

In the error overlay, keep `{errMsg}` and replace the helper text with:

```jsx
<div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 4 }}>请通过本地服务器打开页面后重试</div>
```

Expected: users get the correct hint for local GeoJSON fetch failures.

---

## Task 5: Make `app.jsx` use `MapScreen` when available

**Files:**
- Modify: `app.jsx`

- [ ] **Step 1: Replace map tab placeholder with guarded `MapScreen` rendering**

In `app.jsx`, replace:

```jsx
{tab === 'map' && <Placeholder icon={Ic.map} title="上海地铁全图"
  sub="放大查看每一站的厕所位置。地图功能正在绘制中。" />}
```

with:

```jsx
{tab === 'map' && (
  window.MapScreen
    ? <MapScreen />
    : <Placeholder icon={Ic.map} title="上海地铁全图"
        sub="当前入口未加载地图模块，请打开主预览页查看真实地铁图。" />
)}
```

Expected: entry points that include `map.jsx` show the map; entry points that do not include it still render safely.

- [ ] **Step 2: Confirm `Root` behavior is unchanged**

Leave this block unchanged:

```jsx
function Root() {
  if (window.__NATIVE__) {
    return <div className="native-shell"><App /></div>;
  }
  return (
    <div className="stage">
      <IOSDevice>
        <App />
      </IOSDevice>
    </div>
  );
}
```

Expected: desktop/framed and native-shell behavior remains the same.

---

## Task 6: Sync `沪屙屙.html` with updated source files

**Files:**
- Modify: `沪屙屙.html`

- [ ] **Step 1: Replace inline `map.jsx` script content**

In `沪屙屙.html`, locate:

```html
<script type="text/babel" data-src="map.jsx">
```

Replace everything inside that script tag with the complete updated contents of `map.jsx`.

Expected: the inline script starts with:

```js
// ─── 上海地铁 3D 地图 ───
```

and includes `METRO_LINE_GEOJSON_URL`, `prepareMetroGeoJSON`, and the new `MapScreen` lifecycle.

- [ ] **Step 2: Replace inline `app.jsx` script content**

In `沪屙屙.html`, locate:

```html
<script type="text/babel" data-src="app.jsx">
```

Replace everything inside that script tag with the complete updated contents of `app.jsx`.

Expected: the inline app script renders `window.MapScreen ? <MapScreen /> : <Placeholder ... />` for the map tab.

- [ ] **Step 3: Confirm MapLibre includes remain present**

Verify the `<head>` still includes:

```html
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
```

Expected: both includes remain in `沪屙屙.html`.

- [ ] **Step 4: Do not sync unrelated bundled artifacts**

Leave these files unchanged in this task:

```text
build.html
沪屙屙-真机版.html
沪屙屙 (iPhone版).html
沪屙屙 (离线版).html
```

Expected: implementation summary states those are out of scope for this map pass.

---

## Task 7: Browser verification

**Files:**
- Verify only; no code changes unless a previous task failed verification.

- [ ] **Step 1: Start a local static server**

Run from `D:\Files\AI_Project\huee`:

```powershell
python -m http.server 8000
```

Expected: server starts and prints a serving message. Keep it running during manual verification.

- [ ] **Step 2: Open the main preview page**

Open:

```text
http://localhost:8000/沪屙屙.html
```

Expected: the home screen loads without a fatal console error.

- [ ] **Step 3: Open the map tab**

Click bottom tab:

```text
地铁图
```

Expected: MapLibre map appears and the loading overlay disappears.

- [ ] **Step 4: Verify real line geometry**

Observe the map at city zoom.

Expected: Shanghai Metro lines follow real map geography instead of straight-line station-to-station segments. Lines should not form the previous visibly incorrect synthetic shape.

- [ ] **Step 5: Verify station layer and labels**

Zoom in to around 13+.

Expected: station dots are visible and station names appear. Hub stations have an outer ring when matched as transfer stations in the business data.

- [ ] **Step 6: Verify station click business-data matching**

Click these stations if visible:

```text
人民广场
徐家汇
世纪大道
虹桥火车站
```

Expected: a bottom station card appears and shows existing toilet rows when the station has toilet data.

- [ ] **Step 7: Verify style switching**

Click the map mode buttons:

```text
地图
卫星
```

Expected: base map style changes and metro line/station layers reappear after each switch.

- [ ] **Step 8: Verify coverage badge**

Look for the coverage badge.

Expected: text format is:

```text
<number>/<number> 站已匹配
```

The first number is less than or equal to the second.

- [ ] **Step 9: Check console warnings and errors**

Open browser DevTools console.

Expected: no fatal errors. A warning like `[map] 未匹配站点 [...]` is acceptable and should not block map use.

- [ ] **Step 10: Stop local server**

Stop the `python -m http.server` process with `Ctrl+C`.

Expected: server stops cleanly.

---

## Task 8: Final documentation and cleanup

**Files:**
- Modify: `CLAUDE.md` only if needed
- Verify: `docs/superpowers/specs/2026-06-26-real-metro-geojson-map-design.md`
- Verify: `docs/superpowers/plans/2026-06-26-real-metro-geojson-map.md`

- [ ] **Step 1: Check whether `CLAUDE.md` map guidance needs updating**

Read the `Map screen` section in `CLAUDE.md`.

If it still says `map.jsx` seeds key station coordinates, caches Overpass results, or builds overlays from `LINES`, replace that paragraph with:

```markdown
`map.jsx` uses MapLibre GL with OpenFreeMap road tiles and Esri satellite raster tiles. The map-enabled `沪屙屙.html` loads local GeoJSON assets from `geo/shanghai_subway_line.geojson` and `geo/shanghai_subway_station.geojson` for real line/station geometry, then matches station names back to `STATIONS`/`byId` for toilet details. The source `app.jsx` renders `<MapScreen />` when `window.MapScreen` is loaded, otherwise falls back to a placeholder for entry points that do not include the map module.
```

Expected: future agents do not rely on removed Overpass/seed behavior.

- [ ] **Step 2: Run a final search for removed map helpers**

Run:

```powershell
Select-String -Path "D:\Files\AI_Project\huee\map.jsx", "D:\Files\AI_Project\huee\沪屙屙.html", "D:\Files\AI_Project\huee\CLAUDE.md" -Pattern "SEED_GEO|GEO_CACHE|fetchGeo|seedGeo|buildGeoJSON|Overpass"
```

Expected: no matches in `map.jsx` or `沪屙屙.html`. `CLAUDE.md` should not describe the old behavior.

- [ ] **Step 3: Summarize verification results**

In the final implementation response, include:

```text
Implemented:
- Added local GeoJSON assets.
- Refactored map.jsx to render real lines/stations.
- Matched GeoJSON stations to existing toilet data.
- Synced main preview HTML.

Verified:
- Local server started.
- Main preview loaded.
- Map tab rendered real geometry.
- Station click showed toilet card.
- Style switching preserved layers.

Not changed:
- 真机版 and bundled offline artifacts.
```

Expected: user gets an accurate summary of completed and intentionally skipped work.

---

## Self-Review

- Spec coverage: The plan covers local GeoJSON assets, `map.jsx` loading and normalization, station name matching, MapLibre layers, click behavior, coverage badge, error handling, `app.jsx` fallback, `沪屙屙.html` sync, and browser verification.
- Placeholder scan: No `TBD`, incomplete tasks, or vague implementation-only instructions remain. The only placeholder-like word appears in the existing UI concept of fallback placeholder and is concrete.
- Type consistency: `prepareMetroGeoJSON` returns `{ lines, stations, matchedCount, totalCount }`; `gjsonRef.current` stores `{ lines, stations }`; coverage state stores `{ matched, total }`; layer property names match normalized feature properties.
