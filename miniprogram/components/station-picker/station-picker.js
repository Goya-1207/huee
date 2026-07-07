const { STATIONS, LINES, LINE_ORDER, LINE_COLORS, lineName, byId } = require('../../utils/data.js');
const { sortStationsForPicker, POP_RANK } = require('../../utils/strategy.js');
const { icon } = require('../../utils/icon.js');

Component({
  properties: {
    kind: { type: String, value: 'cur' },
    current: { type: String, value: '' },
    refStation: { type: String, value: '' },
  },
  data: {
    title: '', kicker: '', kickerIcon: '',
    tab: 'line', q: '', line: 1, reversed: false, sortMode: 'hot',
    list: [], lineStations: [], lineStrip: [],
    curLineName: '', curLineColor: '', curLineCount: 0, curLineArr: [1],
    refName: '', hasRef: false,
    searchIcon: '', swapIcon: '', sparkleIcon: '',
  },
  attached() {
    const isCur = this.data.kind === 'cur';
    this.setData({
      title: isCur ? '选择当前站' : '选择终点站',
      kicker: isCur ? '默认定位你所在的车站' : '你要去哪一站？',
      kickerIcon: isCur ? 'near' : 'flag',
      searchIcon: icon('pin', { color: '#6b7079', size: 18 }),
      swapIcon: icon('swap', { color: '#0085CA', size: 16 }),
      sparkleIcon: icon('sparkle', { color: '#D9A300', size: 12 }),
    });
    this._refreshLine();
    this._refreshSearch();
  },
  methods: {
    onClose() { this.triggerEvent('close'); },
    onTabLine() { this.setData({ tab: 'line' }); },
    onTabSearch() { this.setData({ tab: 'search' }); this._refreshSearch(); },
    onQInput(e) { this.setData({ q: e.detail.value }); this._refreshSearch(); },
    onSetLine(e) {
      const n = e.currentTarget.dataset.n;
      this.setData({ line: n, reversed: false, curLineArr: [n] });
      this._refreshLine();
    },
    onToggleReversed() { this.setData({ reversed: !this.data.reversed }); this._refreshLine(); },
    onSortHot() { this.setData({ sortMode: 'hot' }); this._refreshSearch(); },
    onSortNear() { if (!this.data.hasRef) return; this.setData({ sortMode: 'near' }); this._refreshSearch(); },
    onSelect(e) { this.triggerEvent('select', { id: e.currentTarget.dataset.id }); },

    _refreshSearch() {
      const { q, sortMode, refStation, current } = this.data;
      const refId = refStation || current;
      const searching = !!(q && q.trim());
      let list;
      if (searching) {
        list = STATIONS.filter((s) => s.name.indexOf(q.trim()) >= 0);
      } else {
        list = sortStationsForPicker(sortMode, refId);
      }
      const refSt = refId ? byId(refId) : null;
      const refName = refSt ? refSt.name : '';
      const rendered = list.map((s) => ({
        id: s.id, name: s.name, hub: !!s.hub, lines: s.lines,
        hot: !searching && sortMode === 'hot' && POP_RANK[s.name] != null,
        dist: !searching && sortMode === 'near' && s._dist > 0 ? Math.round(s._dist) : 0,
      }));
      this.setData({ list: rendered, refName: refName, hasRef: !!refId });
    },
    _refreshLine() {
      const { line, reversed } = this.data;
      const arr = (LINES[line] || []).map(byId).filter(Boolean);
      const display = reversed ? arr.slice().reverse() : arr;
      const rendered = display.map((s) => ({
        id: s.id, name: s.name, hub: !!s.hub, otherLines: s.lines.filter((l) => l !== line),
      }));
      const strip = LINE_ORDER.map((n) => ({ n: n, color: LINE_COLORS[n] || '#888', label: lineName(n), on: n == line }));
      this.setData({
        lineStations: rendered,
        lineStrip: strip,
        curLineName: lineName(line),
        curLineColor: LINE_COLORS[line] || '#888',
        curLineCount: arr.length,
      });
    },
  },
});
