// ─── 上海地铁 3D 地图 ───
// MapLibre GL JS · 3D 俯视 · 真实线路叠加 · 站点厕所信息

const SH_CENTER = [121.474, 31.231];
const MAP_BRAND_COLOR = '#0085CA';
const METRO_LINE_GEOJSON_URL = 'geo/shanghai_subway_line.geojson';
const METRO_STATION_GEOJSON_URL = 'geo/shanghai_subway_station.geojson';

// ── 坐标系纠偏：GCJ-02（火星坐标，国内地图源）→ WGS-84（底图/GPS 用）──
// 本项目的地铁线路/站点 geojson 是 GCJ-02，而 OpenFreeMap/Esri 底图与浏览器
// 定位都是 WGS-84，两者在上海差约 480m，是"线路整体偏移"的根因。
// 这里把 geojson 坐标转回 WGS-84 后再叠加，即可与底图对齐。
const GCJ_A = 6378245.0, GCJ_EE = 0.00669342162296594323;
function _gcjTransLat(x, y) {
  let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
  r += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3;
  r += (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3;
  return r;
}
function _gcjTransLng(x, y) {
  let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
  r += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3;
  r += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3;
  return r;
}
// 给定 GCJ-02 经纬度，返回相对 WGS-84 的偏移量 [dLng, dLat]
function _gcjDelta(lng, lat) {
  let dLat = _gcjTransLat(lng - 105, lat - 35);
  let dLng = _gcjTransLng(lng - 105, lat - 35);
  const radLat = lat / 180 * Math.PI;
  let magic = Math.sin(radLat); magic = 1 - GCJ_EE * magic * magic;
  const sqMagic = Math.sqrt(magic);
  dLat = (dLat * 180) / ((GCJ_A * (1 - GCJ_EE)) / (magic * sqMagic) * Math.PI);
  dLng = (dLng * 180) / (GCJ_A / sqMagic * Math.cos(radLat) * Math.PI);
  return [dLng, dLat];
}
// GCJ-02 → WGS-84（迭代逼近，精度 < 0.5m）。境外坐标原样返回。
function gcj02ToWgs84(lng, lat) {
  if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) return [lng, lat];
  let wLng = lng, wLat = lat;
  for (let i = 0; i < 3; i++) {
    const [dLng, dLat] = _gcjDelta(wLng, wLat);
    wLng = lng - dLng; wLat = lat - dLat;
  }
  return [wLng, wLat];
}
// 递归地把任意 GeoJSON 坐标数组从 GCJ-02 转成 WGS-84（就地新建，不改原对象）
function convertCoordsGcjToWgs(coords) {
  if (typeof coords[0] === 'number') {
    const [lng, lat] = gcj02ToWgs84(coords[0], coords[1]);
    return coords.length > 2 ? [lng, lat, ...coords.slice(2)] : [lng, lat];
  }
  return coords.map(convertCoordsGcjToWgs);
}
// 把一个 FeatureCollection 的全部几何坐标转成 WGS-84
function fcGcjToWgs84(fc) {
  if (!fc || !Array.isArray(fc.features)) return fc;
  return {
    ...fc,
    features: fc.features.map((f) => (f && f.geometry && f.geometry.coordinates)
      ? { ...f, geometry: { ...f.geometry, coordinates: convertCoordsGcjToWgs(f.geometry.coordinates) } }
      : f),
  };
}

// ── 地图样式 ──
const ROAD_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
function satStyle() {
  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/glyphs/{fontstack}/{range}.pbf',
    sources: {
      esri: { type: 'raster', tileSize: 256, attribution: '© Esri',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'] },
      esri_labels: { type: 'raster', tileSize: 256,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'] },
    },
    layers: [
      { id: 'sat', type: 'raster', source: 'esri' },
      { id: 'sat-ref', type: 'raster', source: 'esri_labels', paint: { 'raster-opacity': 0.5 } },
    ]
  };
}

const SUPPLEMENTAL_LINE_COORDS = {
  pj: [
    [121.512272, 31.061427],
    [121.526326, 31.047956],
    [121.530095, 31.033574],
    [121.530591, 31.016869],
    [121.530818, 31.002519],
    [121.521124, 30.991211],
  ],
};

const STATION_ALIASES = {
  '一大会址黄陂南路': '一大会址·黄陂南路',
  '一大会址新天地': '一大会址·新天地',
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

function lineKeyFromProps(props) {
  const raw = [props.lineKey, props.ref, props.line, props.name, props.NAME, props.Name]
    .filter(Boolean)
    .join(' ');
  if (/浦江/.test(raw) || /pujiang/i.test(raw)) return 'pj';
  if (/3\s*\/\s*4\s*号?线/.test(raw)) return '3-4';
  const m = raw.match(/(?:地铁|交通|Line\s*)?(\d{1,2})\s*(?:号线|号|线)?/i);
  return m ? Number(m[1]) : null;
}

function shouldSkipLineFeature(feature) {
  const props = feature.properties || {};
  const raw = [props.name, props.NAME, props.Name, props.ref, props.line]
    .filter(Boolean)
    .join(' ');
  return /联络线|停车场|折返线|装卸线|车库|旧路线/.test(raw);
}

function normalizedLineDedupeKey(feature, lineKey) {
  const rawName = String(stationDisplayName(feature.properties || {}) || '').replace(/轨道交通/g, '地铁');
  if (lineKey != null && lineKey !== '') return String(lineKey);
  return rawName || JSON.stringify(feature.geometry?.coordinates?.[0]?.[0] || []);
}

// 线要素的坐标点总数（LineString / MultiLineString），用于去重时择优保留完整几何。
function countLineCoords(geom) {
  if (!geom) return 0;
  if (geom.type === 'LineString') return (geom.coordinates || []).length;
  if (geom.type === 'MultiLineString') return (geom.coordinates || []).reduce((a, c) => a + (c ? c.length : 0), 0);
  return 0;
}

function normalizeLineFeature(feature) {
  const props = { ...(feature.properties || {}) };
  const lineKey = lineKeyFromProps(props);
  const parsedName = lineKey === '3-4' ? '3/4号线' : (lineKey ? lineName(lineKey) : '地铁线路');
  const parsedColor = lineKey === '3-4' ? (LINE_COLORS[4] || LINE_COLORS[3]) : LINE_COLORS[lineKey];
  const color = parsedColor || props.color || props.colour || props.COLOR || '#888';
  return {
    ...feature,
    properties: {
      ...props,
      name: props.name || props.NAME || props.Name || parsedName,
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

function stationCoordIndex(stationFeatures) {
  const idx = {};
  for (const feature of stationFeatures) {
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const props = feature.properties || {};
    const keys = [props.name, props.appStationId, props.normalizedName]
      .filter(Boolean)
      .map(normalizeStationName);
    for (const key of keys) if (!idx[key]) idx[key] = coords;
  }
  return idx;
}

function addSupplementalLineFeatures(lineFeatures, stationFeatures) {
  const coordIdx = stationCoordIndex(stationFeatures);
  const addLine = (lineKey, names) => {
    if (lineFeatures.some((f) => String(f.properties?.lineKey) === String(lineKey))) return;
    const coords = names.map((name) => coordIdx[normalizeStationName(name)]).filter(Boolean);
    // 站点坐标已是 WGS-84；硬编码 fallback 仍是 GCJ-02，需转换后才能与底图对齐。
    const fallback = (SUPPLEMENTAL_LINE_COORDS[lineKey] || []).map((c) => gcj02ToWgs84(c[0], c[1]));
    const finalCoords = coords.length >= 2 ? coords : fallback;
    if (finalCoords.length < 2) return;
    lineFeatures.push({
      type: 'Feature',
      properties: { name: lineName(lineKey), lineKey: String(lineKey), color: LINE_COLORS[lineKey] || '#888' },
      geometry: { type: 'LineString', coordinates: finalCoords },
    });
  };
  addLine('pj', LINES?.pj || []);
}

function prepareMetroGeoJSON(lineRaw, stationRaw) {
  const stationIdx = buildStationNameIndex();
  // 源 geojson 是 GCJ-02，先整体转成 WGS-84 再处理，与底图/GPS 对齐（消除整体偏移）。
  const lines = fcGcjToWgs84(assertFeatureCollection(lineRaw, '线路'));
  const stations = fcGcjToWgs84(assertFeatureCollection(stationRaw, '站点'));
  const normalizedStations = {
    ...stations,
    features: stations.features.map((f) => normalizeStationFeature(f, stationIdx)),
  };
  // 同一条线在源数据里常有多个要素（如"上海地铁6号线"完整版 + "上海轨道交通6号线"残片），
  // 按 lineKey 去重时要保留坐标点最多的那个，否则会留下只有几十个点的残片，
  // 导致 6/8/16 号线只画出一小段甚至看不见。
  const lineBest = new Map();   // key -> { feature, pts }
  const lineOrder = [];
  for (const feature of lines.features) {
    if (shouldSkipLineFeature(feature)) continue;
    const normalized = normalizeLineFeature(feature);
    const key = normalizedLineDedupeKey(normalized, normalized.properties.lineKey);
    const pts = countLineCoords(normalized.geometry);
    const prev = lineBest.get(key);
    if (!prev) { lineBest.set(key, { feature: normalized, pts }); lineOrder.push(key); }
    else if (pts > prev.pts) { lineBest.set(key, { feature: normalized, pts }); }
  }
  const normalizedLineFeatures = lineOrder.map((k) => lineBest.get(k).feature);
  addSupplementalLineFeatures(normalizedLineFeatures, normalizedStations.features);
  const normalizedLines = {
    ...lines,
    features: normalizedLineFeatures,
  };
  const unmatched = normalizedStations.features
    .filter((f) => !f.properties.matched)
    .map((f) => f.properties.name)
    .filter(Boolean);
  if (unmatched.length) console.warn('[map] 未匹配站点', unmatched);
  const matchedCount = normalizedStations.features.length - unmatched.length;
  return { lines: normalizedLines, stations: normalizedStations, matchedCount, totalCount: normalizedStations.features.length };
}

// ── 挂载 / 刷新地铁图层 ──
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
      'circle-color':        ['case', ['==',['get','matched'],1], MAP_BRAND_COLOR, '#8a8a8a'],
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

// ── 站点厕所浮窗 ──
function StationCard({ st, onClose }) {
  const ts = st?.toilets || [];
  const POS = {
    platform:  { label: '站台层', color: '#0085CA' },
    concourse: { label: '站厅层', color: 'var(--brand)' },
    outside:   { label: '站  外', color: '#ED8B00' },
  };
  return (
    <div className="map-card glass" onClick={e => e.stopPropagation()}>
      <div className="map-card-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="map-card-name">
            {st.name}
            {st.hub && <span className="hub-tag" style={{ marginLeft: 6 }}>换乘</span>}
            {st.unmatched && <span className="hub-tag" style={{ marginLeft: 6, background: 'rgba(138,138,138,.14)', color: '#666' }}>未匹配</span>}
          </div>
          <LineBadges lines={st.lines} size={15} />
        </div>
        <button className="sheet-close" onClick={onClose}>{Ic.close({ width: 16, height: 16 })}</button>
      </div>
      {ts.length === 0
        ? <div style={{ padding: '6px 0', color: 'var(--ink-3)', fontSize: 13 }}>暂无厕所数据</div>
        : ts.map((t, i) => {
            const pos = POS[t.place] || POS.concourse;
            return (
              <div key={i} className="map-toilet-row">
                <span style={{ color: pos.color, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{pos.label}</span>
                <span style={{ fontSize: 11, flexShrink: 0,
                  color: t.area === '付费区' ? '#2EA56A' : '#ED8B00' }}>{t.area}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-2)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc}</span>
              </div>
            );
          })
      }
    </div>
  );
}

// ── 主组件 ──
function MapScreen() {
  const containerRef  = React.useRef(null);
  const mapRef        = React.useRef(null);
  const gjsonRef      = React.useRef(null);
  const [phase,      setPhase]     = React.useState('loading');
  const [errMsg,     setErrMsg]    = React.useState('');
  const [styleMode,  setStyleMode] = React.useState('road');
  const [selectedSt, setSelected]  = React.useState(null);
  const [coverage,   setCoverage]  = React.useState({ matched: 0, total: 0 });

  React.useEffect(() => {
    let dead = false;
    try {
      if (typeof maplibregl === 'undefined') throw new Error('MapLibre 库未加载');

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: ROAD_STYLE,
        center: SH_CENTER, zoom: 10.5,
        pitch: 50, bearing: -17,
        attributionControl: true,
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
          if (!st) console.warn('[map] 点击未匹配站点', p.name || p.appStationId || p.normalizedName);
          setSelected(st || { name: p.name || '未匹配站点', toilets: [], lines: [], hub: false, unmatched: true });
        };
        map.on('click', 'stn-dot', click);
        map.on('click', 'stn-hub', click);
        ['stn-dot','stn-hub'].forEach(id => {
          map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
        });
      };

      const tryMount = () => {
        if (dead || mounted || !gjsonRef.current) return;
        if (!(map.isStyleLoaded && map.isStyleLoaded())) return;
        try {
          mountLayers(map, gjsonRef.current);
          attachHandlers();
          mounted = true;
          setPhase('ready');
        } catch(e) {
          console.warn('[map] mount', e.message);
          setPhase('error');
          setErrMsg(e.message);
        }
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
        tryMount();
      }).catch((e) => {
        console.warn('[map] GeoJSON 加载失败', e.message);
        if (!dead) { setPhase('error'); setErrMsg(e.message); }
      });

      map.on('load', () => tryMount());
      map.on('styledata', () => tryMount());
      map.on('idle', () => tryMount());
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

  const switchStyle = React.useCallback((mode) => {
    setStyleMode(mode);
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(mode === 'satellite' ? satStyle() : ROAD_STYLE);
    map.once('style.load', () => {
      if (gjsonRef.current) mountLayers(map, gjsonRef.current);
    });
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* 地图容器 */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* 加载 / 错误 */}
      {phase === 'loading' && (
        <div className="map-overlay">
          <div className="map-spinner" />
          <div style={{ marginTop: 12, fontSize: 14, color: 'var(--ink-2)' }}>正在加载地图…</div>
        </div>
      )}
      {phase === 'error' && (
        <div className="map-overlay">
          <div style={{ fontSize: 36 }}>🗺️</div>
          <div style={{ color: '#E3002B', fontSize: 14, marginTop: 8 }}>{errMsg}</div>
          <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 4 }}>请通过本地服务器打开页面后重试</div>
        </div>
      )}

      {/* 样式切换 */}
      <div className="map-mode-bar glass">
        {[["road","地图"],["satellite","卫星"]].map(([m, label]) => (
          <button key={m} className={'map-mode-btn' + (styleMode === m ? ' on' : '')}
            onClick={() => switchStyle(m)}>{label}</button>
        ))}
      </div>

      {/* 覆盖率提示 */}
      {phase === 'ready' && coverage.total > 0 && (
        <div className="map-coverage-badge glass">
          {coverage.matched}/{coverage.total} 站已匹配
        </div>
      )}

      {/* 站点厕所卡 */}
      {selectedSt && <StationCard st={selectedSt} onClose={() => setSelected(null)} />}
    </div>
  );
}

Object.assign(window, { MapScreen });
