// ─── Sheets: station picker (GPS / search / by line), result, toilet detail ───

const POS_META = {
  platform:  { label: '站台层', icon: Ic.terminal, color: '#0085CA' },
  concourse: { label: '站厅层', icon: Ic.pin,      color: 'var(--brand)' },
  outside:   { label: '站外',   icon: Ic.flag,     color: '#ED8B00' },
};

// ────────────────────────────────────────────────────────────────
function SheetShell({ children, onClose, title, kicker, kickerIcon }) {
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" />
        <div className="sheet-head">
          <div>
            {kicker && (
              <div className="sheet-kicker">
                {kickerIcon && <span className="sheet-kicker-ic">{kickerIcon({ width: 15, height: 15 })}</span>}
                {kicker}
              </div>
            )}
            <div className="sheet-title">{title}</div>
          </div>
          <button className="sheet-close" onClick={onClose}>{Ic.close({ width: 18, height: 18 })}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// 厕所卡（真实数据：位置 + 区域 + 设施可用性）
// ────────────────────────────────────────────────────────────────
function ToiletCard({ rank, gender, primary, onOpen }) {
  const { toilet: t, station: st, totalMin, travelMin, inTime, reasonTags } = rank;
  const pos = POS_META[t.place];
  return (
    <button className={'toilet-card' + (primary ? ' primary' : '')} onClick={onOpen}>
      <div className="tc-top">
        <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
          <div className="tc-name">{st.name}<LineBadges lines={st.lines} size={16} /></div>
          <div className="tc-loc">{toiletLocBrief(t)}</div>
        </div>
        <div className="tc-walk">
          <span className="tc-walk-ic">{Ic.walk({ width: 16, height: 16 })}</span>
          <span><b>{Math.round(totalMin)}</b> 分钟</span>
        </div>
      </div>
      <div className="tc-stats">
        <span className="tc-chip" style={{ color: pos.color }}>
          {pos.icon({ width: 14, height: 14 })}{pos.label}
        </span>
        {t.place === 'concourse' && (
          <span className="tc-chip" style={
            t.area === '付费区'
              ? { color: '#2EA56A', background: 'rgba(46,165,106,0.10)' }
              : { color: '#ED8B00', background: 'rgba(237,139,0,0.08)' }
          }>{t.area}</span>
        )}
        {!rank.isCur && !rank.isDest && t.place !== 'platform' && t.area !== '付费区' && (
          <span className="tc-chip" style={{ color: '#ED8B00', background: 'rgba(237,139,0,0.08)' }}>需出站</span>
        )}
        <span className="tc-chip">{Ic.male({ width: 13, height: 13 })}{Ic.female({ width: 13, height: 13 })}男女</span>
        {t.acc && <span className="tc-chip" style={{ color: 'var(--brand)' }}>{Ic.acc({ width: 13, height: 13 })}无障碍</span>}
        {travelMin > 0 && <span className="tc-chip">坐车 {Math.round(travelMin)} 分</span>}
        {!inTime && <span className="tc-chip" style={{ color: '#E3002B', background: 'rgba(227,0,43,0.08)' }}>可能赶不上</span>}
        {reasonTags.slice(0, 1).map((tag) => (
          <span key={tag} className="tc-chip" style={{ color: 'var(--brand)', background: 'var(--brand-tint)' }}>{tag}</span>
        ))}
      </div>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────
// 结果面板
// ────────────────────────────────────────────────────────────────
function ResultSheet({ st, onClose, onOpenToilet }) {
  const STRAT_META = {
    near: { label: '就近解决', icon: Ic.near },
    transfer: { label: '换乘顺便', icon: Ic.transfer },
    terminal: { label: '终点解决', icon: Ic.terminal },
  };
  const { strat, reason, list: ranked } = recommend(st);
  const stratMeta = STRAT_META[strat];
  const needLabel = st.need === 'poop' ? '大号' : '小号';
  const genderLabel = st.gender === 'f' ? '女士' : st.gender === 'acc' ? '无障碍' : '男士';

  const primary = ranked[0];
  const alts = ranked.slice(1, 5);

  return (
    <SheetShell onClose={onClose} title="为你找到这些厕所"
      kicker={`${stratMeta.label} · ${genderLabel}${needLabel} · 能憋 ${fmtHold(st.hold)}`}
      kickerIcon={stratMeta.icon}>
      <div className="sheet-body">
        <div className="sheet-reason">{reason}</div>
        {primary ? <ToiletCard rank={primary} gender={st.gender} primary onOpen={() => onOpenToilet(primary)} /> : (
          <div className="empty-hint">附近没找到匹配的厕所，试试放宽需求或时间</div>
        )}
        {alts.length > 0 && <div className="alt-label">其他选择</div>}
        {alts.map((r) => <ToiletCard key={r.toilet.id} rank={r} gender={st.gender} onOpen={() => onOpenToilet(r)} />)}
        <div style={{ height: 8 }} />
      </div>
    </SheetShell>
  );
}

// ────────────────────────────────────────────────────────────────
// 厕所详情
// ────────────────────────────────────────────────────────────────
function FacilityCell({ on, icon, label, sub }) {
  return (
    <div className={'td-facility' + (on ? '' : ' off')}>
      <span className="td-facility-ic">{icon({ width: 20, height: 20 })}</span>
      <span className="td-facility-l">{label}</span>
      <span className="td-facility-s">{sub}</span>
    </div>
  );
}

function ToiletDetailSheet({ rank, onClose }) {
  const { toilet: t, station: st, totalMin, travelMin } = rank;
  const pos = POS_META[t.place];
  return (
    <SheetShell onClose={onClose} title={`${st.name}`}
      kicker="厕所详情" kickerIcon={Ic.drop}>
      <div className="sheet-body">
        <div className="td-summary">
          <div className="td-station">
            <span className="td-name">{st.name}</span>
            <LineBadges lines={st.lines} size={18} />
            {st.hub && <span className="hub-tag">换乘</span>}
          </div>
          <div className="td-walk">
            <span className="tc-walk-ic">{Ic.walk({ width: 18, height: 18 })}</span>
            <span><b>{Math.round(totalMin)}</b> 分钟可达</span>
            {travelMin > 0 && <span className="td-walk-sub">（含坐车 {Math.round(travelMin)} 分）</span>}
          </div>
        </div>

        <div className="td-section">
          <div className="td-label">位置</div>
          <div className="td-row">
            <span className="td-ic" style={{ color: pos.color }}>{pos.icon({ width: 18, height: 18 })}</span>
            <div>
              <div className="td-row-title">{pos.label}</div>
              <div className="td-row-sub">{t.desc}</div>
            </div>
          </div>
          <div className="td-row">
            <span className="td-ic">{Ic.near({ width: 18, height: 18 })}</span>
            <div>
              <div className="td-row-title">{t.area}{t.near ? ` · ${t.near}` : ''}</div>
              <div className="td-row-sub">步行约 {t.walk} 分钟到达</div>
            </div>
          </div>
        </div>

        <div className="td-section">
          <div className="td-label">设施</div>
          <div className="td-facility-grid">
            <FacilityCell on={t.m} icon={Ic.male} label="男厕" sub={t.m ? '可用' : '无'} />
            <FacilityCell on={t.f} icon={Ic.female} label="女厕" sub={t.f ? '可用' : '无'} />
            <FacilityCell on={t.acc} icon={Ic.acc} label="无障碍" sub={t.acc ? '可用' : '无'} />
          </div>
        </div>

        {t.closed && (
          <div className="td-section">
            <div className="td-note">⚠️ 该厕所可能正在改造或暂停使用，建议就近选择其他厕所。</div>
          </div>
        )}

        <div className="td-source">数据来源：上海地铁公开厕所分布信息 · 仅供参考</div>
        <div style={{ height: 12 }} />
      </div>
    </SheetShell>
  );
}

// ────────────────────────────────────────────────────────────────
// 选站器：GPS / 搜索 / 按线路
// ────────────────────────────────────────────────────────────────
const STATION_GEOJSON_URL = 'geo/shanghai_subway_station.geojson';
let __stationCoordsPromise = null;

function normStationName(name) {
  return String(name || '').replace(/\s+/g, '').replace(/[·・]/g, '').replace(/站$/, '').trim();
}

// ── 坐标系纠偏：GCJ-02（geojson 源）→ WGS-84（浏览器定位用）──
// 站点 geojson 是 GCJ-02，getCurrentPosition 返回 WGS-84，上海差约 480m；
// 不转换则找最近车站约 1/4 概率选错相邻站，故必须转换后再比距离。
const _GCJ_A = 6378245.0, _GCJ_EE = 0.00669342162296594323;
function _gDLat(x, y) {
  let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
  r += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3;
  r += (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3;
  return r;
}
function _gDLng(x, y) {
  let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
  r += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3;
  r += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3;
  return r;
}
function gcj02ToWgs84(lng, lat) {
  if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) return [lng, lat];
  const delta = (L, T) => {
    let dLat = _gDLat(L - 105, T - 35), dLng = _gDLng(L - 105, T - 35);
    const radLat = T / 180 * Math.PI;
    let magic = Math.sin(radLat); magic = 1 - _GCJ_EE * magic * magic;
    const sq = Math.sqrt(magic);
    dLat = (dLat * 180) / ((_GCJ_A * (1 - _GCJ_EE)) / (magic * sq) * Math.PI);
    dLng = (dLng * 180) / (_GCJ_A / sq * Math.cos(radLat) * Math.PI);
    return [dLng, dLat];
  };
  let wLng = lng, wLat = lat;
  for (let i = 0; i < 3; i++) { const [dLng, dLat] = delta(wLng, wLat); wLng = lng - dLng; wLat = lat - dLat; }
  return [wLng, wLat];
}

function loadStationCoords() {
  if (__stationCoordsPromise) return __stationCoordsPromise;
  __stationCoordsPromise = fetch(STATION_GEOJSON_URL)
    .then((r) => { if (!r.ok) throw new Error('车站坐标加载失败 ' + r.status); return r.json(); })
    .then((gj) => {
      const nameIdx = {};
      for (const st of (STATIONS || [])) nameIdx[normStationName(st.name)] = st.id;
      const coords = {};
      for (const f of (gj.features || [])) {
        const c = f.geometry && f.geometry.coordinates;
        if (!Array.isArray(c) || c.length < 2) continue;
        const props = f.properties || {};
        const rawName = props.name || props.NAME || props.Name || props.station || '';
        const id = byId(rawName) ? rawName : nameIdx[normStationName(rawName)];
        if (id && !coords[id]) { const [lng, lat] = gcj02ToWgs84(c[0], c[1]); coords[id] = { lng, lat }; }
      }
      return coords;
    })
    .catch((err) => { __stationCoordsPromise = null; throw err; });
  return __stationCoordsPromise;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function nearbyStations(coords, lat, lng, radiusKm) {
  const all = [];
  for (const id in coords) {
    const c = coords[id];
    all.push({ id, km: haversineKm(lat, lng, c.lat, c.lng) });
  }
  all.sort((a, b) => a.km - b.km);
  const within = all.filter((s) => s.km <= radiusKm).slice(0, 8);
  return within.length ? within : all.slice(0, 1);
}

function fmtKm(km) {
  return km < 1 ? Math.round(km * 1000) + ' 米' : km.toFixed(1) + ' 公里';
}

function locateNearbyStations(radiusKm = 1) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(new Error('当前环境不支持定位')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        loadStationCoords()
          .then((coords) => {
            const list = nearbyStations(coords, latitude, longitude, radiusKm);
            if (!list.length) { reject(new Error('附近没有匹配到车站')); return; }
            resolve(list);
          })
          .catch(reject);
      },
      (err) => {
        const msg = err && err.code === err.PERMISSION_DENIED
          ? '定位权限被拒绝'
          : err && err.code === err.TIMEOUT ? '定位超时，请重试' : '定位失败，请重试';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

function StationPicker({ kind, current, refStation, onSelect, onClose }) {
  const [tab, setTab] = React.useState('line'); // 'line' | 'search'
  const [q, setQ] = React.useState('');
  const [line, setLine] = React.useState(1);
  const [reversed, setReversed] = React.useState(false);
  const [sortMode, setSortMode] = React.useState('hot'); // 'hot' | 'near'
  const [locating, setLocating] = React.useState(kind === 'cur');
  const [nearby, setNearby] = React.useState([]); // [{ id, km }] 按距离升序
  const [locErr, setLocErr] = React.useState('');

  const runLocate = React.useCallback(() => {
    setLocating(true); setLocErr(''); setNearby([]);
    let alive = true;
    locateNearbyStations(1)
      .then((list) => { if (!alive) return; setNearby(list); setLocating(false); })
      .catch((err) => { if (!alive) return; setLocErr(err.message || '定位失败'); setLocating(false); });
    return () => { alive = false; };
  }, []);

  React.useEffect(() => {
    if (kind !== 'cur') return;
    return runLocate();
  }, [kind, runLocate]);
  React.useEffect(() => { setReversed(false); }, [line]);

  const refId = refStation || (nearby[0] && nearby[0].id) || current;
  const searching = !!q.trim();
  const list = searching
    ? STATIONS.filter((s) => s.name.includes(q.trim()))
    : sortStationsForPicker(sortMode, refId);
  const lineStations = (LINES[line] || []).map(byId).filter(Boolean);
  const displayStations = reversed ? [...lineStations].reverse() : lineStations;
  const nearbyHits = nearby.map((n) => ({ ...n, st: byId(n.id) })).filter((n) => n.st);
  const firstHit = nearbyHits[0];
  const multiNearby = nearbyHits.length > 1;

  return (
    <SheetShell onClose={onClose}
      title={kind === 'cur' ? '选择当前站' : '选择终点站'}
      kicker={kind === 'cur' ? '默认定位你所在的车站' : '你要去哪一站？'}
      kickerIcon={kind === 'cur' ? Ic.near : Ic.flag}>

      {kind === 'cur' && (locating || locErr || !multiNearby) && (
        <button className={'gps-card glass' + (locating ? ' loading' : '') + (locErr ? ' err' : '')}
          onClick={() => { if (locErr) { runLocate(); return; } if (firstHit) onSelect(firstHit.id); }}
          disabled={!firstHit && !locErr}>
          <span className={'gps-radar' + (locating ? ' on' : '')}>
            <span className="gps-wave" /><span className="gps-wave d" /><span className="gps-dot" />
          </span>
          <span className="gps-text">
            <span className="gps-label">{locating ? '正在定位…' : locErr ? locErr : '检测到你在'}</span>
            <span className="gps-station">
              {locating ? '搜索附近车站' : locErr ? '点此重新定位' : firstHit && firstHit.st.name}
              {!locErr && firstHit && <LineBadges lines={firstHit.st.lines} size={16} />}
              {!locating && !locErr && firstHit && (
                <span className="gps-dist">约 {fmtKm(firstHit.km)}</span>
              )}
            </span>
          </span>
          {!locating && locErr && <span className="gps-use">重试 {Ic.arrow({ width: 16, height: 16 })}</span>}
          {!locating && !locErr && firstHit && <span className="gps-use">使用 {Ic.arrow({ width: 16, height: 16 })}</span>}
        </button>
      )}

      {kind === 'cur' && !locating && !locErr && multiNearby && (
        <div className="gps-multi">
          <div className="gps-multi-head">
            <span className="gps-radar"><span className="gps-dot" /></span>
            <span>附近 1 公里内有 {nearbyHits.length} 个车站，选一个</span>
          </div>
          {nearbyHits.map(({ id, km, st }) => (
            <button key={id} className="gps-near-row" onClick={() => onSelect(id)}>
              <span className="pr-name">{st.name}{st.hub && <span className="hub-tag">换乘</span>}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="gps-dist">{fmtKm(km)}</span>
                <LineBadges lines={st.lines} size={18} />
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="picker-tabs">
        <button className={'pt' + (tab === 'line' ? ' on' : '')} onClick={() => setTab('line')}>按线路</button>
        <button className={'pt' + (tab === 'search' ? ' on' : '')} onClick={() => setTab('search')}>搜索站名</button>
      </div>

      {tab === 'search' ? (
        <React.Fragment>
          <div className="picker-search glass">
            <span style={{ color: 'var(--ink-3)' }}>{Ic.pin({ width: 18, height: 18 })}</span>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索站名…" />
          </div>
          {!searching && (
            <div className="sort-row">
              <span className="sort-head">{sortMode === 'hot' ? '热门车站' : `离${refId ? byId(refId)?.name : '你'}最近`}</span>
              <div className="sort-toggle">
                <button className={'st-btn' + (sortMode === 'hot' ? ' on' : '')} onClick={() => setSortMode('hot')}>热门</button>
                <button className={'st-btn' + (sortMode === 'near' ? ' on' : '')} onClick={() => setSortMode('near')} disabled={!refId}>最近</button>
              </div>
            </div>
          )}
          <div className="sheet-body picker-list">
            {list.map((s) => (
              <button key={s.id} className={'picker-row' + (s.id === current ? ' on' : '')} onClick={() => onSelect(s.id)}>
                <span className="pr-name">
                  {!searching && sortMode === 'hot' && POP_RANK[s.name] != null && <span className="hot-dot">{Ic.sparkle({ width: 12, height: 12 })}</span>}
                  {s.name}{s.hub && <span className="hub-tag">换乘</span>}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {!searching && sortMode === 'near' && s._dist > 0 && <span className="pr-dist">{Math.round(s._dist)} 分</span>}
                  <LineBadges lines={s.lines} size={18} />
                </span>
              </button>
            ))}
            {list.length === 0 && <div className="empty-hint">没有找到「{q}」</div>}
          </div>
        </React.Fragment>
      ) : (
        <div className="sheet-body picker-list line-list">
          <div className="line-strip">
            {LINE_ORDER.map((n) => {
              const on = line === n;
              return (
                <button key={n} className={'line-chip' + (on ? ' on' : '')} onClick={() => setLine(n)}
                  style={on ? { background: LINE_COLORS[n], color: '#fff' } : { color: LINE_COLORS[n] }}>
                  <span className="lc-dot" style={{ background: LINE_COLORS[n] }} />{lineName(n)}
                </button>
              );
            })}
          </div>
          <div className="line-head" style={{ borderColor: LINE_COLORS[line], display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LineDot n={line} size={22} />
                <span>{lineName(line)} · 共 {lineStations.length} 站</span>
              </span>
              <button className="swap-btn" onClick={() => setReversed(r => !r)}
                title="颠倒方向" style={{ opacity: reversed ? 1 : 0.55, flexShrink: 0 }}>
                {Ic.swap({ width: 16, height: 16 })}
              </button>
            </div>
            {displayStations.map((s, i) => (
              <button key={s.id} className={'picker-row line-row' + (s.id === current ? ' on' : '')} onClick={() => onSelect(s.id)}>
                <span className="lr-rail" style={{ background: LINE_COLORS[line] }}>
                  <span className="lr-node" style={{ borderColor: LINE_COLORS[line] }} />
                  {i < lineStations.length - 1 && <span className="lr-line" style={{ background: LINE_COLORS[line] }} />}
                </span>
                <span className="pr-name">{s.name}{s.hub && <span className="hub-tag">换乘</span>}</span>
                <LineBadges lines={s.lines.filter((l) => l !== line)} size={16} />
              </button>
            ))}
        </div>
      )}
    </SheetShell>
  );
}

Object.assign(window, { ResultSheet, StationPicker, ToiletDetailSheet });
