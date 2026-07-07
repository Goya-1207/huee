const { icon } = require('../../utils/icon.js');

Component({
  properties: {
    options: { type: Array, value: [] },
    value: { type: String, value: '' },
  },
  data: { items: [] },
  observers: {
    'options': function (options) {
      const items = (options || []).map((o) => ({
        key: o.key,
        label: o.label,
        color: o.color || '',
        iconOff: o.icon ? icon(o.icon, { color: '#6b7280', size: 18 }) : '',
        iconOn: o.icon ? icon(o.icon, { color: o.color ? '#ffffff' : '#1f2937', size: 18 }) : '',
      }));
      this.setData({ items });
    },
  },
  methods: {
    onTap(e) {
      const key = e.currentTarget.dataset.key;
      this.triggerEvent('change', { key });
    },
  },
});
