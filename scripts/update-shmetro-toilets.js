const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_URL = 'https://m.shmetro.com/workspace/shmetrotest/view_stlift.aspx?';
const STATION_API = 'https://m.shmetro.com/core/shmetro/mdstationinfoback.ashx';
const OFFICIAL_LINES = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '41', '51',
];
const APP_LINES = OFFICIAL_LINES.filter((line) => line !== '51');
const FILE_LINES = {
  'data_1.jsx': ['1', '2'],
  'data_2.jsx': ['3', '4'],
  'data_3.jsx': ['5', '6'],
  'data_4.jsx': ['7', '8'],
  'data_5.jsx': ['9', '10'],
  'data_6.jsx': ['11', '12'],
  'data_7.jsx': ['13', '14', '15'],
  'data_8.jsx': ['16', '17', '18', '41'],
};

function decodeHtml(value) {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&middot;|&#183;/g, '·')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function fetchText(url, options = {}, retries = 4) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 300));
    }
  }
  throw lastError;
}

function parseStationOptions(html, sourceLine) {
  return [...html.matchAll(/<option\s+value="([^"]+)"\s*>([\s\S]*?)<\/option>/g)]
    .map((match) => ({
      code: match[1],
      name: decodeHtml(match[2].replace(/<[^>]+>/g, '').trim()),
      sourceLine,
    }));
}

function parseStationPage(html, fallback) {
  const officialName = decodeHtml(
    (html.match(/<span class="stxt">([^<]+)<\/span>/) || [])[1] || fallback.name,
  );
  const items = [];
  const itemPattern = /<div class="shvsitoiletitem">\s*<div class="shvsitoiletlft"[^>]*>([\s\S]*?)<\/div>\s*<div class="shvsitoiletrgt"[^>]*>([\s\S]*?)<\/div>/g;

  for (const match of html.matchAll(itemPattern)) {
    const lineMatch = match[1].match(/images\/line\/([^".]+)\.(?:svg|jpg)/i);
    const imageNames = [...match[2].matchAll(/images\/toilet\/([^"?]+)["?]/ig)]
      .map((image) => image[1]);
    const text = decodeHtml(match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (text) items.push({ line: lineMatch ? lineMatch[1] : null, images: imageNames, text });
  }
  return { ...fallback, officialName, items };
}

async function fetchSnapshot() {
  const lineEntries = [];
  for (const line of OFFICIAL_LINES) {
    const html = await fetchText(STATION_API, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: new URLSearchParams({ act: 'slsddl', ln: line, sc: '' }),
    });
    lineEntries.push(...parseStationOptions(html, line));
  }

  let cursor = 0;
  const pages = new Array(lineEntries.length);
  async function worker() {
    while (cursor < lineEntries.length) {
      const index = cursor;
      cursor += 1;
      const entry = lineEntries[index];
      const html = await fetchText(`${SOURCE_URL}st=${encodeURIComponent(entry.code)}`);
      pages[index] = parseStationPage(html, entry);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker));

  // 同一换乘站可能因线路代码不同返回不同厕所，必须抓取所有代码后再合并。
  const stationMap = new Map();
  for (const page of pages) {
    if (!stationMap.has(page.name)) {
      stationMap.set(page.name, {
        code: page.code,
        name: page.name,
        sourceLine: page.sourceLine,
        officialName: page.officialName,
        items: [],
      });
    }
    const station = stationMap.get(page.name);
    const seen = new Set(station.items.map((item) => `${item.line}|${item.text}|${item.images.join('+')}`));
    for (const item of page.items) {
      const key = `${item.line}|${item.text}|${item.images.join('+')}`;
      if (!seen.has(key)) {
        seen.add(key);
        station.items.push(item);
      }
    }
  }

  return {
    fetchedAt: new Date().toISOString(),
    source: SOURCE_URL,
    lineEntries,
    stations: [...stationMap.values()],
  };
}

function normalizeItem(item) {
  let place = 'out';
  let desc = item.text;
  if (desc.startsWith('费区内/外')) {
    place = 'both';
    desc = desc.slice('费区内/外'.length);
  } else if (desc.startsWith('费区内')) {
    place = 'in';
    desc = desc.slice('费区内'.length);
  } else if (desc.startsWith('费区外')) {
    place = 'out';
    desc = desc.slice('费区外'.length);
  } else if (desc.startsWith('车站外')) {
    place = 'outside';
    desc = desc.slice('车站外'.length);
  }
  const accessible = item.images.some((image) => /^w_(?:i|o|io)\.png$/i.test(image));
  return [place, accessible ? 1 : 0, desc.trim()];
}

function buildRawLines(snapshot) {
  const stationMap = new Map(snapshot.stations.map((station) => [station.name, station]));
  const rawLines = {};
  for (const line of APP_LINES) {
    const rows = [];
    const entries = snapshot.lineEntries.filter((entry) => entry.sourceLine === line);
    for (const entry of entries) {
      const station = stationMap.get(entry.name);
      if (!station) throw new Error(`缺少站点详情：${line}号线 ${entry.name}`);
      const items = station.items.filter((item) => item.line === line);
      if (!items.length) throw new Error(`缺少厕所记录：${line}号线 ${entry.name}`);
      for (const item of items) rows.push([entry.name, ...normalizeItem(item)]);
    }
    rawLines[line === '41' ? 'pj' : line] = rows;
  }
  return rawLines;
}

function rowsSource(rows, indent = '') {
  return rows.map((row) => `${indent}${JSON.stringify(row)},`).join('\n');
}

function writeBrowserSources(rawLines, date) {
  for (const [file, lines] of Object.entries(FILE_LINES)) {
    const sections = lines.map((officialLine) => {
      const key = officialLine === '41' ? 'pj' : officialLine;
      const jsKey = key === 'pj' ? "'pj'" : key;
      const title = key === 'pj' ? '浦江线' : `${key}号线`;
      return `// ${title}\nwindow.__metro.addLine(${jsKey}, [\n${rowsSource(rawLines[key], '  ')}\n]);`;
    });
    fs.writeFileSync(path.join(ROOT, file), `${sections.join('\n\n')}\n`, 'utf8');
  }

  const corePath = path.join(ROOT, 'data_0.jsx');
  const core = fs.readFileSync(corePath, 'utf8').replace(
    /厕所数据基线：上海地铁运营服务官网车站接口，核验日期 \d{4}-\d{2}-\d{2}。/,
    `厕所数据基线：上海地铁运营服务官网车站接口，核验日期 ${date}。`,
  );
  fs.writeFileSync(corePath, core, 'utf8');
}

function writeMiniProgramRaw(rawLines, date) {
  const file = path.join(ROOT, 'miniprogram', 'utils', 'data.js');
  let source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf('const RAW_LINES = {');
  const marker = source.indexOf('// 把 RAW_LINES 构建成 App 使用的', start);
  if (start < 0 || marker < 0) throw new Error('无法定位 miniprogram/utils/data.js 的 RAW_LINES');

  const entries = Object.entries(rawLines).map(([key, rows]) => {
    const jsKey = key === 'pj' ? 'pj' : key;
    return `  ${jsKey}: [\n${rowsSource(rows, '    ')}\n  ],`;
  });
  const rawSource = `const RAW_LINES = {\n${entries.join('\n')}\n};\n\n`;
  source = `${source.slice(0, start)}${rawSource}${source.slice(marker)}`.replace(
    /厕所数据基线：上海地铁运营服务官网车站接口，核验日期 \d{4}-\d{2}-\d{2}。/,
    `厕所数据基线：上海地铁运营服务官网车站接口，核验日期 ${date}。`,
  );
  fs.writeFileSync(file, source, 'utf8');
}

function parseArgs(argv) {
  const args = { apply: false, snapshot: '' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--apply') args.apply = true;
    else if (argv[i] === '--snapshot') args.snapshot = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const loadedSnapshot = args.snapshot
    ? JSON.parse(fs.readFileSync(path.resolve(args.snapshot), 'utf8'))
    : await fetchSnapshot();
  // 快照只保留生成数据库需要的标准化结果，不保存 530 份重复页面解析结果。
  const snapshot = {
    fetchedAt: loadedSnapshot.fetchedAt,
    source: loadedSnapshot.source,
    lineEntries: loadedSnapshot.lineEntries,
    stations: loadedSnapshot.stations,
  };
  const date = snapshot.fetchedAt.slice(0, 10);
  const rawLines = buildRawLines(snapshot);
  const snapshotDir = path.join(ROOT, 'data_sources');
  fs.mkdirSync(snapshotDir, { recursive: true });
  fs.writeFileSync(
    path.join(snapshotDir, 'shmetro-toilets.json'),
    `${JSON.stringify(snapshot, null, 2)}\n`,
    'utf8',
  );

  if (args.apply) {
    writeBrowserSources(rawLines, date);
    writeMiniProgramRaw(rawLines, date);
  }

  const rowCount = Object.values(rawLines).reduce((total, rows) => total + rows.length, 0);
  const airportRecords = snapshot.stations
    .flatMap((station) => station.items)
    .filter((item) => item.line === '51').length;
  console.log(`上海地铁官方快照：${snapshot.stations.length} 站 / ${rowCount} 条当前 App 线路记录`);
  console.log(`市域机场线另有 ${airportRecords} 条记录，已保留在快照中，未写入当前地铁线路拓扑。`);
  if (!args.apply) console.log('仅保存快照；传入 --apply 才会更新项目数据源。');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
