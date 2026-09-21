const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const miniPath = path.join(ROOT, 'miniprogram/utils/strategy.js');
const browserPath = path.join(ROOT, 'strategy.jsx');

let source = fs.readFileSync(miniPath, 'utf8').replace(/^\uFEFF/, '');
source = source.replace(
  "const { LINES, STATIONS, byId, lineName } = require('./data.js');",
  '// 浏览器版直接使用 data.jsx 注入的同名全局。'
);
source = source.replace(
  /module\.exports = \{([\s\S]*?)\n\};\s*$/,
  'Object.assign(window, {$1\n});\n'
);

fs.writeFileSync(browserPath, source, 'utf8');
console.log('Synced strategy.jsx from miniprogram/utils/strategy.js.');
