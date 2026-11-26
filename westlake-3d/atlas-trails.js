const northTrailGuide = 'https://mdaily.hangzhou.com.cn/dskb/2026/05/17/article_detail_2_20260517A041.html';
const stepsTrailGuide = 'https://hznews.hangzhou.com.cn/wenti/content/2018-03/16/content_6822714.htm';
const ridgeEnd = '5586466192';
const segment = (way, from, to, name, note) => ({ way, from, to, name, note });
const ridge = from => segment('584423052', from, ridgeEnd, '山脊步道', '沿山脊向东到蛤蟆峰附近');
const fromChuyang = [
  segment('584423049', '5586466264', '5586466175', '初阳台附近', '沿台阶接入葛岭山脊步道'),
  ridge('5586466175')
];

export const trails = [
  {
    id: 'huanglong', name: '黄龙洞后山口', color: '#08796d', side: '西北侧',
    source: northTrailGuide,
    reference: { name: '黄龙洞牌坊', coordinates: [120.133892, 30.267017] },
    note: '实线从黄龙洞后山口起。牌坊单独标注，园内至后山口请看现场导览。',
    legs: [
      segment('589666441', '5630850890', '5586466285', '黄龙洞后山台阶', '从后山口接入上山台阶'),
      segment('584423054', '5586466285', '5586466272', '西段山路', '沿坡道与台阶接向葛岭'),
      segment('277309779', '5586466272', '5586466264'),
      ...fromChuyang
    ]
  },
  {
    id: 'qixia', name: '岳王庙·栖霞岭', color: '#6456a3', side: '西南侧',
    source: 'https://zhoujunhui.com/posts/20260201.html',
    legs: [
      segment('220971923', '2300358734', '2300358751', '栖霞岭路', '从岳王庙旁的路口向北'),
      segment('220971924', '2300358751', '2300358754', '栖霞岭登山台阶', '由街巷接上山步道'),
      segment('220971922', '2300358754', '5586466268'),
      segment('277309779', '5586466268', '5586466264'),
      ...fromChuyang
    ]
  },
  {
    id: 'geling', name: '葛岭路口', color: '#976020', side: '南侧',
    source: 'https://pic.hangzhou.com.cn/hzyx/content/content_9052353_0.html',
    legs: [
      segment('32078512', '360124964', '7308084792', '葛岭路', '从北山街与葛岭路东端路口进入'),
      segment('782582514', '7308084792', '9039334732', '葛岭坡道', '经支路接上山游步道'),
      segment('976825032', '9039334732', '5586466231', '葛岭游步道', '登上抱朴道院一带的山路'),
      ridge('5586466231')
    ]
  },
  {
    id: 'songmuchang', name: '松木场·曙光路', color: '#246ba3', side: '北侧',
    source: 'https://zhoujunhui.com/posts/20250715235526.html',
    legs: [
      segment('589666434', '5630850823', '5586466155', '松木场侧步道', '从曙光路方向进入北坡步道'),
      segment('584423047', '5586466155', '5586466176', '北坡横向步道', '沿林间小路接到山脊台阶'),
      segment('584423048', '5586466176', '5586466180'),
      ridge('5586466180')
    ]
  },
  {
    id: 'beishan', name: '保俶塔前山路', color: '#ad4f32', side: '东南侧',
    source: stepsTrailGuide,
    legs: [
      segment('706869403', '2300358790', '6642625053', '保俶塔前山路', '由北山街路口进入'),
      segment('706869404', '6642625053', '5630850000', '登山石阶', '沿台阶上行至保俶塔附近'),
      segment('589666433', '5630850000', '5586466191', '山脊游步道', '向西到蛤蟆峰附近'),
      segment('584423052', '5586466191', ridgeEnd)
    ]
  },
  {
    id: 'duanqiao', name: '断桥·宝石山下一弄', color: '#913f76', side: '东侧',
    source: 'https://you.ctrip.com/sight/hangzhou14/2028.html',
    legs: [
      segment('28538290', '13454786643', '26202730', '断桥北端', '从白堤接入北山街'),
      segment('565661262', '26202730', '13049324836', '北山街', '沿湖岸向西到上山支路'),
      segment('706912163', '13049324836', '6642625037'),
      segment('706869402', '6642625037', '6642625045', '宝石山下一弄', '经山下街巷接到宝石山造像附近'),
      segment('589666433', '6642625045', '5586466191', '保俶塔山脊步道', '经过保俶塔附近，向西走向蛤蟆峰'),
      segment('584423052', '5586466191', ridgeEnd)
    ]
  }
];

export function readTrails(roads) {
  const ways = new Map(roads.map(road => [road.id, road]));
  return trails.map(trail => {
    const legs = trail.legs.map((leg, index) => {
      const way = ways.get(leg.way);
      if (!way || !way.walk || way.tunnel) throw new Error('Missing walking route way: ' + leg.way);
      if (index && trail.legs[index - 1].to !== leg.from) throw new Error('Disconnected route: ' + trail.id);
      const from = way.nodes.indexOf(leg.from);
      const to = way.nodes.indexOf(leg.to);
      if (from < 0 || to < 0 || from === to) throw new Error('Missing route nodes: ' + leg.way);
      const start = Math.min(from, to), end = Math.max(from, to) + 1;
      const coordinates = way.c.slice(start, end);
      const nodes = way.nodes.slice(start, end);
      if (from > to) {
        coordinates.reverse();
        nodes.reverse();
      }
      return { ...leg, coordinates, nodes, stairs: way.kind === 'steps' };
    });
    return { ...trail, legs };
  });
}
