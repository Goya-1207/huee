// pages/user/user.js - "我的"页面：数据概况 + 关于
const data = require('../../utils/data.js');
const { icon } = require('../../utils/icon.js');

Page({
  data: {
    stationCount: 0,
    toiletCount: 0,
    lineCount: 0,
    version: '1.0.0',
    appIcon: '',
  },

  onLoad() {
    const toiletCount = data.STATIONS.reduce((n, s) => n + s.toilets.length, 0);
    this.setData({
      stationCount: data.STATIONS.length,
      toiletCount,
      lineCount: Object.keys(data.LINES).length,
      appIcon: icon('drop', { color: '#0085CA', size: 48 }),
    });
  },

  onShareAppMessage() {
    return {
      title: '沪屙屙 · 上海地铁找厕所',
      path: '/pages/home/home',
    };
  },

  onCopyVersion() {
    wx.setClipboardData({ data: '沪屙屙 v' + this.data.version });
  },
});
