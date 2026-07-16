// scripts/build-metro-geo.js
// 从 geo/*.geojson 生成 miniprogram/utils/metro-geo.js + miniprogram/assets/dot.png
// 供小程序 <map> 组件使用。坐标系 GCJ-02（与腾讯底图一致，无需纠偏）。
// 用法：node scripts/build-metro-geo.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const data = require(path.join(ROOT, 'miniprogram/utils/data.js'));
const LINES = data.LINES, STATIONS = data.STATIONS, byId = data.byId, LINE_COLORS = data.LINE_COLORS, lineName = data.lineName;

// ── PNG 生成（1x1 透明，作 marker 不可见图标，用 callout 作可见圆点）──
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function pngChunk(type, payload) {
  const len = Buffer.alloc(4); len.writeUInt32BE(payload.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), payload]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function makeTransparentPng() {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const idat = zlib.deflateSync(Buffer.from([0, 0, 0, 0, 0])); // filter byte + 1 transparent pixel
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

// ── 站名规范化/匹配（移植自 map.jsx）──
const STATION_ALIASES = { '一大会址黄陂南路': '一大会址·黄陂南路', '一大会址新天地': '一大会址·新天地' };
function normalizeStationName(name) {
  return String(name || '').replace(/\s+/g, '').replace(/[·・]/g, '').replace(/站$/, '').trim();
}
function stationDisplayName(props) {
  return props.name || props.NAME || props.Name || props.station || props.title || '';
}
function buildStationNameIndex() {
  const idx = {};
  for (const st of STATIONS || []) idx[normalizeStationName(st.name)] = st.id;
  return idx;
}
function matchAppStationId(rawName, idx) {
  if (!rawName) return null;
  const direct = byId(rawName);
  if (direct) return direct.id;
  const n = normalizeStationName(rawName);
  if (idx[n]) return idx[n];
  const alias = STATION_ALIASES[n];
  if (alias && byId(alias)) return alias;
  return null;
}
function lineKeyFromProps(props) {
  const raw = [props.lineKey, props.ref, props.line, props.name, props.NAME, props.Name].filter(Boolean).join(' ');
  if (/浦江/.test(raw) || /pujiang/i.test(raw)) return 'pj';
  if (/3\s*\/\s*4\s*号?线/.test(raw)) return '3-4';
  const m = raw.match(/(?:地铁|交通|Line\s*)?(\d{1,2})\s*(?:号线|号|线)?/i);
  return m ? Number(m[1]) : null;
}
function shouldSkipLineFeature(feature) {
  const props = feature.properties || {};
  const raw = [props.name, props.NAME, props.Name, props.ref, props.line].filter(Boolean).join(' ');
  return /联络线|停车场|折返线|装卸线|车库|旧路线/.test(raw);
}
function normalizedLineDedupeKey(feature, lineKey) {
  const rawName = String(stationDisplayName(feature.properties || {}) || '').replace(/轨道交通/g, '地铁');
  if (lineKey != null && lineKey !== '') return String(lineKey);
  return rawName || JSON.stringify((feature.geometry && feature.geometry.coordinates && feature.geometry.coordinates[0] && feature.geometry.coordinates[0][0]) || []);
}
function countLineCoords(geom) {
  if (!geom) return 0;
  if (geom.type === 'LineString') return (geom.coordinates || []).length;
  if (geom.type === 'MultiLineString') return (geom.coordinates || []).reduce((a, c) => a + (c ? c.length : 0), 0);
  return 0;
}
function normalizeLineFeature(feature) {
  const props = Object.assign({}, feature.properties || {});
  const lineKey = lineKeyFromProps(props);
  const parsedName = lineKey === '3-4' ? '3/4号线' : (lineKey ? lineName(lineKey) : '地铁线路');
  const parsedColor = lineKey === '3-4' ? (LINE_COLORS[4] || LINE_COLORS[3]) : LINE_COLORS[lineKey];
  const color = parsedColor || props.color || props.colour || props.COLOR || '#888';
  return Object.assign({}, feature, {
    properties: Object.assign({}, props, {
      name: props.name || props.NAME || props.Name || parsedName,
      lineKey: lineKey == null ? '' : String(lineKey),
      color: color,
    }),
  });
}

// 浦江线补充（源坐标 GCJ-02，不转）
const SUPPLEMENTAL_LINE_COORDS = {
  pj: [
    [121.512272, 31.061427], [121.526326, 31.047956], [121.530095, 31.033574],
    [121.530591, 31.016869], [121.530818, 31.002519], [121.521124, 30.991211],
  ],
};

// 坐标源未收录的站点：从 OpenStreetMap 站点要素核对后补充。
// OSM 坐标为 WGS-84，写入小程序前统一转换到腾讯地图的 GCJ-02。
// 徐泾东、浦东国际机场以公开站点坐标交叉核验；其余为 OSM 的 station/stop 要素中心。
const SUPPLEMENTAL_STATION_WGS84 = {
  '黄陂南路': [121.4679564, 31.2256562], '徐泾东': [121.2905, 31.1877],
  '浦东国际机场': [121.8010, 31.1539], '罗南新村': [121.3527972, 31.3905792],
  '美兰湖': [121.3452915, 31.4036756], '金吉路': [121.6247128, 31.2666619],
  '光明路': [121.1125552, 31.2980927], '花桥': [121.0998583, 31.3012385],
  '滴水湖': [121.9257641, 30.9093062], '临港大道': [121.9065641, 30.9259540],
  '书院': [121.8463550, 30.9615776], '惠南东': [121.7895151, 31.0286244],
  '惠南': [121.7573174, 31.0560030], '下沙': [121.5848189, 31.0567896],
  '航头': [121.5920502, 31.0393345], '三鲁公路': [121.5230413, 31.0582930],
  '闵瑞路': [121.5260673, 31.0502003], '浦航路': [121.5263231, 31.0431896],
  '东城一路': [121.5278033, 31.0326638], '汇臻路': [121.5203001, 31.0274603],
};
function outOfChina(lng, lat) { return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271; }
function wgs84ToGcj02(lng, lat) {
  if (outOfChina(lng, lat)) return [lng, lat];
  const a = 6378245.0, ee = 0.00669342162296594323;
  const transformLat = (x, y) => -100 + 2*x + 3*y + .2*y*y + .1*x*y + .2*Math.sqrt(Math.abs(x)) + (20*Math.sin(6*x*Math.PI) + 20*Math.sin(2*x*Math.PI))*2/3 + (20*Math.sin(y*Math.PI) + 40*Math.sin(y/3*Math.PI))*2/3 + (160*Math.sin(y/12*Math.PI) + 320*Math.sin(y*Math.PI/30))*2/3;
  const transformLng = (x, y) => 300 + x + 2*y + .1*x*x + .1*x*y + .1*Math.sqrt(Math.abs(x)) + (20*Math.sin(6*x*Math.PI) + 20*Math.sin(2*x*Math.PI))*2/3 + (20*Math.sin(x*Math.PI) + 40*Math.sin(x/3*Math.PI))*2/3 + (150*Math.sin(x/12*Math.PI) + 300*Math.sin(x/30*Math.PI))*2/3;
  let dLat = transformLat(lng - 105, lat - 35), dLng = transformLng(lng - 105, lat - 35);
  const radLat = lat / 180 * Math.PI, magic = 1 - ee * Math.sin(radLat) ** 2, sqrtMagic = Math.sqrt(magic);
  dLat = dLat * 180 / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
  dLng = dLng * 180 / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
  return [lng + dLng, lat + dLat];
}
function stationCoordIndex(stationFeatures) {
  const idx = {};
  for (const f of stationFeatures) {
    const c = f.geometry && f.geometry.coordinates;
    if (!c || c.length < 2) continue;
    const props = f.properties || {};
    const keys = [props.name, props.appStationId, props.normalizedName].filter(Boolean).map(normalizeStationName);
    for (const k of keys) if (!idx[k]) idx[k] = c;
  }
  return idx;
}
function addSupplementalLineFeatures(lineFeatures, stationFeatures) {
  const coordIdx = stationCoordIndex(stationFeatures);
  const addLine = (lineKey, names) => {
    if (lineFeatures.some((f) => String((f.properties || {}).lineKey) === String(lineKey))) return;
    const coords = names.map((n) => coordIdx[normalizeStationName(n)]).filter(Boolean);
    const fallback = SUPPLEMENTAL_LINE_COORDS[lineKey] || [];
    const finalCoords = coords.length >= 2 ? coords : fallback;
    if (finalCoords.length < 2) return;
    lineFeatures.push({
      type: 'Feature',
      properties: { name: lineName(lineKey), lineKey: String(lineKey), color: LINE_COLORS[lineKey] || '#888' },
      geometry: { type: 'LineString', coordinates: finalCoords },
    });
  };
  addLine('pj', LINES.pj || []);
}

// ── Douglas-Peucker 抽稀（经纬度坐标）──
function sqSegDist(p, a, b) {
  let x = a[0], y = a[1], bx = b[0], by = b[1], dx = bx - x, dy = by - y;
  if (dx !== 0 || dy !== 0) {
    let t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) { x = bx; y = by; } else if (t > 0) { x += dx * t; y += dy * t; }
  }
  const ddx = p[0] - x, ddy = p[1] - y;
  return ddx * ddx + ddy * ddy;
}
function simplify(coords, tol) {
  if (coords.length <= 2) return coords;
  const sqTol = tol * tol;
  const keep = new Array(coords.length).fill(false);
  keep[0] = keep[coords.length - 1] = true;
  const stack = [[0, coords.length - 1]];
  while (stack.length) {
    const first = stack[stack.length - 1][0], last = stack[stack.length - 1][1];
    stack.pop();
    let maxSq = 0, idx = -1;
    for (let i = first + 1; i < last; i++) {
      const d = sqSegDist(coords[i], coords[first], coords[last]);
      if (d > maxSq) { maxSq = d; idx = i; }
    }
    if (maxSq > sqTol && idx >= 0) { keep[idx] = true; stack.push([first, idx], [idx, last]); }
  }
  const out = [];
  for (let i = 0; i < coords.length; i++) if (keep[i]) out.push(coords[i]);
  return out;
}

// ── 主流程 ──
const lineRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'geo/shanghai_subway_line.geojson'), 'utf8'));
const stationRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'geo/shanghai_subway_station.geojson'), 'utf8'));
const stationIdx = buildStationNameIndex();

// 线路去重（同 lineKey 保留坐标点最多的）
const lineBest = new Map();
const lineOrder = [];
for (const feature of lineRaw.features) {
  if (shouldSkipLineFeature(feature)) continue;
  const normalized = normalizeLineFeature(feature);
  const key = normalizedLineDedupeKey(normalized, normalized.properties.lineKey);
  const pts = countLineCoords(normalized.geometry);
  const prev = lineBest.get(key);
  if (!prev) { lineBest.set(key, { feature: normalized, pts: pts }); lineOrder.push(key); }
  else if (pts > prev.pts) lineBest.set(key, { feature: normalized, pts: pts });
}
const lineFeatures = lineOrder.map((k) => lineBest.get(k).feature);

// 站点归一化 + 匹配 app STATIONS
const stationFeatures = stationRaw.features.map((f) => {
  const props = Object.assign({}, f.properties || {});
  const name = stationDisplayName(props);
  const appStationId = matchAppStationId(name, stationIdx);
  const st = appStationId ? byId(appStationId) : null;
  return {
    type: 'Feature',
    properties: Object.assign({}, props, {
      name: name || appStationId || '未命名站点',
      normalizedName: normalizeStationName(name),
      appStationId: appStationId || '',
      matched: st ? 1 : 0,
      isHub: st && st.hub ? 1 : 0,
    }),
    geometry: f.geometry,
  };
});
addSupplementalLineFeatures(lineFeatures, stationFeatures);

// 转 polylines（每条线合并 MultiLineString 各段 + 抽稀到 ~20m）
const polylines = [];
lineFeatures.forEach((f, idx) => {
  const lk = f.properties.lineKey;
  const color = f.properties.color || LINE_COLORS[lk] || '#888';
  const geom = f.geometry;
  let allCoords = [];
  if (geom.type === 'LineString') allCoords = geom.coordinates.slice();
  else if (geom.type === 'MultiLineString') for (const seg of geom.coordinates) allCoords = allCoords.concat(seg);
  const simplified = simplify(allCoords, 0.0002);
  const points = simplified.map((c) => ({ longitude: c[0], latitude: c[1] }));
  if (points.length >= 2) polylines.push({ id: idx, lineKey: lk, color: color, width: 5, points: points });
});

// 转 markers（只保留匹配到 app 数据的站，跳过未命名/未匹配）
const markers = [];
let unmatched = 0;
stationFeatures.forEach((f, idx) => {
  const c = f.geometry && f.geometry.coordinates;
  if (!c || c.length < 2) return;
  const props = f.properties;
  if (!props.appStationId) { unmatched++; return; }
  const st = byId(props.appStationId);
  markers.push({
    id: idx,
    stationId: props.appStationId,
    name: props.name,
    latitude: c[1],
    longitude: c[0],
    hub: !!props.isHub,
    toiletCount: st ? st.toilets.length : 0,
  });
});
// 原始 GeoJSON 无站点要素时，补入经过人工核对的站点中心坐标。
const existingStationIds = new Set(markers.map((m) => m.stationId));
for (const [stationId, coord] of Object.entries(SUPPLEMENTAL_STATION_WGS84)) {
  if (existingStationIds.has(stationId)) continue;
  const st = byId(stationId);
  if (!st) continue;
  const [longitude, latitude] = wgs84ToGcj02(coord[0], coord[1]);
  markers.push({ id: stationFeatures.length + markers.length, stationId, name: st.name, latitude, longitude, hub: !!st.hub, toiletCount: st.toilets.length });
}

console.log('polylines:', polylines.length, '| markers:', markers.length, '| 跳过未匹配:', unmatched);
const totalPoints = polylines.reduce((a, p) => a + p.points.length, 0);
console.log('polyline 总点数:', totalPoints, '| 平均每线:', Math.round(totalPoints / polylines.length));
const mappedStationIds = new Set(markers.map((m) => m.stationId));
const unmappedStationIds = STATIONS.filter((st) => !mappedStationIds.has(st.id)).map((st) => st.id);
if (unmappedStationIds.length) {
  console.warn('未找到坐标的业务站点:', unmappedStationIds.length, unmappedStationIds.join('、'));
}

// 写 metro-geo.js
const out = '// 自动生成，勿手改。由 scripts/build-metro-geo.js 从 geo/*.geojson 生成。\n' +
  '// 坐标系：GCJ-02（与小程序 <map> 腾讯底图一致，无需纠偏）\n' +
  'module.exports = ' + JSON.stringify({
    center: { longitude: 121.474, latitude: 31.231 },
    polylines: polylines,
    markers: markers,
    // 坐标源未覆盖的站点不能伪造坐标；保留清单供 UI 和发布前校验使用。
    unmappedStationIds: unmappedStationIds,
  }) + ';\n';
const outPath = path.join(ROOT, 'miniprogram/utils/metro-geo.js');
fs.writeFileSync(outPath, out);
console.log('metro-geo.js:', (fs.statSync(outPath).size / 1024).toFixed(1) + 'KB');

// 写 dot.png
const assetsDir = path.join(ROOT, 'miniprogram/assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
fs.writeFileSync(path.join(assetsDir, 'dot.png'), makeTransparentPng());
console.log('assets/dot.png written');
