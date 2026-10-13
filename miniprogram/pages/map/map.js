// pages/map/map.js — 官方线网图 + 项目厕所预览
const officialMap = require('../../utils/official-metro-map.js');
const { byId, LINE_COLORS, lineLabel } = require('../../utils/data.js');
const { getProfile, toggleFavoriteStation } = require('../../utils/profile.js');

const POS_META = {
  platform: { label: '站台层', color: '#0085CA' },
  concourse: { label: '站厅层', color: '#0085CA' },
  outside: { label: '站外', color: '#ED8B00' },
};
const MAP_ASPECT = officialMap.height / officialMap.width;
const MAP_BASE_WIDTH = 1100;
function buildMapView(scale) {
  const mapWidth = Math.round(MAP_BASE_WIDTH * scale);
  return { mapScale: scale, mapWidth, mapHeight: Math.round(mapWidth * MAP_ASPECT) };
}
function touchDistance(touches) {
  const [first, second] = touches || [];
  if (!first || !second) return 0;
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}
const officialStations = officialMap.stations.map((station) => ({
  ...station,
  style: `left:${station.x * 100}%;top:${station.y * 100}%;`,
}));

Page({
  data: {
    officialStations,
    ...buildMapView(1),
    selectedSt: null,
    unmappedStationCount: 0,
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 1 });
  },

  zoomIn() { this.setData(buildMapView(Math.min(2.1, this.data.mapScale + 0.2))); },
  zoomOut() { this.setData(buildMapView(Math.max(0.8, this.data.mapScale - 0.2))); },
  onMapTouchStart(e) {
    if ((e.touches || []).length < 2) return;
    const distance = touchDistance(e.touches);
    if (distance) this._pinch = { distance, scale: this.data.mapScale };
  },
  onMapTouchMove(e) {
    if (!this._pinch || (e.touches || []).length < 2) return;
    const distance = touchDistance(e.touches);
    if (!distance) return;
    const nextScale = Math.max(0.8, Math.min(2.1, this._pinch.scale * distance / this._pinch.distance));
    if (Math.abs(nextScale - this.data.mapScale) > 0.01) this.setData(buildMapView(nextScale));
  },
  onMapTouchEnd(e) {
    if ((e.touches || []).length >= 2) return;
    if (this._pinch) this._suppressMapTapUntil = Date.now() + 250;
    this._pinch = null;
  },
  onMapTap() {
    if (Date.now() < (this._suppressMapTapUntil || 0)) return;
    if (this.data.selectedSt) this.closeCard();
  },
  // 每个热区映射至本地业务站，点击后复用既有厕所半屏预览。
  onStationTap(e) {
    const st = byId(e.currentTarget.dataset.id);
    if (st) this.setData({ selectedSt: this._buildCard(st) });
  },

  closeCard() { this.setData({ selectedSt: null }); },
  onToggleFavorite() {
    const selected = this.data.selectedSt;
    if (!selected) return;
    const profile = toggleFavoriteStation(selected.id);
    this.setData({ 'selectedSt.favorite': profile.favoriteStations.includes(selected.id) });
  },

  _buildCard(st) {
    const lines = (st.lines || []).map((n) => ({
      n: n, label: lineLabel(n), color: LINE_COLORS[n] || '#888',
    }));
    const toilets = (st.toilets || []).map((t) => {
      const pos = POS_META[t.place] || POS_META.concourse;
      const outside = t.place === 'outside' || t.area === '站外';
      return {
        id: t.id,
        title: '厕所 ' + (st.toilets.indexOf(t) + 1),
        lineLabel: (t.lines || [t.line]).map(lineLabel).join('/'), lineColor: LINE_COLORS[t.line] || '#888',
        posLabel: pos.label, posColor: pos.color,
        area: t.area, areaColor: t.area === '付费区' ? '#2EA56A' : '#ED8B00',
        desc: t.desc,
        near: t.near || '',
        accessLabel: outside
          ? (t.near ? `出站位置：${t.near}外` : '出口信息待核实')
          : (t.near ? `靠近 ${t.near}` : ''),
        walkLabel: (t.walk || 0) + ' 分钟步行',
        closed: !!t.closed,
        facilities: [
          { label: '男厕', on: !!t.m },
          { label: '女厕', on: !!t.f },
          { label: '无障碍', on: !!t.acc },
        ],
      };
    });
    return { id: st.id, name: st.name, hub: !!st.hub, lines: lines, toilets: toilets, favorite: getProfile().favoriteStations.includes(st.id) };
  },
});
