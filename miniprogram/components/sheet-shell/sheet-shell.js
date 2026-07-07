const { icon } = require('../../utils/icon.js');

Component({
  properties: {
    title: { type: String, value: '' },
    kicker: { type: String, value: '' },
    kickerIcon: { type: String, value: '' },
  },
  data: {
    kickerIconSrc: '',
    closeIconSrc: icon('close', { color: '#5b6470', size: 18 }),
  },
  observers: {
    kickerIcon: function (name) {
      this.setData({ kickerIconSrc: name ? icon(name, { color: '#0085CA', size: 15 }) : '' });
    },
  },
  methods: {
    noop() {},
    onClose() { this.triggerEvent('close'); },
  },
});
