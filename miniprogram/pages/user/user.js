const { LINE_ORDER, LINE_COLORS, lineName, byId } = require('../../utils/data.js');
const { getProfile, updateProfile, toggleFavoriteStation, toggleFavoriteLine } = require('../../utils/profile.js');
const { icon } = require('../../utils/icon.js');

const GENDERS = [{ key: 'm', label: '男厕' }, { key: 'f', label: '女厕' }, { key: 'acc', label: '无障碍' }];
const NEEDS = [{ key: 'pee', label: '小便' }, { key: 'poop', label: '大便' }];
const HOLDS = [{ value: 2, label: '很急' }, { value: 8, label: '有点急' }, { value: 30, label: '还能等' }, { value: 120, label: '随便逛' }];

Page({
  data: {
    profile: null,
    favoriteStations: [],
    lineOptions: [],
    genders: GENDERS,
    needs: NEEDS,
    holds: HOLDS,
    displayName: '点击填写昵称',
    avatarSrc: '',
    profileReady: false,
    favoriteCount: 0,
    favoriteLineCount: 0,
    feedbackCount: 0,
    currentGenderLabel: '',
    currentNeedLabel: '',
    currentHoldLabel: '',
    icons: {},
  },
  onLoad() {
    this.setData({
      avatarSrc: icon('user', { color: '#0085CA', size: 56 }),
      icons: {
        sparkle: icon('sparkle', { color: '#FFFFFF', size: 20 }),
        pin: icon('pin', { color: '#0085CA', size: 18 }),
        map: icon('map', { color: '#5F259F', size: 18 }),
        clock: icon('clock', { color: '#ED8B00', size: 18 }),
        arrow: icon('chevR', { color: '#0085CA', size: 19 }),
      },
    });
  },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 2 });
    this._refresh();
  },
  _refresh() {
    const profile = getProfile();
    const favoriteStations = profile.favoriteStations.map(byId).filter(Boolean).map((st) => ({
      id: st.id,
      name: st.name,
      lineText: st.lines.map(lineName).join(' / '),
      lines: st.lines.map((line) => ({ key: line, label: lineName(line), color: LINE_COLORS[line] || '#888' })),
    }));
    const favoriteLineSet = new Set(profile.favoriteLines);
    const lineOptions = LINE_ORDER.map((line) => ({ key: line, label: lineName(line), color: LINE_COLORS[line] || '#888', on: favoriteLineSet.has(line) }));
    const currentGender = GENDERS.find((item) => item.key === profile.gender) || GENDERS[0];
    const currentNeed = NEEDS.find((item) => item.key === profile.need) || NEEDS[0];
    const currentHold = HOLDS.find((item) => item.value === profile.hold) || HOLDS[1];
    this.setData({
      profile,
      favoriteStations,
      lineOptions,
      displayName: profile.nickname || '点击填写昵称',
      avatarSrc: profile.avatarUrl || icon('user', { color: '#0085CA', size: 56 }),
      profileReady: !!(profile.nickname && profile.avatarUrl),
      favoriteCount: favoriteStations.length,
      favoriteLineCount: profile.favoriteLines.length,
      feedbackCount: profile.feedbacks.length,
      currentGenderLabel: currentGender.label,
      currentNeedLabel: currentNeed.label,
      currentHoldLabel: currentHold.label,
    });
  },
  onChooseAvatar(e) {
    const tempFilePath = e.detail && e.detail.avatarUrl;
    if (!tempFilePath) return;
    const previous = getProfile().avatarUrl;
    wx.saveFile({
      tempFilePath,
      success: ({ savedFilePath }) => {
        updateProfile({ avatarUrl: savedFilePath });
        if (previous && previous !== savedFilePath && previous.indexOf('wxfile://') === 0) {
          wx.removeSavedFile({ filePath: previous, fail() {} });
        }
        this._refresh();
      },
      fail: () => {
        updateProfile({ avatarUrl: tempFilePath });
        this._refresh();
      },
    });
  },
  onNicknameBlur(e) {
    const nickname = String((e.detail && e.detail.value) || '').trim();
    if (nickname === getProfile().nickname) return;
    updateProfile({ nickname });
    this._refresh();
  },
  onNicknameConfirm(e) { this.onNicknameBlur(e); },
  onGenderTap(e) { updateProfile({ gender: e.currentTarget.dataset.key }); this._refresh(); },
  onNeedTap(e) { updateProfile({ need: e.currentTarget.dataset.key }); this._refresh(); },
  onHoldTap(e) { updateProfile({ hold: Number(e.currentTarget.dataset.value) }); this._refresh(); },
  onToggleLine(e) { toggleFavoriteLine(e.currentTarget.dataset.key); this._refresh(); },
  onRemoveStation(e) { toggleFavoriteStation(e.currentTarget.dataset.id); this._refresh(); },
  onGoHome() { wx.switchTab({ url: '/pages/home/home' }); },
  onFeedback() { wx.navigateTo({ url: '/pages/feedback/feedback' }); },
});
