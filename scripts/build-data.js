const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCES = [
  'data_0.jsx',
  'data_1.jsx',
  'data_2.jsx',
  'data_3.jsx',
  'data_4.jsx',
  'data_5.jsx',
  'data_6.jsx',
  'data_7.jsx',
  'data_8.jsx',
  'data_build.jsx',
];

const sections = SOURCES.map((file) => {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/^\uFEFF/, '').trimEnd();
  return `// ╭─── ${file} ───╮\n${content}`;
});

const output = [
  '// ═══ 沪屙屙 合并数据文件（自动拼接，勿手改单条；改 data_N 源后运行 node scripts/build-data.js）═══',
  '',
  ...sections.flatMap((section) => [section, '']),
].join('\n');

fs.writeFileSync(path.join(ROOT, 'data.jsx'), output, 'utf8');
console.log(`Generated data.jsx from ${SOURCES.length} source files.`);
