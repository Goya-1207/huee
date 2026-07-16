// utils/location.js - 定位工具：wx.getLocation + 最近车站查找
// 坐标系：GCJ-02（与小程序 <map> 腾讯底图、metro-geo.js 一致，无需纠偏）

const geo = require('./metro-geo.js');

// Haversine 球面距离（米）
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 在 metro-geo markers 中找离 (lat, lng) 最近的车站
function findNearestStation(lat, lng) {
  let best = null, bestDist = Infinity;
  for (const m of geo.markers) {
    const d = haversine(lat, lng, m.latitude, m.longitude);
    if (d < bestDist) { bestDist = d; best = m; }
  }
  return best
    ? { stationId: best.stationId, name: best.name, distance: Math.round(bestDist), hub: best.hub }
    : null;
}

// 调用 wx.getLocation({type:'gcj02'}) -> 找最近车站 -> Promise<result>
// maxDistance 用于避免用户离上海地铁极远时仍被错误地指向某个站点。
function locateAndPick({ maxDistance = Infinity } = {}) {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const nearest = findNearestStation(res.latitude, res.longitude);
        if (nearest && nearest.distance <= maxDistance) resolve(nearest);
        else if (nearest) {
          const err = new Error('附近没有可用地铁站');
          err.code = 'OUT_OF_RANGE';
          reject(err);
        }
        else reject(new Error('附近无地铁站点'));
      },
      fail: (err) => reject(err),
    });
  });
}

module.exports = { haversine, findNearestStation, locateAndPick };
