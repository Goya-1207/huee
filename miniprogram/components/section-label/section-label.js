const { icon } = require('../../utils/icon.js');

Component({
  properties: {
    icon: { type: String, value: '' },
    label: { type: String, value: '' },
    hint: { type: String, value: '' },
    color: { type: String, value: '#6b7280' },
  },
  data: { iconSrc: '' },
  observers: {
    'icon, color': function (iconName, color) {
      this.setData({ iconSrc: iconName ? icon(iconName, { color, size: 16 }) : '' });
    },
  },
});
