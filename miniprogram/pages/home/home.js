// pages/home/home.js — 首页（迁移自 home.jsx）
// 顶部状态：cur/dest/gender/need/hold/locating；派生数据由 setState 统一重算。

const { byId } = require('../../utils/data.js');
const { decideStrategy } = require('../../utils/strategy.js');
const { icon } = require('../../utils/icon.js');
const { locateAndPick } = require('../../utils/location.js');

const GENDERS = [
  { key: 'm', label: '男厕', icon: 'male' },
  { key: 'f', label: '女厕', icon: 'female' },
  { key: 'acc', label: '无障碍', icon: 'acc' },
];
const NEEDS = [
  { key: 'pee', label: '小便', color: '#3FA7D6' },
  { key: 'poop', label: '大便', color: '#C8772E' },
];

// 时间轴吸附点（非线性：紧急端精细，闲适端延伸到 2 小时）
const WAIT_SNAPS = [
  { min: 1, pos: 0, label: '马上', desc: '快憋不住了' },
  { min: 8, pos: 0.34, label: '有点急', desc: '撑得住一会儿' },
  { min: 30, pos: 0.67, label: '还能等', desc: '不太急，慢慢来' },
  { min: 120, pos: 1, label: '随便逛', desc: '想去再去' },
];
const WAIT_MAX = 120;

// 分钟 → 轨道位置(0..1)
function holdToPos(m) {
  const a = WAIT_SNAPS;
  if (m <= a[0].min) return 0;
  for (let i = 1; i < a.length; i++) {
    if (m <= a[i].min) {
      const t = (m - a[i - 1].min) / (a[i].min - a[i - 1].min);
      return a[i - 1].pos + t * (a[i].pos - a[i - 1].pos);
    }
  }
  return 1;
}
// 轨道位置(0..1) → 分钟（30 分内取整到 1，以上取整到 5）
function posToHold(f) {
  const a = WAIT_SNAPS;
  if (f < 0) f = 0; if (f > 1) f = 1;
  for (let i = 1; i < a.length; i++) {
    if (f <= a[i].pos) {
      const t = (f - a[i - 1].pos) / (a[i].pos - a[i - 1].pos);
      let m = a[i - 1].min + t * (a[i].min - a[i - 1].min);
      m = m < 30 ? Math.round(m) : Math.round(m / 5) * 5;
      return Math.max(1, m);
    }
  }
  return a[a.length - 1].min;
}
function fmtHold(m) {
  if (m >= WAIT_MAX) return '想去再去';
  if (m < 60) return m + ' 分钟';
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? h + ' 小时 ' + mm + ' 分' : h + ' 小时';
}
function waitColor(m) { return m <= 4 ? '#E3002B' : m < 15 ? '#ED8B00' : '#2EA56A'; }
function waitState(m) { return m <= 2 ? '马上就要上' : m < 15 ? '有点急' : m < 45 ? '还能等' : '还能等 · 随便逛'; }

Page({
  data: {
    cur: '人民广场', dest: '', gender: 'm', need: 'pee', hold: 8, locating: false,
    genderOptions: GENDERS,
    needOptions: NEEDS,
    curStation: null, destStation: null,
    sliderPos: 0, sliderColor: '#2EA56A', waitStateText: '', waitHoldText: '',
    snaps: [], autoplan: null,
    curIconSrc: '', destIconSrc: '', swapIconSrc: '', chevRIconSrc: '', arrowIconSrc: '',
    activeSheet: '', pickKind: 'cur', detailRank: null, stObj: null,
  },

  onLoad() {
    // 恢复上次状态
    const saved = wx.getStorageSync('homeState') || {};
    this.setData({
      cur: saved.cur || '人民广场',
      dest: saved.dest || '',
      gender: saved.gender || 'm',
      need: saved.need || 'pee',
      hold: saved.hold || 8,
      curIconSrc: icon('pin', { color: '#0085CA', size: 20 }),
      destIconSrc: icon('flag', { color: '#5b6470', size: 20 }),
      swapIconSrc: icon('swap', { color: '#0085CA', size: 18 }),
      chevRIconSrc: icon('chevR', { color: '#9aa0a8', size: 18 }),
      arrowIconSrc: icon('arrow', { color: '#ffffff', size: 22 }),
    });
    this.setState({});
  },

  onReady() {
    // 缓存滑块轨道的几何位置，供 touch 计算用
    wx.createSelectorQuery().in(this).select('.wslider').boundingClientRect((r) => {
      this._rect = r;
    }).exec();
  },

  // 统一状态更新：合并 patch + 重算所有派生数据，一次 setData
  setState(patch) {
    const next = Object.assign({}, this.data, patch);
    const { cur, dest, hold, gender } = next;
    const curStation = byId(cur);
    const destStation = dest ? byId(dest) : null;
    const pos = holdToPos(hold);
    const color = waitColor(hold);
    const snaps = WAIT_SNAPS.map((s) => {
      const left = s.pos * 100;
      const tx = s.pos === 0 ? 'translateX(0)' : s.pos === 1 ? 'translateX(-100%)' : 'translateX(-50%)';
      return { min: s.min, label: s.label, left: left, on: Math.abs(pos - s.pos) <= 0.05, tickStyle: 'left:' + left + '%;transform:' + tx };
    });
    const d = decideStrategy({ cur: cur, dest: dest || undefined, gender: gender, hold: hold });
    const meta = { near: '就近解决', transfer: '换乘顺便', terminal: '终点解决' }[d.strat];
    const autoplan = { iconSrc: icon(d.strat, { color: '#ffffff', size: 20 }), label: '自动策略 · ' + meta, reason: d.reason };

    this.setData(Object.assign({}, patch, {
      curStation: curStation ? { name: curStation.name, lines: curStation.lines } : null,
      destStation: destStation ? { name: destStation.name, lines: destStation.lines } : null,
      sliderPos: pos * 100,
      sliderColor: color,
      waitStateText: waitState(hold),
      waitHoldText: fmtHold(hold),
      snaps: snaps,
      autoplan: autoplan,
      stObj: { cur: cur, dest: dest, gender: gender, need: next.need, hold: hold },
    }));
    // 持久化核心状态
    wx.setStorageSync('homeState', { cur: cur, dest: dest, gender: gender, need: next.need, hold: hold });
  },

  onGenderChange(e) { this.setState({ gender: e.detail.key }); },
  onNeedChange(e) { this.setState({ need: e.detail.key }); },

  onSwap() {
    if (!this.data.dest) return;
    const cur = this.data.cur, dest = this.data.dest;
    this.setState({ cur: dest, dest: cur });
  },

  onLocate() {
    // 避免连续点击时发起多次定位请求；较晚返回的旧请求会覆盖较新的结果。
    if (this.data.locating) return;
    this.setState({ locating: true });
    locateAndPick({ maxDistance: 5000 }).then((r) => {
      this.setState({ locating: false, cur: r.stationId });
      wx.showToast({ title: r.name + '·' + r.distance + 'm', icon: 'none' });
    }).catch((err) => {
      this.setState({ locating: false });
      if (err && err.code === 'OUT_OF_RANGE') {
        wx.showToast({ title: '附近 5 公里内没有地铁站，请手动选择', icon: 'none' });
        return;
      }
      this._offerLocationSettings();
    });
  },

  _offerLocationSettings() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation'] === false) {
          wx.showModal({
            title: '需要定位权限',
            content: '开启定位后，可自动选择离你最近的地铁站。',
            confirmText: '去设置',
            success: (modal) => { if (modal.confirm) wx.openSetting({}); },
          });
        } else {
          wx.showToast({ title: '定位失败，请确认系统定位服务已开启', icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '定位失败，请手动选择车站', icon: 'none' }),
    });
  },

  onPickCur() { this.setData({ activeSheet: 'picker', pickKind: 'cur' }); },
  onPickDest() { this.setData({ activeSheet: 'picker', pickKind: 'dest' }); },
  onSearch() { this.setData({ activeSheet: 'result' }); },

  onPickerSelect(e) {
    const id = e.detail.id;
    const patch = this.data.pickKind === 'cur' ? { cur: id } : { dest: id };
    this.setState(patch);
    this.setData({ activeSheet: '' });
  },
  onOpenToilet(e) { this.setData({ detailRank: e.detail.rank, activeSheet: 'detail' }); },
  closeSheet() { this.setData({ activeSheet: '', detailRank: null }); },
  goMap() { wx.switchTab({ url: '/pages/map/map' }); },

  // ── 滑块拖动 ──
  onSliderStart(e) { this._dragging = true; this._applyTouch(e, false); },
  onSliderMove(e) { if (this._dragging) this._applyTouch(e, false); },
  onSliderEnd(e) { this._applyTouch(e, true); this._dragging = false; },
  onTickTap(e) { this.setState({ hold: Number(e.currentTarget.dataset.min) }); },

  _applyTouch(e, snap) {
    const rect = this._rect;
    if (!rect) return;
    const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (!t) return;
    let f = (t.clientX - rect.left) / rect.width;
    if (f < 0) f = 0; if (f > 1) f = 1;
    let val = posToHold(f);
    if (snap) {
      for (let i = 0; i < WAIT_SNAPS.length; i++) {
        if (Math.abs(f - WAIT_SNAPS[i].pos) <= 0.045) val = WAIT_SNAPS[i].min;
      }
    }
    if (val < 1) val = 1;
    this.setState({ hold: val });
  },
});
