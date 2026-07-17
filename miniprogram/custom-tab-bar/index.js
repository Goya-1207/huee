Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/home/home', text: '首页', iconPath: '/assets/tab/tab-home.png', selectedIconPath: '/assets/tab/tab-home-on.png' },
      { pagePath: '/pages/map/map', text: '地铁图', iconPath: '/assets/tab/tab-map.png', selectedIconPath: '/assets/tab/tab-map-on.png' },
      { pagePath: '/pages/user/user', text: '我的', iconPath: '/assets/tab/tab-user.png', selectedIconPath: '/assets/tab/tab-user-on.png' },
    ],
  },
  methods: {
    onSwitch(e) {
      const { index, path } = e.currentTarget.dataset;
      if (index === this.data.selected) return;
      this.setData({ selected: index });
      wx.switchTab({ url: path });
    },
  },
});
