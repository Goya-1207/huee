// app.js — 小程序入口
// 阶段 1-2：仅做数据层预热与自检，UI 留待阶段 3 实现
App({
  onLaunch() {
    const data = require('./utils/data.js');
    const toiletCount = data.STATIONS.reduce((n, s) => n + s.toilets.length, 0);
    console.log(
      `[沪屙屙] 数据构建完成：${data.STATIONS.length} 站 / ${toiletCount} 个厕所 / ${Object.keys(data.LINES).length} 条线路`
    );

    // 自检：跑一次寻路 + 推荐，确认迁移后逻辑正常
    const strategy = require('./utils/strategy.js');
    const r = strategy.findRoute('人民广场', '徐家汇');
    console.log('[沪屙屙] 自检 findRoute 人民广场→徐家汇:', r ? `${r.path.length} 站, ${r.cumTime[r.cumTime.length - 1]} 分钟` : '失败');

    const rec = strategy.recommend({ cur: '人民广场', dest: '徐家汇', gender: 'm', hold: 12 });
    console.log(`[沪屙屙] 自检 recommend: 策略=${rec.strat}, 候选=${rec.list.length} 个, 榜首=${rec.list[0] ? rec.list[0].station.name + ' / ' + rec.list[0].totalMin + 'min' : '无'}`);
  },
  globalData: {
    userInfo: null
  }
});
