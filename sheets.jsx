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
function StationPicker({ kind, current, refStation, onSelect, onClose }) {
  const [tab, setTab] = React.useState('line'); // 'line' | 'search'
  const [q, setQ] = React.useState('');
  const [line, setLine] = React.useState(1);
  const [reversed, setReversed] = React.useState(false);
  const [sortMode, setSortMode] = React.useState('hot'); // 'hot' | 'near'
  const [locating, setLocating] = React.useState(kind === 'cur');
  const [located, setLocated] = React.useState(null);

  React.useEffect(() => {
    if (kind !== 'cur') return;
    const tm = setTimeout(() => { setLocating(false); setLocated('人民广场'); }, 1100);
    return () => clearTimeout(tm);
  }, [kind]);
  React.useEffect(() => { setReversed(false); }, [line]);

  const refId = refStation || (located && located) || current;
  const searching = !!q.trim();
  const list = searching
    ? STATIONS.filter((s) => s.name.includes(q.trim()))
    : sortStationsForPicker(sortMode, refId);
  const lineStations = (LINES[line] || []).map(byId).filter(Boolean);
  const displayStations = reversed ? [...lineStations].reverse() : lineStations;
  const locatedSt = located ? byId(located) : null;

  return (
    <SheetShell onClose={onClose}
      title={kind === 'cur' ? '选择当前站' : '选择终点站'}
      kicker={kind === 'cur' ? '默认定位你所在的车站' : '你要去哪一站？'}
      kickerIcon={kind === 'cur' ? Ic.near : Ic.flag}>

      {kind === 'cur' && (
        <button className={'gps-card glass' + (locating ? ' loading' : '')} onClick={() => locatedSt && onSelect(locatedSt.id)} disabled={!locatedSt}>
          <span className={'gps-radar' + (locating ? ' on' : '')}>
            <span className="gps-wave" /><span className="gps-wave d" /><span className="gps-dot" />
          </span>
          <span className="gps-text">
            <span className="gps-label">{locating ? '正在定位…' : '检测到你在'}</span>
            <span className="gps-station">
              {locating ? '搜索附近车站' : locatedSt && locatedSt.name}
              {locatedSt && <LineBadges lines={locatedSt.lines} size={16} />}
            </span>
          </span>
          {!locating && locatedSt && <span className="gps-use">使用 {Ic.arrow({ width: 16, height: 16 })}</span>}
        </button>
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
        <React.Fragment>
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
          <div className="sheet-body picker-list line-list">
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
        </React.Fragment>
      )}
    </SheetShell>
  );
}

Object.assign(window, { ResultSheet, StationPicker, ToiletDetailSheet });
