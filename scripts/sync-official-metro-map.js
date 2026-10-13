// 下载上海地铁官方线网图及站点点击热区。用法：node scripts/sync-official-metro-map.js
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const data = require(path.join(ROOT, 'miniprogram/utils/data.js'));
const MAP_API = 'https://m.shmetro.com/interface/metromap/metromap.aspx?func=allstationsjsarray';
const SVG_URL = 'https://marketing.cyberspaceit.cn/interface/metromap/maps/linesh.svg';
let sharp;
try { sharp = require('sharp'); } catch (_) { sharp = null; }
const aliases = { '黄陂南路': '一大会址·黄陂南路', '东昌路': '浦东南路', '浦东国际机场': '浦东1号2号航站楼' };
const normalize = (name) => String(name || '').replace(/\s+/g, '').replace(/[·・]/g, '').replace(/站$/, '');
const stationIndex = new Map(data.STATIONS.map((station) => [normalize(station.name), station.id]));

async function fetchWithRetry(url, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      return response;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

async function main() {
  const [mapResponse, svgResponse] = await Promise.all([fetchWithRetry(MAP_API), fetchWithRetry(SVG_URL)]);
  const mapData = await mapResponse.json();
  const svg = await svgResponse.text();
  const stations = mapData.levels.flatMap((level) => level.locations || []).map((location, id) => {
    const stationId = data.byId(location.title)?.id || stationIndex.get(normalize(location.title)) || aliases[location.title] || '';
    return { id, stationId, name: location.title, x: Number(location.x), y: Number(location.y) };
  }).filter((station) => station.stationId && Number.isFinite(station.x) && Number.isFinite(station.y));
  const assets = path.join(ROOT, 'miniprogram/assets');
  fs.mkdirSync(assets, { recursive: true });
  if (!sharp) throw new Error('生成小程序 PNG 地图需要 sharp；请在带 sharp 的 Node 环境运行此脚本。');
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, quality: 100 }).resize({ width: 1800 }).toFile(path.join(assets, 'shmetro-official-map.png'));
  const output = `// 自动生成，来源：${MAP_API}\nmodule.exports = ${JSON.stringify({ source: '上海地铁官方线网图', fetchedAt: new Date().toISOString(), width: 2638.57, height: 3692.52, stations })};\n`;
  fs.writeFileSync(path.join(ROOT, 'miniprogram/utils/official-metro-map.js'), output, 'utf8');
  console.log(`官方线网图：${stations.length} 个站点热区 / ${new Set(stations.map((x) => x.stationId)).size} 个业务站`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
