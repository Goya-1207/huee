// ─── App root, tab bar, placeholder screens ───

function TabBar({ tab, onTab }) {
  const tabs = [
    { key: 'home', label: '首页', icon: Ic.home },
    { key: 'map', label: '地铁图', icon: Ic.map },
    { key: 'me', label: '我的', icon: Ic.user },
  ];
  return (
    <div className="tabbar glass">
      {tabs.map((t) => {
        const on = tab === t.key;
        return (
          <button key={t.key} className={'tab' + (on ? ' on' : '')} onClick={() => onTab(t.key)}>
            <span className="tab-ic">{t.icon({ width: 24, height: 24 })}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Placeholder({ icon, title, sub }) {
  return (
    <div className="screen-pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center', gap: 14 }}>
      <div className="ph-mark glass">{icon({ width: 34, height: 34 })}</div>
      <div>
        <div style={{ fontSize: 21, fontWeight: 700, color: 'var(--ink-1)' }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.6, maxWidth: 240 }}>{sub}</div>
      </div>
      <span className="soon-pill">即将上线</span>
    </div>
  );
}

function App() {
  const [st, setSt] = React.useState({
    cur: '人民广场', dest: null, gender: 'm', need: 'pee', hold: 8, locating: false,
  });
  const set = (p) => setSt((s) => ({ ...s, ...p }));
  const [tab, setTab] = React.useState('home');
  const [sheet, setSheet] = React.useState(null); // 'result' | {pick:'cur'|'dest'}
  const [detail, setDetail] = React.useState(null); // {toilet, station, ...} ranked entry

  return (
    <div className="app">
      <div className="bg">
        <span className="orb o1" /><span className="orb o2" /><span className="orb o3" />
        <span className="orb o4" /><span className="orb o5" />
      </div>

      <div className="scroll" key={tab}>
        {tab === 'home' && (
          <HomeScreen st={st} set={set}
            onSearch={() => setSheet('result')}
            onPick={(kind) => setSheet({ pick: kind })} />
        )}
        {tab === 'map' && (
          window.MapScreen
            ? <MapScreen />
            : <Placeholder icon={Ic.map} title="上海地铁全图"
                sub="当前入口未加载地图模块，请打开主预览页查看真实地铁图。" />
        )}
        {tab === 'me' && <Placeholder icon={Ic.user} title="我的"
          sub="登录后可收藏常用站、手动添加 / 分享厕所信息。1.0 暂未开放。" />}
      </div>

      <TabBar tab={tab} onTab={setTab} />

      {sheet === 'result' && <ResultSheet st={st} onClose={() => setSheet(null)} onOpenToilet={(r) => setDetail(r)} />}
      {detail && <ToiletDetailSheet rank={detail} onClose={() => setDetail(null)} />}
      {sheet && sheet.pick && (
        <StationPicker kind={sheet.pick} current={sheet.pick === 'cur' ? st.cur : st.dest}
          refStation={sheet.pick === 'dest' ? st.cur : null}
          onSelect={(id) => { set(sheet.pick === 'cur' ? { cur: id } : { dest: id }); setSheet(null); }}
          onClose={() => setSheet(null)} />
      )}
    </div>
  );
}

function Root() {
  return <div className="native-shell"><App /></div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
