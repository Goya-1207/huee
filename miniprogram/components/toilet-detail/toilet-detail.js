const { icon } = require('../../utils/icon.js');

const POS_META = {
  platform: { label: '站台层', icon: 'terminal', color: '#0085CA' },
  concourse: { label: '站厅层', icon: 'pin', color: '#0085CA' },
  outside: { label: '站外', icon: 'flag', color: '#ED8B00' },
};

Component({
  properties: { rank: { type: Object, value: null } },
  data: {
    name: '', lines: [], hub: false, totalMin: 0, travelMin: 0,
    posLabel: '', posIcon: '', desc: '', areaLine: '', walk: 0,
    nearIcon: '', walkIcon: '', facilities: [], closed: false,
  },
  observers: {
    rank: function (rank) {
      if (!rank) return;
      const t = rank.toilet, st = rank.station;
      const pos = POS_META[t.place] || POS_META.platform;
      const onColor = '#0085CA', offColor = '#9aa0a8';
      this.setData({
        name: st.name, lines: st.lines, hub: !!st.hub,
        totalMin: Math.round(rank.totalMin), travelMin: rank.travelMin,
        posLabel: pos.label, posIcon: icon(pos.icon, { color: pos.color, size: 18 }),
        desc: t.desc,
        areaLine: t.area + (t.near ? ' · ' + t.near : ''),
        walk: t.walk,
        nearIcon: icon('near', { color: onColor, size: 18 }),
        walkIcon: icon('walk', { color: onColor, size: 18 }),
        facilities: [
          { key: 'm', on: !!t.m, icon: icon('male', { color: t.m ? onColor : offColor, size: 20 }), label: '男厕', sub: t.m ? '可用' : '无' },
          { key: 'f', on: !!t.f, icon: icon('female', { color: t.f ? onColor : offColor, size: 20 }), label: '女厕', sub: t.f ? '可用' : '无' },
          { key: 'acc', on: !!t.acc, icon: icon('acc', { color: t.acc ? onColor : offColor, size: 20 }), label: '无障碍', sub: t.acc ? '可用' : '无' },
        ],
        closed: !!t.closed,
      });
    },
  },
  methods: {
    onClose() { this.triggerEvent('close'); },
  },
});
