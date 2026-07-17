const { LINE_ORDER, LINE_COLORS, lineName, byId } = require('../../utils/data.js');
const { getProfile, updateProfile, toggleFavoriteStation, toggleFavoriteLine } = require('../../utils/profile.js');
const { icon } = require('../../utils/icon.js');

const GENDERS = [{ key: 'm', label: '男厕' }, { key: 'f', label: '女厕' }, { key: 'acc', label: '无障碍' }];
const NEEDS = [{ key: 'pee', label: '小便' }, { key: 'poop', label: '大便' }];
const HOLDS = [{ value: 2, label: '很急' }, { value: 8, label: '有点急' }, { value: 30, label: '还能等' }, { value: 120, label: '随便逛' }];

Page({
  data: { profile: null, favoriteStations: [], lineOptions: [], genders: GENDERS, needs: NEEDS, holds: HOLDS, appIcon: '' },
  onLoad() { this.setData({ appIcon: icon('drop', { color: '#0085CA', size: 48 }) }); },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 2 });
    this._refresh();
  },
  _refresh() {
    const profile = getProfile();
    const favoriteStations = profile.favoriteStations.map(byId).filter(Boolean).map((st) => ({ id: st.id, name: st.name, lineText: st.lines.map(lineName).join(' / ') }));
    const favoriteLineSet = new Set(profile.favoriteLines);
    const lineOptions = LINE_ORDER.map((line) => ({ key: line, label: lineName(line), color: LINE_COLORS[line] || '#888', on: favoriteLineSet.has(line) }));
    this.setData({ profile, favoriteStations, lineOptions });
  },
  onGenderTap(e) { updateProfile({ gender: e.currentTarget.dataset.key }); this._refresh(); },
  onNeedTap(e) { updateProfile({ need: e.currentTarget.dataset.key }); this._refresh(); },
  onHoldTap(e) { updateProfile({ hold: Number(e.currentTarget.dataset.value) }); this._refresh(); },
  onToggleLine(e) { toggleFavoriteLine(e.currentTarget.dataset.key); this._refresh(); },
  onRemoveStation(e) { toggleFavoriteStation(e.currentTarget.dataset.id); this._refresh(); },
  onFeedback() { wx.navigateTo({ url: '/pages/feedback/feedback' }); },
});
