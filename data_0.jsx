// ─── 沪屙屙 数据核心：线路配色 + 数据登记器 ───
// 各 data_N.jsx 调用 window.__metro.addLine(lineKey, rows) 登记原始爬取数据，
// 最后由 data_build.jsx 统一构建成 App 使用的 STATIONS / LINES / byId 等。

const LINE_COLORS = {
  1: '#E3002B', 2: '#97D700', 3: '#FCD600', 4: '#5F259F', 5: '#944D9A',
  6: '#D9027D', 7: '#ED8B00', 8: '#0085CA', 9: '#71C5E8', 10: '#C9A1CA',
  11: '#871C2B', 12: '#007A53', 13: '#E5007D', 14: '#827A04', 15: '#BA9A6A',
  16: '#32D4C8', 17: '#C19658', 18: '#D2B887', pj: '#9AA7C7',
};

// 选线顺序 + 显示标签（浦江线用「浦」）
const LINE_ORDER = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,'pj'];
const LINE_LABEL = { pj: '浦' };
function lineLabel(n) { return LINE_LABEL[n] != null ? LINE_LABEL[n] : String(n); }
function lineName(n)  { return n === 'pj' ? '浦江线' : `${n}号线`; }

// 原始数据登记器
window.__metro = {
  RAW_LINES: {},
  addLine(key, rows) { this.RAW_LINES[key] = rows; },
};

Object.assign(window, { LINE_COLORS, LINE_ORDER, LINE_LABEL, lineLabel, lineName });
