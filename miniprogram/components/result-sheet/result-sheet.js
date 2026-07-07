const { recommend } = require('../../utils/strategy.js');
const { toiletLocBrief } = require('../../utils/data.js');
const { icon } = require('../../utils/icon.js');

const POS_META = {
  platform: { label: '站台层', icon: 'terminal', color: '#0085CA' },
  concourse: { label: '站厅层', icon: 'pin', color: '#0085CA' },
  outside: { label: '站外', icon: 'flag', color: '#ED8B00' },
};
const STRAT_META = { near: '就近解决', transfer: '换乘顺便', terminal: '终点解决' };
const WAIT_MAX = 120;
function fmtHold(m) {
  if (m >= WAIT_MAX) return '想去再去';
  if (m < 60) return m + ' 分钟';
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? h + ' 小时 ' + mm + ' 分' : h + ' 小时';
}

Component({
  properties: { st: { type: Object, value: null } },
  data: {
    kicker: '', reason: '', primary: null, alts: [], empty: false,
    walkIconSrc: icon('walk', { color: '#0085CA', size: 16 }),
    _primaryRank: null, _altRanks: [],
  },
  observers: {
    st: function (st) {
      if (!st || !st.cur) return;
      const r = recommend(st);
      const stratLabel = STRAT_META[r.strat] || r.strat;
      const genderLabel = st.gender === 'f' ? '女士' : st.gender === 'acc' ? '无障碍' : '男士';
      const needLabel = st.need === 'poop' ? '大号' : '小号';
      const kicker = stratLabel + ' · ' + genderLabel + needLabel + ' · 能憋 ' + fmtHold(st.hold);
      const primaryRank = r.list[0] || null;
      const altRanks = r.list.slice(1, 5);
      this.setData({
        kicker: kicker, reason: r.reason,
        primary: primaryRank ? this._buildCard(primaryRank, true) : null,
        alts: altRanks.map((x) => this._buildCard(x, false)),
        empty: !primaryRank,
        _primaryRank: primaryRank,
        _altRanks: altRanks,
      });
    },
  },
  methods: {
    _buildCard(rank, primary) {
      const t = rank.toilet, st = rank.station;
      const pos = POS_META[t.place] || POS_META.platform;
      return {
        primary: primary,
        key: t.id,
        name: st.name,
        lines: st.lines,
        loc: toiletLocBrief(t),
        totalMin: Math.round(rank.totalMin),
        chips: this._buildChips(rank, t, pos),
      };
    },
    _buildChips(rank, t, pos) {
      const chips = [];
      chips.push({ text: pos.label, color: pos.color, iconSrc: icon(pos.icon, { color: pos.color, size: 13 }) });
      if (t.place === 'concourse') {
        if (t.area === '付费区') chips.push({ text: t.area, color: '#2EA56A', bg: 'rgba(46,165,106,0.10)' });
        else chips.push({ text: t.area, color: '#ED8B00', bg: 'rgba(237,139,0,0.08)' });
      }
      if (!rank.isCur && !rank.isDest && t.place !== 'platform' && t.area !== '付费区') {
        chips.push({ text: '需出站', color: '#ED8B00', bg: 'rgba(237,139,0,0.08)' });
      }
      chips.push({ text: '男女', color: '#5b6470', iconSrc: icon('male', { color: '#5b6470', size: 13 }) });
      if (t.acc) chips.push({ text: '无障碍', color: '#0085CA', iconSrc: icon('acc', { color: '#0085CA', size: 13 }) });
      if (rank.travelMin > 0) chips.push({ text: '坐车 ' + Math.round(rank.travelMin) + ' 分', color: '#5b6470' });
      if (!rank.inTime) chips.push({ text: '可能赶不上', color: '#E3002B', bg: 'rgba(227,0,43,0.08)' });
      if (rank.reasonTags && rank.reasonTags[0]) chips.push({ text: rank.reasonTags[0], color: '#0085CA', bg: 'var(--brand-tint)' });
      return chips;
    },
    onClose() { this.triggerEvent('close'); },
    onOpenPrimary() { if (this.data._primaryRank) this.triggerEvent('opentoilet', { rank: this.data._primaryRank }); },
    onOpenAlt(e) { const idx = e.currentTarget.dataset.idx; this.triggerEvent('opentoilet', { rank: this.data._altRanks[idx] }); },
  },
});
