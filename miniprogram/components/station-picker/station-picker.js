const { STATIONS, LINES, LINE_ORDER, LINE_COLORS, lineName, byId } = require('../../utils/data.js');
const { sortStationsForPicker, POP_RANK } = require('../../utils/strategy.js');
const { icon } = require('../../utils/icon.js');
const { getProfile, toggleFavoriteStation } = require('../../utils/profile.js');

Component({
  properties: {
    kind: { type: String, value: 'cur' },
    current: { type: String, value: '' },
    refStation: { type: String, value: '' },
    nearbyStations: { type: Array, value: [] },
    locating: { type: Boolean, value: false },
    locationError: { type: Boolean, value: false },
  },
  data: {
    title: '', kicker: '', kickerIcon: '',
    tab: 'line', q: '', line: 1, reversed: false, sortMode: 'hot',
    list: [], lineStations: [], lineStrip: [],
    favoriteList: [], nearbyList: [], nearbyListHeight: '0rpx', locationState: 'idle',
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
    this._favoriteIds = new Set(getProfile().favoriteStations);
    this._refreshFavorites();
    this._refreshNearby();
    this._refreshLine();
    this._refreshSearch();
    if (isCur && this.data.locating) this._startLocationScan();
  },
  detached() { clearTimeout(this._scanTimer); },
  observers: {
    locating(isLocating) {
      if (isLocating && this.data.kind === 'cur') this._startLocationScan();
    },
    nearbyStations(stations) {
      this._refreshNearby(stations);
      if (this.data.locationState === 'scanning' && stations && stations.length) this._finishLocationScan('ready');
    },
    locationError(hasError) {
      if (hasError && this.data.locationState === 'scanning') this._finishLocationScan('error');
    },
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
    onSortFavorite() { this.setData({ sortMode: 'favorite' }); this._refreshSearch(); },
    onLocate() {
      if (this.data.locationState === 'scanning') return;
      this._startLocationScan();
      this.triggerEvent('locate');
    },
    onSelect(e) { this.triggerEvent('select', { id: e.currentTarget.dataset.id }); },
    onToggleFavorite(e) {
      const id = e.currentTarget.dataset.id;
      if (!id) return;
      const profile = toggleFavoriteStation(id);
      this._favoriteIds = new Set(profile.favoriteStations);
      this._refreshFavorites(); this._refreshNearby(); this._refreshSearch(); this._refreshLine();
    },
    // 页面在真实定位成功后直接调用，避免动态弹窗的属性更新时序吞掉结果。
    showNearbyStations(stationIds) {
      this._refreshNearby(stationIds);
      if (stationIds && stationIds.length) this._finishLocationScan('ready');
    },

    _renderStation(s) {
      return { id: s.id, name: s.name, hub: !!s.hub, lines: s.lines, favorite: !!(this._favoriteIds && this._favoriteIds.has(s.id)) };
    },
    _refreshFavorites() {
      const ids = getProfile().favoriteStations;
      const list = ids.map(byId).filter(Boolean).map((s) => this._renderStation(s));
      this.setData({ favoriteList: list });
    },
    _refreshNearby(stations) {
      const list = (stations || this.data.nearbyStations || []).map((item) => {
        const id = typeof item === 'string' ? item : item.stationId;
        const station = byId(id);
        return station ? Object.assign(this._renderStation(station), { distance: typeof item === 'object' ? item.distance : 0 }) : null;
      }).filter(Boolean);
      this.setData({ nearbyList: list, nearbyListHeight: (Math.min(3, list.length) * 92) + 'rpx' });
    },
    _finishLocationScan(state) {
      const delay = Math.max(0, 850 - (Date.now() - (this._scanStartedAt || Date.now())));
      clearTimeout(this._scanTimer);
      this._scanTimer = setTimeout(() => this.setData({ locationState: state }), delay);
    },
    _startLocationScan() {
      if (this.data.locationState === 'scanning') return;
      clearTimeout(this._scanTimer);
      this._scanStartedAt = Date.now();
      this.setData({ locationState: 'scanning' });
    },

    _refreshSearch() {
      const { q, sortMode, refStation, current } = this.data;
      const refId = refStation || current;
      const searching = !!(q && q.trim());
      let list;
      if (searching) {
        list = STATIONS.filter((s) => s.name.indexOf(q.trim()) >= 0);
      } else if (sortMode === 'favorite') {
        list = getProfile().favoriteStations.map(byId).filter(Boolean);
      } else {
        list = sortStationsForPicker(sortMode, refId);
      }
      const refSt = refId ? byId(refId) : null;
      const refName = refSt ? refSt.name : '';
      const rendered = list.map((s) => Object.assign(this._renderStation(s), {
        hot: !searching && sortMode === 'hot' && POP_RANK[s.name] != null,
        dist: !searching && sortMode === 'near' && s._dist > 0 ? Math.round(s._dist) : 0,
      }));
      this.setData({ list: rendered, refName: refName, hasRef: !!refId });
    },
    _refreshLine() {
      const { line, reversed } = this.data;
      const arr = (LINES[line] || []).map(byId).filter(Boolean);
      const display = reversed ? arr.slice().reverse() : arr;
      const rendered = display.map((s) => Object.assign(this._renderStation(s), { otherLines: s.lines.filter((l) => l !== line) }));
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
