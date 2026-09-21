const { icon } = require('../../utils/icon.js');
const { lineName } = require('../../utils/data.js');

const POS_META = {
  platform: { label: '站台层', icon: 'terminal', color: '#0085CA' },
  concourse: { label: '站厅层', icon: 'pin', color: '#0085CA' },
  outside: { label: '站外', icon: 'flag', color: '#ED8B00' },
};

Component({
  properties: { rank: { type: Object, value: null } },
  data: {
    name: '', lines: [], hub: false, totalMin: 0, travelMin: 0,
    walkIcon: '', toilets: [], toiletCount: 0, routePlan: null,
  },
  observers: {
    rank: function (rank) {
      if (!rank) return;
      const t = rank.toilet, st = rank.station;
      const onColor = '#0085CA', offColor = '#9aa0a8';
      const toilets = (st.toilets || []).map((item, index) => {
        const pos = POS_META[item.place] || POS_META.concourse;
        const toiletLines = item.lines && item.lines.length ? item.lines : [item.line];
        return {
          id: item.id,
          title: `厕所 ${index + 1}`,
          selected: item.id === t.id,
          lineText: toiletLines.map(lineName).join(' / '),
          lines: toiletLines,
          posLabel: pos.label,
          posIcon: icon(pos.icon, { color: pos.color, size: 18 }),
          desc: item.desc || '暂无更详细的位置说明',
          areaLine: item.area + (item.near ? ' · 靠近' + item.near : ''),
          walk: item.walk,
          nearIcon: icon('near', { color: onColor, size: 18 }),
          facilities: [
            { key: 'm', on: !!item.m, icon: icon('male', { color: item.m ? onColor : offColor, size: 20 }), label: '男厕', sub: item.m ? '可用' : '无' },
            { key: 'f', on: !!item.f, icon: icon('female', { color: item.f ? onColor : offColor, size: 20 }), label: '女厕', sub: item.f ? '可用' : '无' },
            { key: 'acc', on: !!item.acc, icon: icon('acc', { color: item.acc ? onColor : offColor, size: 20 }), label: '无障碍', sub: item.acc ? '可用' : '无' },
          ],
          closed: !!item.closed,
        };
      });
      this.setData({
        name: st.name, lines: st.lines, hub: !!st.hub,
        totalMin: Math.round(rank.totalMin), travelMin: rank.travelMin,
        walkIcon: icon('walk', { color: onColor, size: 18 }),
        toilets,
        toiletCount: toilets.length,
        routePlan: rank.routePlan || null,
      });
    },
  },
  methods: {
    onClose() { this.triggerEvent('close'); },
  },
});
