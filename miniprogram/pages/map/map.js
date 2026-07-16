// pages/map/map.js — 上海地铁图（内置 <map> 组件 + 预生成的 polyline/markers）
const geo = require('../../utils/metro-geo.js');
const { byId, LINE_COLORS, lineLabel } = require('../../utils/data.js');

const POS_META = {
  platform: { label: '站台层', color: '#0085CA' },
  concourse: { label: '站厅层', color: '#0085CA' },
  outside: { label: '站外', color: '#ED8B00' },
};

Page({
  data: {
    center: geo.center,
    scale: 11,
    mapPolylines: geo.polylines,
    mapMarkers: [],
    selectedSt: null,
    unmappedStationCount: (geo.unmappedStationIds || []).length,
  },

  onLoad() {
    // markers 格式化为 <map> 需要的形态：1x1 透明图标占位 + callout 作可见圆点
    const mapMarkers = geo.markers.map((m) => ({
      id: m.id,
      latitude: m.latitude,
      longitude: m.longitude,
      iconPath: '/assets/dot.png',
      width: 1,
      height: 1,
      callout: {
        content: ' ',
        color: '#fff',
        fontSize: 1,
        bgColor: m.hub ? '#E3002B' : '#0085CA',
        padding: 5,
        borderRadius: 10,
        borderWidth: m.hub ? 2 : 0,
        borderColor: '#fff',
        display: 'ALWAYS',
        textAlign: 'center',
      },
    }));
    // id → marker 索引（实例属性，不进 setData）
    this._markersById = {};
    for (const m of geo.markers) this._markersById[m.id] = m;
    this.setData({ mapMarkers: mapMarkers });
  },

  onMarkerTap(e) {
    const m = this._markersById && this._markersById[e.detail.markerId];
    if (!m || !m.stationId) return;
    const st = byId(m.stationId);
    if (!st) return;
    this.setData({ selectedSt: this._buildCard(st) });
  },

  closeCard() { this.setData({ selectedSt: null }); },

  _buildCard(st) {
    const lines = (st.lines || []).map((n) => ({
      n: n, label: lineLabel(n), color: LINE_COLORS[n] || '#888',
    }));
    const toilets = (st.toilets || []).map((t) => {
      const pos = POS_META[t.place] || POS_META.concourse;
      return {
        id: t.id,
        posLabel: pos.label, posColor: pos.color,
        area: t.area, areaColor: t.area === '付费区' ? '#2EA56A' : '#ED8B00',
        desc: t.desc,
      };
    });
    return { name: st.name, hub: !!st.hub, lines: lines, toilets: toilets };
  },
});
