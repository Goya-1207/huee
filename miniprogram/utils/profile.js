// 本地个人资料与收藏。当前项目离线运行，因此所有资料仅保存在用户设备的微信存储中。
const KEY = 'userProfile';
const DEFAULT_PROFILE = {
  gender: 'm',
  need: 'pee',
  hold: 8,
  favoriteStations: [],
  favoriteLines: [],
  feedbacks: [],
  updatedAt: 0,
};

function normalize(raw) {
  const p = Object.assign({}, DEFAULT_PROFILE, raw || {});
  p.favoriteStations = Array.isArray(p.favoriteStations) ? [...new Set(p.favoriteStations)] : [];
  p.favoriteLines = Array.isArray(p.favoriteLines) ? [...new Set(p.favoriteLines)] : [];
  p.feedbacks = Array.isArray(p.feedbacks) ? p.feedbacks : [];
  p.hold = Number(p.hold) || DEFAULT_PROFILE.hold;
  return p;
}

function getProfile() { return normalize(wx.getStorageSync(KEY)); }
function saveProfile(profile) {
  const next = normalize(profile);
  next.updatedAt = Date.now();
  wx.setStorageSync(KEY, next);
  return next;
}
function updateProfile(patch) { return saveProfile(Object.assign({}, getProfile(), patch)); }
function toggleFavoriteStation(id) {
  const p = getProfile();
  const set = new Set(p.favoriteStations);
  if (set.has(id)) set.delete(id); else set.add(id);
  return saveProfile(Object.assign({}, p, { favoriteStations: [...set] }));
}
function toggleFavoriteLine(line) {
  const p = getProfile();
  const set = new Set(p.favoriteLines);
  if (set.has(line)) set.delete(line); else set.add(line);
  return saveProfile(Object.assign({}, p, { favoriteLines: [...set] }));
}
function addFeedback(feedback) {
  const p = getProfile();
  const entry = Object.assign({ id: String(Date.now()), createdAt: Date.now(), status: 'local' }, feedback);
  return saveProfile(Object.assign({}, p, { feedbacks: [entry, ...p.feedbacks].slice(0, 20) }));
}

module.exports = { getProfile, saveProfile, updateProfile, toggleFavoriteStation, toggleFavoriteLine, addFeedback };
