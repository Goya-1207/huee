const { LINE_COLORS, lineLabel } = require('../../utils/data.js');

Component({
  properties: {
    lines: { type: Array, value: [] },
    size: { type: Number, value: 18 },
    // 在站点列表中允许换乘线路标志在窄屏自动换行。
    wrap: { type: Boolean, value: false },
  },
  data: { dots: [] },
  observers: {
    'lines, size': function (lines, size) {
      const dots = (lines || []).map((n) => {
        const label = lineLabel(n);
        const fs = size * (String(label).length > 1 ? 0.46 : 0.56);
        return {
          key: n,
          label,
          style: 'width:' + size + 'px;height:' + size + 'px;font-size:' + fs + 'px;background:' + (LINE_COLORS[n] || '#888'),
        };
      });
      this.setData({ dots });
    },
  },
});
