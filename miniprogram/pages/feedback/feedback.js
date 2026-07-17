const { addFeedback } = require('../../utils/profile.js');

Page({
  data: {
    types: ['厕所信息有误', '厕所暂停/恢复使用', '缺少厕所信息', '功能建议', '其他'],
    typeIndex: 0,
    station: '',
    content: '',
  },
  onTypeChange(e) { this.setData({ typeIndex: Number(e.detail.value) }); },
  onStationInput(e) { this.setData({ station: e.detail.value }); },
  onContentInput(e) { this.setData({ content: e.detail.value }); },
  onSubmit() {
    const content = this.data.content.trim();
    if (!content) { wx.showToast({ title: '请填写反馈内容', icon: 'none' }); return; }
    addFeedback({ type: this.data.types[this.data.typeIndex], station: this.data.station.trim(), content });
    wx.showToast({ title: '反馈已保存，感谢支持', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 700);
  },
  onBack() { wx.navigateBack(); },
});
