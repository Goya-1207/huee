// utils/icon.js — SVG 图标 → data URI
// 浏览器版 icons.jsx 用 JSX 内联 SVG + currentColor；小程序不支持内联 SVG，
// 改为把每个图标渲染成 data:image/svg+xml URI，由 <image> 加载。
// 颜色由调用方传入（替代 currentColor），尺寸由 size 控制。

const T = {
  pin: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" stroke="{{c}}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.4" fill="{{c}}"/></svg>',
  flag: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><path d="M6 21V4" stroke="{{c}}" stroke-width="1.8" stroke-linecap="round"/><path d="M6 4.5h10.5l-2 3.5 2 3.5H6" stroke="{{c}}" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  swap: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><path d="M7 4v13m0 0l-3-3m3 3l3-3M17 20V7m0 0l-3 3m3-3l3 3" stroke="{{c}}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  walk: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><circle cx="13" cy="4.5" r="1.8" fill="{{c}}"/><path d="M13 8l-3 2 1 4m2-6l3 1.5 1 3.5m-4-5l-1.5 6L7 21m4-5l3 1 1.5 4" stroke="{{c}}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  clock: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><circle cx="12" cy="12" r="8.5" stroke="{{c}}" stroke-width="1.8"/><path d="M12 7.5V12l3 2" stroke="{{c}}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  male: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><circle cx="10" cy="14" r="5" stroke="{{c}}" stroke-width="1.8"/><path d="M14 10l5-5m0 0h-4m4 0v4" stroke="{{c}}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  female: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><circle cx="12" cy="9" r="5" stroke="{{c}}" stroke-width="1.8"/><path d="M12 14v7m-3-3h6" stroke="{{c}}" stroke-width="1.8" stroke-linecap="round"/></svg>',
  acc: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><circle cx="11" cy="4.5" r="1.8" fill="{{c}}"/><path d="M9 8v5h4l3 6m-7-11h5" stroke="{{c}}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 15a4.5 4.5 0 11-5-3.5" stroke="{{c}}" stroke-width="1.8" stroke-linecap="round"/></svg>',
  drop: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><path d="M12 3s6 6.5 6 10.5a6 6 0 01-12 0C6 9.5 12 3 12 3z" stroke="{{c}}" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  sparkle: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" stroke="{{c}}" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  home: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><path d="M4 11l8-6.5L20 11v8.5a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1V11z" stroke="{{c}}" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  map: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" stroke="{{c}}" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 4v14m6-10v14" stroke="{{c}}" stroke-width="1.8"/></svg>',
  user: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><circle cx="12" cy="8" r="4" stroke="{{c}}" stroke-width="1.8"/><path d="M4.5 20a7.5 7.5 0 0115 0" stroke="{{c}}" stroke-width="1.8" stroke-linecap="round"/></svg>',
  arrow: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><path d="M5 12h13m0 0l-5-5m5 5l-5 5" stroke="{{c}}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chevR: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><path d="M9 5l7 7-7 7" stroke="{{c}}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><path d="M6 6l12 12M18 6L6 18" stroke="{{c}}" stroke-width="2" stroke-linecap="round"/></svg>',
  near: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><circle cx="12" cy="12" r="2.5" fill="{{c}}"/><circle cx="12" cy="12" r="6" stroke="{{c}}" stroke-width="1.6" opacity="0.6"/><circle cx="12" cy="12" r="9.5" stroke="{{c}}" stroke-width="1.4" opacity="0.3"/></svg>',
  transfer: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><path d="M5 8h11m0 0l-3-3m3 3l-3 3M19 16H8m0 0l3-3m-3 3l3 3" stroke="{{c}}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  terminal: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="{{s}}" height="{{s}}"><path d="M6 20V5" stroke="{{c}}" stroke-width="1.8" stroke-linecap="round"/><path d="M6 5.5h11l-2 3 2 3H6" stroke="{{c}}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="6" cy="20" r="1.6" fill="{{c}}"/></svg>',
};

// 生成图标的 data URI。
// name: 图标键；opts.color: 描边/填充色（默认 #333）；opts.size: px 尺寸（默认 24）
function icon(name, opts) {
  const t = T[name];
  if (!t) return '';
  const c = (opts && opts.color) || '#333';
  const s = (opts && opts.size) != null ? opts.size : 24;
  const svg = t.replace(/\{\{c\}\}/g, c).replace(/\{\{s\}\}/g, s);
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

module.exports = { icon, TEMPLATES: T };
