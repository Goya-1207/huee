// ─── Home screen pieces ───

const GENDERS = [
  { key: 'm', label: '男厕', icon: Ic.male },
  { key: 'f', label: '女厕', icon: Ic.female },
  { key: 'acc', label: '无障碍', icon: Ic.acc },
];
const NEEDS = [
  { key: 'pee', label: '小便', color: '#3FA7D6' },
  { key: 'poop', label: '大便', color: '#C8772E' },
];

// 时间轴吸附点（非线性：紧急端精细，闲适端延伸到 2 小时）
// pos = 该档在轨道上的位置(0..1)，分钟↔位置分段线性插值
const WAIT_SNAPS = [
  { min: 1,   pos: 0,    label: '马上',   desc: '快憋不住了' },
  { min: 8,   pos: 0.34, label: '有点急', desc: '撑得住一会儿' },
  { min: 30,  pos: 0.67, label: '还能等', desc: '不太急，慢慢来' },
  { min: 120, pos: 1,    label: '随便逛', desc: '想去再去' },
];
const WAIT_MAX = 120;

// 分钟 → 轨道位置(0..1)
function holdToPos(m) {
  const a = WAIT_SNAPS;
  if (m <= a[0].min) return 0;
  for (let i = 1; i < a.length; i++) {
    if (m <= a[i].min) {
      const t = (m - a[i - 1].min) / (a[i].min - a[i - 1].min);
      return a[i - 1].pos + t * (a[i].pos - a[i - 1].pos);
    }
  }
  return 1;
}
// 轨道位置(0..1) → 分钟（30 分内取整到 1，以上取整到 5）
function posToHold(f) {
  const a = WAIT_SNAPS;
  f = Math.max(0, Math.min(1, f));
  for (let i = 1; i < a.length; i++) {
    if (f <= a[i].pos) {
      const t = (f - a[i - 1].pos) / (a[i].pos - a[i - 1].pos);
      let m = a[i - 1].min + t * (a[i].min - a[i - 1].min);
      m = m < 30 ? Math.round(m) : Math.round(m / 5) * 5;
      return Math.max(1, m);
    }
  }
  return a[a.length - 1].min;
}
// 友好时长文案
function fmtHold(m) {
  if (m >= WAIT_MAX) return '想去再去';
  if (m < 60) return m + ' 分钟';
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h} 小时 ${mm} 分` : `${h} 小时`;
}

function waitColor(m) { return m <= 4 ? '#E3002B' : m < 15 ? '#ED8B00' : '#2EA56A'; }
function waitState(m) { return m <= 2 ? '马上就要上' : m < 15 ? '有点急' : m < 45 ? '还能等' : '还能等 · 随便逛'; }

// route: current → destination
function RouteCard({ cur, dest, onPick, onSwap, onLocate, locating }) {
  const Row = ({ kind, st, placeholder }) => (
    <button className="route-row" onClick={() => onPick(kind)}>
      <span className="route-icon" style={{ color: kind === 'cur' ? 'var(--brand)' : 'var(--ink-2)' }}>
        {kind === 'cur' ? Ic.pin({ width: 20, height: 20 }) : Ic.flag({ width: 20, height: 20 })}
      </span>
      <span className="route-text">
        <span className="route-label">{kind === 'cur' ? '我在这一站' : '目的地'}</span>
        {st ? (
          <span className="route-station">
            <span>{st.name}</span>
            <LineBadges lines={st.lines} size={17} />
          </span>
        ) : (
          <span className="route-station ph">{placeholder}</span>
        )}
      </span>
      <span className="route-chev">{Ic.chevR({ width: 18, height: 18 })}</span>
    </button>
  );
  return (
    <GlassCard style={{ padding: 6, position: 'relative' }}>
      <Row kind="cur" st={cur} />
      <div className="route-divider">
        <span className="route-track" />
        <button className="swap-btn" onClick={onSwap} aria-label="交换">
          {Ic.swap({ width: 18, height: 18 })}
        </button>
      </div>
      <Row kind="dest" st={dest} placeholder="选择你要去的终点站" />
      <button className={'locate-btn' + (locating ? ' on' : '')} onClick={onLocate}>
        <span className={'locate-dot' + (locating ? ' pulse' : '')} />
        {locating ? '定位中…' : '重新定位'}
      </button>
    </GlassCard>
  );
}

// 可拖动时间轴：3 吸附点 + 无级调节（精确到分钟）
function WaitSlider({ value, onChange }) {
  const trackRef = React.useRef(null);
  const pct = holdToPos(value) * 100;
  const color = waitColor(value);

  const apply = (clientX, doSnap) => {
    const el = trackRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    let f = (clientX - r.left) / r.width;
    f = Math.max(0, Math.min(1, f));
    let val = posToHold(f);
    if (doSnap) {
      for (const s of WAIT_SNAPS) if (Math.abs(f - s.pos) <= 0.045) val = s.min;
    }
    onChange(Math.max(1, val));
  };
  const onDown = (e) => { e.currentTarget.setPointerCapture(e.pointerId); apply(e.clientX, false); };
  const onMove = (e) => { if (e.buttons === 0) return; apply(e.clientX, false); };
  const onUp = (e) => { apply(e.clientX, true); };

  return (
    <GlassCard style={{ padding: '16px 18px 16px' }}>
      <div className="wait-readout">
        <span className="wait-big" style={{ color }}>{waitState(value)}</span>
        <span className="wait-sub">还能憋 <b style={{ color }}>{fmtHold(value)}</b></span>
      </div>
      <div className="wslider" ref={trackRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
        <div className="wslider-rail" />
        <div className="wslider-fill" style={{ width: pct + '%', background: color }} />
        {WAIT_SNAPS.map((s) => (
          <span key={s.min} className="wslider-snap" style={{ left: (s.pos * 100) + '%' }} />
        ))}
        <span className="wslider-thumb" style={{ left: pct + '%', borderColor: color }} />
      </div>
      <div className="wslider-ticks">
        {WAIT_SNAPS.map((s) => (
          <button key={s.min} type="button" className={'wtick' + (Math.abs(holdToPos(value) - s.pos) <= 0.05 ? ' on' : '')}
            style={{ left: (s.pos * 100) + '%', transform: s.pos === 0 ? 'translateX(0)' : s.pos === 1 ? 'translateX(-100%)' : 'translateX(-50%)' }} onClick={() => onChange(s.min)}>
            {s.label}
          </button>
        ))}
      </div>
    </GlassCard>
  );
}

// 自动决策预览条
function AutoPlan({ st }) {
  if (!window.decideStrategy) return null;
  const d = window.decideStrategy({ cur: st.cur, dest: st.dest, gender: st.gender, hold: st.hold });
  const meta = { near: Ic.near, transfer: Ic.transfer, terminal: Ic.terminal }[d.strat];
  const label = { near: '就近解决', transfer: '换乘顺便', terminal: '终点解决' }[d.strat];
  return (
    <div className="autoplan glass">
      <span className="autoplan-ic">{meta({ width: 20, height: 20 })}</span>
      <div className="autoplan-text">
        <span className="autoplan-label">自动策略 · {label}</span>
        <span className="autoplan-reason">{d.reason}</span>
      </div>
    </div>
  );
}

function HomeScreen({ st, set, onSearch, onPick }) {
  const cur = byId(st.cur);
  const dest = st.dest ? byId(st.dest) : null;

  const onLocate = () => {
    set({ locating: true });
    setTimeout(() => set({ locating: false, cur: '人民广场' }), 1100);
  };

  return (
    <div className="screen-pad">
      <div className="brand">
        <div>
          <div className="brand-name">屙了么</div>
          <div className="brand-tag">上海地铁 · 找厕所</div>
        </div>
      </div>

      <SectionLabel icon={Ic.pin}>你的路线</SectionLabel>
      <RouteCard cur={cur} dest={dest} locating={st.locating}
        onPick={onPick}
        onSwap={() => dest && set({ cur: st.dest, dest: st.cur })}
        onLocate={onLocate} />

      <div style={{ height: 20 }} />
      <SectionLabel icon={Ic.drop} hint="快捷选项">这次的需求</SectionLabel>
      <GlassCard style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Segmented options={GENDERS} value={st.gender} onChange={(v) => set({ gender: v })} />
        <Segmented options={NEEDS} value={st.need} onChange={(v) => set({ need: v })} />
      </GlassCard>

      <div style={{ height: 20 }} />
      <SectionLabel icon={Ic.clock} hint="拖动调节">你还能憋多久</SectionLabel>
      <WaitSlider value={st.hold} onChange={(v) => set({ hold: v })} />

      <div style={{ height: 12 }} />
      <AutoPlan st={st} />

      <div style={{ height: 22 }} />
      <button className="cta" onClick={onSearch}>
        <span>寻找厕所</span>
        {Ic.arrow({ width: 22, height: 22 })}
      </button>
      <div style={{ height: 18 }} />
    </div>
  );
}

Object.assign(window, { HomeScreen, GENDERS, NEEDS, WAIT_SNAPS, WAIT_MAX, waitColor, waitState, fmtHold });
