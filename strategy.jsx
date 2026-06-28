// ─── 厕所推荐策略 v2：真实路径规划 + 方向感知 + 同站去重 ───
// 关键升级：
//  1. findRoute(a,b) 用 BFS 在线网图上求出真实换乘路径（含方向、换乘点、每站累计时间）
//  2. 候选厕所只取「行进方向上、你还没经过的站」——理解方向
//  3. 同一车站只保留最合适的 1 个厕所——去重
//  4. 换乘概念来自真实路径上的换乘点，而非"任意枢纽"

const HOLD_MIN = [1.5, 6, 12, 999];   // wait 档对应能憋的分钟
const PER_HOP  = 2.5;                 // 每站平均区间运行
const TRANSFER = 5;                   // 一次换乘耗时（步行+候车）
const BOARD    = 2;                   // 平均候车

// ── 线网邻接图（缓存）──
let _adj = null;
function adjacency() {
  if (_adj) return _adj;
  _adj = {};
  const add = (a, b, line) => {
    (_adj[a] = _adj[a] || []).push({ to: b, line });
  };
  for (const [lk, arr] of Object.entries(LINES)) {
    const line = /^\d+$/.test(lk) ? Number(lk) : lk;
    for (let i = 0; i < arr.length - 1; i++) {
      add(arr[i], arr[i + 1], line);
      add(arr[i + 1], arr[i], line);
    }
  }
  return _adj;
}

// ── 站点经停线路 / 同线邻居（取自线网图，保证与图一致）──
function linesAtStation(sid) {
  const set = new Set();
  for (const e of (adjacency()[sid] || [])) set.add(e.line);
  return [...set];
}
function neighborsOnLine(sid, line) {
  const out = [];
  for (const e of (adjacency()[sid] || [])) if (e.line === line) out.push(e.to);
  return out;
}

// ── 路径规划 v4（无坐标）：最少换乘 → 最少站数 → 避免"短驳" → 尽量晚换乘 ──
// 把字典序代价压成一个标量后跑 Dijkstra，四档权重互不串位：
//   换乘(1e8) >> 站数(1e5) >> 短驳惩罚(1e3) >> 晚换乘微调(×1)
//   · 短驳惩罚：两次换乘之间只坐 1~2 站的"中间段"会被惩罚——真实地铁导航
//     （高德/百度/OTP）都规避这种"刚上车又下车换乘"的别扭路线。
//     例：嘉定北→锦绣路 原本会 11→龙华→12 只坐 1 站→龙华中路→7，
//     现在改走 11→江苏路→2→龙阳路→7，段长更均衡。
//   · 惩罚权重 < 站数权重，所以只在"换乘数、站数都打平"时打破平局，
//     绝不会为了避开短驳而多坐站。
//   · segLen 进入状态去重键（封顶 3，≥3 一律算"不短"），保证 Dijkstra 最优性。
// 返回 { path, hopLine, transfers:[{at,fromLine,toLine}], cumTime } —— 与旧版字段兼容。
const _routeCache = {};
function findRoute(aId, bId) {
  if (!aId || !bId || aId === bId) return null;
  const ck = aId + '→' + bId;
  if (_routeCache[ck] !== undefined) return _routeCache[ck];

  const W_T = 1e8, W_S = 1e5, W_P = 1e3;            // 换乘 >> 站数 >> 短驳 >> 晚换乘
  const keyOf = (t, s, p, f) => t * W_T + s * W_S + p * W_P + (300 - f);
  const startLines = linesAtStation(aId);
  if (!startLines.length) return (_routeCache[ck] = null);

  const dist = {}, pq = [];
  const relax = (station, line, t, s, f, g, p, prev, via) => {
    const id = station + '|' + line + '|' + Math.min(g, 3), cost = keyOf(t, s, p, f);
    if (dist[id] == null || cost < dist[id]) {
      dist[id] = cost;
      pq.push({ station, line, transfers: t, stops: s, firstSeg: f, segLen: g, pen: p, prev, via, cost });
    }
  };
  for (const L of startLines) relax(aId, L, 0, 0, 0, 0, 0, null, 'start');

  const settled = new Set();
  let goal = null;
  while (pq.length) {
    let mi = 0;
    for (let i = 1; i < pq.length; i++) if (pq[i].cost < pq[mi].cost) mi = i;
    const cur = pq.splice(mi, 1)[0];
    const cid = cur.station + '|' + cur.line + '|' + Math.min(cur.segLen, 3);
    if (settled.has(cid)) continue;
    settled.add(cid);
    if (cur.station === bId) { goal = cur; break; }
    // 坐一站（同线，站数 +1；首段未换乘前累计 firstSeg；当前段 segLen +1）
    for (const to of neighborsOnLine(cur.station, cur.line)) {
      relax(to, cur.line, cur.transfers, cur.stops + 1,
        cur.transfers === 0 ? cur.firstSeg + 1 : cur.firstSeg,
        cur.segLen + 1, cur.pen, cur, 'ride');
    }
    // 换乘（同站换线，换乘 +1；firstSeg 冻结；段重置；中间段过短则加惩罚）
    //   仅"中间段"（已换乘过一次、本段又要换乘，transfers>=1）的短段才罚，
    //   起始段短不罚（出发点紧邻换乘站很常见）。
    const addPen = (cur.transfers >= 1 && cur.segLen <= 2) ? (3 - cur.segLen) : 0;
    for (const L2 of linesAtStation(cur.station)) {
      if (L2 === cur.line) continue;
      relax(cur.station, L2, cur.transfers + 1, cur.stops, cur.firstSeg, 0, cur.pen + addPen, cur, 'transfer');
    }
  }
  if (!goal) return (_routeCache[ck] = null);

  // 回溯状态链 → path / hopLine / transfers
  const chain = []; for (let n = goal; n; n = n.prev) chain.unshift(n);
  const path = [aId], hopLine = [], transfers = [];
  for (let i = 1; i < chain.length; i++) {
    const p = chain[i - 1], c = chain[i];
    if (c.via === 'ride') { path.push(c.station); hopLine.push(c.line); }
    else if (c.via === 'transfer') transfers.push({ at: c.station, fromLine: p.line, toLine: c.line });
  }
  const cumTime = [0];
  for (let i = 0; i < hopLine.length; i++) {
    let seg = PER_HOP;
    if (i > 0 && hopLine[i] !== hopLine[i - 1]) seg += TRANSFER;
    cumTime.push(cumTime[i] + seg);
  }
  return (_routeCache[ck] = { path, hopLine, transfers, cumTime });
}

// A → B 通行时间（分钟）
function metroTravel(aId, bId) {
  if (aId === bId) return 0;
  const r = findRoute(aId, bId);
  if (!r) return 999;
  return r.cumTime[r.cumTime.length - 1];
}

// 厕所是否满足需求
function meetsNeed(t, gender) {
  if (t.closed) return false;
  if (gender === 'acc') return !!t.acc;
  if (gender === 'f') return !!t.f;
  return !!t.m;
}

// 中途使用是否需要"出闸"——非付费区 / 站外的厕所要刷卡出站再进站，
// 坐到一半为上厕所出站重进既费钱又费事，中途一律不推荐这类。
// 付费区、以及站厅(both，闸内可达) 都算"不出闸"。
function needsExit(t) { return t.area === '非付费区' || t.area === '站外'; }

// 厕所是否在「你实际乘坐/换乘的线路」上。
// t.line 是该厕所所属线路的站台/区域；usedLines 为空（信息缺失）时一律视为顺路，不误伤。
function onUsedLine(t, usedLines) {
  if (!usedLines || !usedLines.length) return true;
  return usedLines.includes(t.line);
}

// 同站多个厕所 → 选最合适的一个
// 优先级：① 在你乘坐的线路上 ② 站台 > 付费区站厅 > 站厅(both) > 非付费区站厅 > 站外 ③ 步行近
// opts.noExitOnly：只在闸内可用的厕所里挑（中途站用），没有则返回 null。
// opts.usedLines：你在该站实际用到的线路；不在这些线上的厕所要走到无关线路，排在后面。
function bestToiletAt(st, gender, opts) {
  let ok = st.toilets.filter((t) => meetsNeed(t, gender));
  if (opts && opts.noExitOnly) ok = ok.filter((t) => !needsExit(t));
  if (!ok.length) return null;
  const used = opts && opts.usedLines;
  const areaRank  = { '付费区': 0, '站厅': 1, '非付费区': 2, '站外': 3 };
  const placeRank = { platform: 0, concourse: 1, outside: 2 };
  ok.sort((a, b) => {
    // ① 顺路线优先：在你乘坐的线上的厕所，永远排在无关线路厕所前面
    const la = onUsedLine(a, used) ? 0 : 1, lb = onUsedLine(b, used) ? 0 : 1;
    if (la !== lb) return la - lb;
    const pd = placeRank[a.place] - placeRank[b.place];
    if (pd !== 0) return pd;
    const ad = (areaRank[a.area] ?? 2) - (areaRank[b.area] ?? 2);
    if (ad !== 0) return ad;
    return a.walk - b.walk;
  });
  return ok[0];
}

// ── 候选站集合：方向感知 ──
// 有终点：取路径上「当前站 → 终点」沿途所有站（即你前进方向会经过的站）
// 无终点：取当前站 + 同线相邻 2 站（两侧，因不知方向）
function candidateStations(curId, destId) {
  if (destId) {
    const r = findRoute(curId, destId);
    if (r) {
      // 路径上每个站，附带「到达该站的累计时间」与是否换乘点
      // usedLines：你在该站实际乘坐/换乘的线路 = 到达线 ∪ 离开线。
      //   厕所若不在这些线上，得专门走到另一条无关线路的站台/区域，很不顺手 → 后续减分。
      return r.path.map((sid, i) => {
        const arriveLine = i > 0 ? r.hopLine[i - 1] : null;     // 坐到本站用的线
        const departLine = i < r.hopLine.length ? r.hopLine[i] : null; // 从本站离开用的线
        const usedLines = [arriveLine, departLine].filter((l) => l != null);
        return {
          st: byId(sid),
          travel: r.cumTime[i],
          isTransfer: r.transfers.some((tr) => tr.at === sid),
          isCur: sid === curId,
          isDest: sid === destId,
          idx: i,
          usedLines,
        };
      }).filter((x) => x.st);
    }
  }
  // 无终点 fallback：当前站在哪条线都可能，用其全部经停线
  const curLines = linesAtStation(curId);
  const out = [{ st: byId(curId), travel: 0, isTransfer: false, isCur: true, isDest: false, idx: 0, usedLines: curLines }];
  const cur = byId(curId);
  if (cur) {
    const adj = adjacency();
    const near = new Map();    // sid -> 乘坐到达它的线
    for (const e of adj[curId] || []) if (!near.has(e.to)) near.set(e.to, e.line);
    let k = 0;
    for (const [sid, line] of near) {
      const s = byId(sid);
      if (s) out.push({ st: s, travel: PER_HOP, isTransfer: false, isCur: false, isDest: false, idx: 1 + (k++), usedLines: [line] });
    }
  }
  return out;
}

function rankToilets(ctx) {
  const { cur, dest, gender, strat } = ctx;
  const hold = ctx.hold != null ? ctx.hold : 12;
  const cands = candidateStations(cur, dest);
  const out = [];

  for (const c of cands) {
    const st = c.st;
    // 中途站（非当前、非终点）只在"不出闸"的厕所里挑——避免为上厕所刷卡出站重进；
    // 当前站/终点站反正要下车，所有厕所都可选。
    const midJourney = !c.isCur && !c.isDest;
    const t = bestToiletAt(st, gender, { noExitOnly: midJourney, usedLines: c.usedLines });
    if (!t) continue;

    const totalMin = c.travel + t.walk;
    const inTime = totalMin <= hold;
    const tags = [];

    // ── ① 时间评分（紧急程度加权）—— 主导项 ──
    // hold 越小，每分钟路程的代价越高；随便逛时距离权重降低，质量因素更主导
    const urgW = hold <= 4 ? 5 : hold <= 12 ? 3 : hold <= 40 ? 1.5 : 0.8;
    let score = 50 - totalMin * urgW;

    // ── ② 位置便携评分（仅做轻量微调，不再盖过"就近/快"）──
    // 出闸代价已在 bestToiletAt 用硬过滤处理（中途不会出现需出闸的厕所），
    // 这里只在闸内场景按"站台 > 付费区站厅"轻微区分换层便利，幅度压到 ±8 以内。
    if (t.place === 'platform') {
      score += midJourney ? 8 : 5;          // 站台：不换层，最省事
    } else if (t.place === 'concourse' && t.area === '付费区') {
      score += midJourney ? 4 : 3;          // 付费区站厅：闸内但要换层
    } else if (t.place === 'outside') {
      score += midJourney ? -8 : -2;        // 站外（仅终点/当前站可能出现）
    } else {
      score += midJourney ? 0 : 2;          // 非付费区/站厅(both)：仅终点/当前站
    }

    // ── ③ 顺路线惩罚：厕所不在你实际乘坐/换乘的线路上 → 要走到无关线路站台，扣分 ──
    // 终点站可能为换乘大站、各线站台都顺路，惩罚减半；信息缺失(usedLines为空)不罚。
    if (!onUsedLine(t, c.usedLines)) {
      score -= c.isDest ? 6 : 12;
      tags.push('需走到' + lineName(t.line));
    }

    // 策略角色 —— 占主导权重，保证榜首推荐与所选策略一致
    if (strat === 'near') {
      if (c.isCur) { score += 42; tags.unshift('当前站'); }
      else { score += Math.max(0, 28 - c.idx * 5); if (dest) tags.push('顺路'); }
    } else if (strat === 'terminal') {
      if (c.isDest) { score += 72; tags.unshift('终点站'); }
      else if (c.isCur) { score += 6; tags.push('当前站'); }
      else { score += 6 + c.idx * 2; tags.push('顺路'); }    // 越靠近终点越优先
    } else if (strat === 'transfer') {
      // 换乘站强力提权；当前站反而减分——换乘站来得及时，没必要就近凑将就
      if (c.isTransfer) { score += 90; tags.unshift('换乘站'); }
      else if (c.isDest) { score += 24; tags.unshift('终点站'); }
      else if (c.isCur) { score -= 5; tags.push('当前站'); }
      else { tags.push('顺路'); }
    }

    if (t.acc && gender === 'acc') score += 6;
    else if (t.acc) tags.push('有无障碍');

    if (!inTime) score -= 60;                                 // 来不及的目标站让位给就近兜底
    else if (totalMin <= hold * 0.6) tags.push('从容');

    out.push({
      toilet: t, station: st, score,
      travelMin: c.travel, totalMin, inTime,
      isTransfer: c.isTransfer, isCur: c.isCur, isDest: c.isDest,
      reasonTags: tags,
    });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

// ── 热门车站（客流/换乘枢纽，用于搜索默认排序）──
const POPULAR_STATIONS = [
  '人民广场', '徐家汇', '陆家嘴', '南京东路', '南京西路', '世纪大道',
  '静安寺', '虹桥火车站', '上海火车站', '中山公园', '五角场', '陕西南路',
  '一大会址·新天地', '豫园', '上海南站', '虹桥2号航站楼', '浦东国际机场',
  '迪士尼', '龙阳路', '世纪公园', '金沙江路', '曹杨路', '宝山路', '四平路',
];
const POP_RANK = {};
POPULAR_STATIONS.forEach((n, i) => { POP_RANK[n] = i; });

// 选站器默认排序：'hot' 热门优先 / 'near' 离参考站最近
function sortStationsForPicker(mode, refId) {
  const arr = STATIONS.slice();
  if (mode === 'near' && refId) {
    return arr
      .map((s) => ({ s, d: s.id === refId ? -1 : metroTravel(refId, s.id) }))
      .sort((a, b) => a.d - b.d)
      .map((x) => ({ ...x.s, _dist: x.d }));
  }
  // hot：热门站按既定顺序在前，其余保持原序在后
  return arr.sort((a, b) => {
    const ra = POP_RANK[a.name] != null ? POP_RANK[a.name] : 999;
    const rb = POP_RANK[b.name] != null ? POP_RANK[b.name] : 999;
    return ra - rb;
  });
}

// ── 自动决策：根据憋忍分钟 + 路线，决定上厕所策略 ──
// 规则：
//  1. 时间很紧(≤3分) → 就近，路上最快到的厕所
//  2. 不紧急 + 路线有换乘站 + 该换乘站「付费区」内有厕所且来得及 → 换乘时顺便解决（优先）
//  3. 否则终点可在时间内到达 → 到终点下车解决
//  4. 其余 → 就近
const URGENT_MAX = 3;     // ≤ 此值视为紧急
const RELAX_MIN  = 16;    // ≥ 此值视为很充裕

function decideStrategy(ctx) {
  const { cur, dest, gender } = ctx;
  const hold = ctx.hold != null ? ctx.hold : 12;
  const cands = candidateStations(cur, dest);

  if (hold <= URGENT_MAX) {
    return { strat: 'near', reason: '时间很紧，优先就近、最快能到的厕所。' };
  }

  if (dest) {
    const dc = cands.find((c) => c.isDest);
    const dt = dc && bestToiletAt(dc.st, gender);
    const destReachable = dt && (dc.travel + dt.walk) <= hold;

    // ① 优先换乘站：路上任意换乘点，付费区内有厕所且来得及 → 换乘时顺便解决
    //    （时间越宽裕越该这么做：与其一路憋到终点，不如换乘下车时一并解决）
    const transfers = cands.filter((c) => c.isTransfer && !c.isDest);
    for (const c of transfers) {
      const paid = c.st.toilets.find((t) => meetsNeed(t, gender) && t.area === '付费区');
      if (paid && (c.travel + paid.walk) <= hold) {
        return { strat: 'transfer', transferAt: c.st.id,
          reason: `路上在 ${c.st.name} 换乘，付费区内就有厕所，顺便解决最省事。` };
      }
    }
    // ② 其次终点：终点来得及 → 到终点下车解决
    if (destReachable) {
      return { strat: 'terminal',
        reason: hold >= RELAX_MIN
          ? `时间充裕，到终点 ${dc.st.name} 下车从容解决。`
          : `到终点 ${dc.st.name} 下车解决。` };
    }
  }
  return { strat: 'near', reason: '沿当前路线，挑你前进方向上最快能到的厕所。' };
}

// 自动决策 + 排序，一次给出
function recommend(ctx) {
  const d = decideStrategy(ctx);
  const list = rankToilets({ ...ctx, strat: d.strat });
  return { strat: d.strat, reason: d.reason, transferAt: d.transferAt, list };
}

Object.assign(window, { rankToilets, recommend, decideStrategy, metroTravel, findRoute, meetsNeed, HOLD_MIN, POPULAR_STATIONS, POP_RANK, sortStationsForPicker });
