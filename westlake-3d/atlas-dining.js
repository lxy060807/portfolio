// Store coordinates are the source POIs converted from the domestic map grid.
// Keep the branch-specific source with its price, rating and opening-hour snapshot.
const restaurants = [
  {
    id: 'dining-grandmas-in77', name: '外婆家（湖滨银泰 in77 C 区店）', sector: '湖滨商圈',
    c: [120.1603136, 30.2555049], page: '14/5148863',
    summary: '湖滨商场里的杭帮家常菜，门店在 C1 区二楼。',
    dining: {
      label: '外婆家 · in77', cuisine: '杭帮菜', price: 54, rating: 4.6, reviews: 608,
      address: '延安路258号湖滨银泰 in77 C1 区 2F209', hours: '10:00–21:30'
    }
  },
  {
    id: 'dining-grandmas-yongjin', name: '外婆家（西湖天地涌金店）', sector: '南山路 · 涌金',
    c: [120.1540602, 30.248676], page: '465/17026965',
    summary: '南山路西湖天地的家常杭帮菜，可与钱王祠或柳浪闻莺安排在同一段行程。',
    dining: {
      label: '外婆家 · 涌金', cuisine: '杭帮菜', price: 85, rating: 4.5, reviews: 146,
      address: '南山路147号西湖天地2A号楼', hours: '10:00–21:00'
    }
  },
  {
    id: 'dining-green-tea', name: '绿茶餐厅（龙井船宴·品牌总店）', sector: '龙井路 · 双峰',
    c: [120.1189801, 30.2345423], page: '87/4927384',
    summary: '龙井路的绿茶品牌总店，主营杭帮菜，靠近双峰公交站。',
    dining: {
      label: '绿茶 · 龙井', cuisine: '杭帮菜', price: 88, rating: 4.7, reviews: 937,
      address: '龙井路83号（浙江宾馆后门斜对面）', hours: '10:30–21:00'
    }
  },
  {
    id: 'dining-louwailou', name: '楼外楼（孤山路店）', sector: '孤山 · 白堤西侧',
    c: [120.1359713, 30.2525465], page: '100065/240869',
    summary: '孤山南麓的杭帮菜老字号，沿孤山路可往平湖秋月。',
    dining: {
      label: '楼外楼', cuisine: '杭帮菜', price: 147, rating: 4.3, reviews: 1850,
      address: '孤山路30号（近平湖秋月）', hours: '10:30–14:00、16:30–20:30'
    }
  },
  {
    id: 'dining-yifang', name: '意坊（西湖大道店）', sector: '西湖大道 · 定安路',
    c: [120.1612541, 30.2486456], page: '14/22406268',
    summary: '西湖大道历史建筑里的意式餐厅，靠近定安路地铁站。',
    dining: {
      label: '意坊', cuisine: '意大利菜', price: 204, rating: 4.3, reviews: 14,
      address: '西湖大道224–230号', hours: '11:30–14:00、14:30–16:30、17:00–21:00'
    }
  },
  {
    id: 'dining-xinxin-1913', name: '杭州新新饭店·1913餐厅', sector: '北山街 · 葛岭',
    c: [120.1394738, 30.2583241], page: '101/5546454',
    summary: '北山街新新饭店内的临湖餐厅，主营杭帮菜，靠近葛岭。',
    dining: {
      label: '新新饭店 · 1913', cuisine: '杭帮菜', price: 333, rating: 4.6, reviews: 174,
      address: '北山街56–60号（新新饭店内）', hours: '11:00–14:00、17:00–21:00'
    }
  },
  {
    id: 'dining-ziwei', name: '西湖国宾馆·紫薇厅', sector: '杨公堤 · 丁家山',
    c: [120.1282724, 30.2374419], page: '2026903/5141665',
    summary: '杨公堤西湖国宾馆内的江浙菜餐厅，餐厅在宾馆8号楼。',
    dining: {
      label: '国宾馆 · 紫薇厅', cuisine: '江浙菜', price: 468, rating: 4.8, reviews: 310,
      address: '杨公堤18号西湖国宾馆8号楼', hours: '11:00–14:00、17:00–22:00'
    }
  }
];

export const diningPlaces = restaurants.map(({page, ...place}) => ({
  ...place, kind: '餐厅', region: '西湖周边餐厅', distance: .65,
  source: 'https://gs.ctrip.com/html5/you/foods/fooddetail/' + page + '.html'
}));
