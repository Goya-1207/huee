// pages/map/map.js — 上海地铁图（内置 <map> 组件 + 预生成的 polyline/markers）
const geo = require('../../utils/metro-geo.js');
const { byId, STATIONS, LINE_COLORS, lineLabel } = require('../../utils/data.js');
const { getProfile, toggleFavoriteStation } = require('../../utils/profile.js');

const POS_META = {
  platform: { label: '站台层', color: '#0085CA' },
  concourse: { label: '站厅层', color: '#0085CA' },
  outside: { label: '站外', color: '#ED8B00' },
};
const OVERVIEW_SCALE = 13;
const overviewPolylines = geo.polylines.map((line) => Object.assign({}, line, { width: 3 }));

Page({
  data: {
    center: geo.center,
    scale: 11,
    // 腾讯底图在低缩放时不一定展示地铁；仅概览层补充真实线路，放大后立即隐藏。
    mapPolylines: overviewPolylines,
    selectedSt: null,
    unmappedStationCount: (geo.unmappedStationIds || []).length,
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 1 });
  },

  onRegionChange(e) {
    if (e.type !== 'end' || !e.detail || !Number.isFinite(e.detail.scale)) return;
    const scale = e.detail.scale;
    const showOverview = scale < OVERVIEW_SCALE;
    const currentlyShown = this.data.mapPolylines.length > 0;
    if (showOverview === currentlyShown && scale === this.data.scale) return;
    this.setData({
      scale,
      mapPolylines: showOverview ? overviewPolylines : [],
    });
  },

  // 原生底图 POI 名称通常带“地铁站/站”后缀，规范化后与本地业务站点匹配。
  onPoiTap(e) {
    const poiName = e.detail && (e.detail.name || e.detail.poiName || '');
    const normalized = String(poiName).replace(/^上海地铁/, '').replace(/(?:地铁)?站$/, '').replace(/[·・]/g, '');
    const st = byId(poiName) || byId(normalized) || STATIONS.find((item) => item.name.replace(/[·・]/g, '') === normalized);
    if (!st) return;
    this.setData({ selectedSt: this._buildCard(st) });
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
      return {
        id: t.id,
        title: '厕所 ' + (st.toilets.indexOf(t) + 1),
        lineLabel: lineLabel(t.line), lineColor: LINE_COLORS[t.line] || '#888',
        posLabel: pos.label, posColor: pos.color,
        area: t.area, areaColor: t.area === '付费区' ? '#2EA56A' : '#ED8B00',
        desc: t.desc,
        near: t.near || '',
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
