// ─── 沪屙屙 数据构建引擎 ───
// 把 window.__metro.RAW_LINES 里的真实爬取数据，构建成 App 使用的数据结构。
// 输出与旧 data.jsx 兼容的全局：LINES / STATIONS / byId / toiletById /
//   linesOf / toiletLocBrief / toiletLocFull

(function () {
  const RAW = window.__metro.RAW_LINES;
  const STMAP = {};     // name -> station
  const LINES = {};     // lineId -> [stationName,...]（有序、去重）

  function ensureStation(name) {
    if (!STMAP[name]) STMAP[name] = { id: name, name, lines: [], hub: false, exits: [], toilets: [] };
    return STMAP[name];
  }

  // 判断厕所在站台还是站厅
  function classify(place, desc) {
    if (/站台|车头|车尾|往[AB]方向/.test(desc)) return 'platform';
    if (place === 'outside') return 'outside';
    return 'concourse';
  }

  Object.keys(RAW).forEach((lineKey) => {
    const lineId = /^\d+$/.test(lineKey) ? Number(lineKey) : lineKey;
    const order = [];

    RAW[lineKey].forEach((row, i) => {
      const [name, place, acc, desc] = row;
      const st = ensureStation(name);
      if (!st.lines.includes(lineId)) st.lines.push(lineId);
      if (!order.includes(name)) order.push(name);

      const posType = classify(place, desc);          // platform | concourse | outside
      let line = lineId;
      const lm = desc.match(/(\d+)号线/);
      if (lm) line = Number(lm[1]);                    // “至8号线站台” → 归到 8 号线站台

      const near = (desc.match(/\d+号口/) || [])[0] || '';
      const area = place === 'in' ? '付费区'
                 : place === 'outside' ? '站外'
                 : place === 'both' ? '站厅'
                 : '非付费区';
      const walk = posType === 'platform' ? 2
                 : place === 'outside' ? 5
                 : place === 'out' ? 3 : 2;
      const closed = /改造|关闭|暂停|停用/.test(desc);

      st.toilets.push({
        id: `${name}#${lineKey}#${i}`,
        station: name,
        place: posType,
        line, area, near, desc,
        m: true, f: true,
        acc: acc === 1,
        walk, closed,
      });
    });

    LINES[lineId] = order;
  });

  // 站内去重（同一站描述完全相同的厕所合并）
  Object.values(STMAP).forEach((st) => {
    const seen = new Set();
    st.toilets = st.toilets.filter((t) => {
      const k = t.place + '|' + t.desc;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    st.lines.sort((a, b) => String(a).localeCompare(String(b), 'en', { numeric: true }));
    st.hub = st.lines.length > 1;
  });

  const STATIONS = Object.values(STMAP);

  // ── helpers ──
  function byId(id) { return STMAP[id] || null; }
  function linesOf(id) { return STMAP[id] ? STMAP[id].lines : []; }
  function toiletById(tid) {
    for (const st of STATIONS) {
      const t = st.toilets.find((x) => x.id === tid);
      if (t) return t;
    }
    return null;
  }
  const POS_LABEL = { platform: '站台', concourse: '站厅', outside: '地面' };
  function toiletLocBrief(t) { return t ? t.desc : ''; }
  function toiletLocFull(t) {
    if (!t) return '';
    return `${POS_LABEL[t.place] || ''}层 · ${t.desc}`;
  }

  Object.assign(window, {
    LINES, STATIONS, byId, linesOf, toiletById, toiletLocBrief, toiletLocFull,
  });

  // 调试：构建概况
  const total = STATIONS.reduce((n, s) => n + s.toilets.length, 0);
  console.log(`[沪屙屙] 构建完成：${STATIONS.length} 站 / ${total} 个厕所 / ${Object.keys(LINES).length} 条线路`);
})();
