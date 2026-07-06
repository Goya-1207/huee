// pages/test/test.js — 阶段 2 验证页
// 调用迁移后的 data.js / strategy.js，验证寻路 + 推荐逻辑与浏览器版一致。

const strategy = require('../../utils/strategy.js');
const data = require('../../utils/data.js');

Page({
  data: {
    // 输入
    cur: '人民广场',
    dest: '徐家汇',
    gender: 'm',
    hold: 12,
    genderOptions: ['m', 'f', 'acc'],
    genderIndex: 0,
    // 输出
    result: null,
    routeInfo: null,
    // 元数据
    stationCount: 0,
    toiletCount: 0,
    lineCount: 0,
    // 调试日志
    logs: [],
  },

  onLoad() {
    const toiletCount = data.STATIONS.reduce((n, s) => n + s.toilets.length, 0);
    this.setData({
      stationCount: data.STATIONS.length,
      toiletCount,
      lineCount: Object.keys(data.LINES).length,
    });
    this.log(`数据加载：${data.STATIONS.length} 站 / ${toiletCount} 厕所 / ${Object.keys(data.LINES).length} 线`);
    // 默认跑一次
    this.runRecommend();
  },

  log(msg) {
    const ts = new Date().toLocaleTimeString();
    this.setData({ logs: [`${ts}  ${msg}`, ...this.data.logs].slice(0, 30) });
  },

  onCurInput(e) { this.setData({ cur: e.detail.value }); },
  onDestInput(e) { this.setData({ dest: e.detail.value }); },
  onGenderChange(e) {
    this.setData({ genderIndex: Number(e.detail.value), gender: this.data.genderOptions[e.detail.value] });
  },
  onHoldChange(e) { this.setData({ hold: e.detail.value }); },

  // 快捷测试用例
  preset(e) {
    const cases = {
      rmgq_xjh: { cur: '人民广场', dest: '徐家汇', gender: 'm', hold: 12 },
      rmgq_ljz: { cur: '人民广场', dest: '陆家嘴', gender: 'f', hold: 4 },
      rmgq_only: { cur: '人民广场', dest: '', gender: 'm', hold: 30 },
      jdz_jxl: { cur: '嘉定北', dest: '锦绣路', gender: 'm', hold: 40 },
      hqs_ljz: { cur: '虹桥火车站', dest: '陆家嘴', gender: 'acc', hold: 20 },
    };
    const c = cases[e.currentTarget.dataset.id];
    if (!c) return;
    const gi = this.data.genderOptions.indexOf(c.gender);
    this.setData({
      cur: c.cur, dest: c.dest, gender: c.gender, hold: c.hold, genderIndex: gi >= 0 ? gi : 0,
    });
    this.runRecommend();
  },

  runRecommend() {
    const { cur, dest, gender, hold } = this.data;
    if (!cur) {
      wx.showToast({ title: '请输入当前站', icon: 'none' });
      return;
    }
    if (!data.byId(cur)) {
      this.log(`✗ 当前站「${cur}」不在数据中`);
      wx.showToast({ title: '当前站不存在', icon: 'none' });
      return;
    }
    if (dest && !data.byId(dest)) {
      this.log(`✗ 终点站「${dest}」不在数据中`);
      wx.showToast({ title: '终点站不存在', icon: 'none' });
      return;
    }

    const ctx = { cur, dest: dest || undefined, gender, hold: Number(hold) };
    const t0 = Date.now();
    const r = strategy.recommend(ctx);
    const dt = Date.now() - t0;
    this.log(`recommend(${cur} → ${dest || '无'} / ${gender} / ${hold}min) = ${r.strat}, ${r.list.length} 候选, ${dt}ms`);

    // 寻路信息
    let routeInfo = null;
    if (dest) {
      const route = strategy.findRoute(cur, dest);
      if (route) {
        routeInfo = {
          path: route.path.join(' → '),
          hops: route.path.length - 1,
          transfers: route.transfers.map((t) => `${t.at}(${t.fromLine}→${t.toLine})`).join(', ') || '无',
          minutes: route.cumTime[route.cumTime.length - 1],
        };
      }
    }

    // 取前 5 个候选，扁平化用于 WXML 渲染
    const top5 = r.list.slice(0, 5).map((x, i) => ({
      rank: i + 1,
      station: x.station.name,
      lines: x.station.lines.join('/'),
      desc: x.toilet.desc,
      area: x.toilet.area,
      place: x.toilet.place,
      travel: x.travelMin,
      total: x.totalMin,
      inTime: x.inTime ? '✓' : '✗',
      score: Math.round(x.score),
      tags: x.reasonTags.join(' · '),
      isCur: x.isCur,
      isDest: x.isDest,
      isTransfer: x.isTransfer,
    }));

    this.setData({
      result: {
        strat: r.strat,
        reason: r.reason,
        transferAt: r.transferAt,
        count: r.list.length,
        top5,
      },
      routeInfo,
    });
  },

  // 直接验证 findRoute
  runFindRoute() {
    const { cur, dest } = this.data;
    if (!cur || !dest) {
      wx.showToast({ title: '需要当前站+终点', icon: 'none' });
      return;
    }
    const r = strategy.findRoute(cur, dest);
    if (!r) {
      this.log(`findRoute(${cur}→${dest}) = null`);
      return;
    }
    this.log(`findRoute(${cur}→${dest}) = ${r.path.length}站 / ${r.cumTime[r.cumTime.length - 1]}min / 换乘 ${r.transfers.length}次`);
  },
});
