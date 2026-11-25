// Store coordinates are the source POIs converted from the domestic map grid.
// Keep the branch-specific source with its price, rating and opening-hour snapshot.
const restaurants = [
  {
    id: 'dining-grandmas-in77', name: '外婆家（湖滨银泰 in77 C 区店）', sector: '湖滨商圈', region: '湖滨与解放路',
    c: [120.1603136, 30.2555049], page: '14/5148863',
    summary: '湖滨商场里的杭帮家常菜，门店在 C1 区二楼。',
    dining: {
      label: '外婆家 · in77', cuisine: '杭帮菜', price: 54, rating: 4.6, reviews: 608,
      address: '延安路258号湖滨银泰 in77 C1 区 2F209', hours: '10:00–21:30'
    }
  },
  {
    id: 'dining-grandmas-yongjin', name: '外婆家（西湖天地涌金店）', sector: '南山路 · 涌金', region: '南山路与雷峰塔',
    c: [120.1540602, 30.248676], page: '465/17026965',
    summary: '南山路西湖天地的家常杭帮菜，可与钱王祠或柳浪闻莺安排在同一段行程。',
    dining: {
      label: '外婆家 · 涌金', cuisine: '杭帮菜', price: 85, rating: 4.5, reviews: 146,
      address: '南山路147号西湖天地2A号楼', hours: '10:00–21:00'
    }
  },
  {
    id: 'dining-green-tea', name: '绿茶餐厅（龙井船宴·品牌总店）', sector: '龙井路 · 双峰', region: '灵隐、植物园与龙井',
    c: [120.1189801, 30.2345423], page: '87/4927384',
    summary: '龙井路的绿茶品牌总店，主营杭帮菜，靠近双峰公交站。',
    dining: {
      label: '绿茶 · 龙井', cuisine: '杭帮菜', price: 88, rating: 4.7, reviews: 937,
      address: '龙井路83号（浙江宾馆后门斜对面）', hours: '10:30–21:00'
    }
  },
  {
    id: 'dining-louwailou', name: '楼外楼（孤山路店）', sector: '孤山 · 白堤西侧', region: '北山街与孤山',
    c: [120.1359713, 30.2525465], page: '100065/240869',
    summary: '孤山南麓的杭帮菜老字号，沿孤山路可往平湖秋月。',
    dining: {
      label: '楼外楼', cuisine: '杭帮菜', price: 147, rating: 4.3, reviews: 1850,
      address: '孤山路30号（近平湖秋月）', hours: '10:30–14:00、16:30–20:30'
    }
  },
  {
    id: 'dining-yifang', name: '意坊（西湖大道店）', sector: '西湖大道 · 定安路', region: '吴山与清河坊',
    c: [120.1612541, 30.2486456], page: '14/22406268',
    summary: '西湖大道历史建筑里的意式餐厅，靠近定安路地铁站。',
    dining: {
      label: '意坊', cuisine: '意大利菜', price: 204, rating: 4.3, reviews: 14,
      address: '西湖大道224–230号', hours: '11:30–14:00、14:30–16:30、17:00–21:00'
    }
  },
  {
    id: 'dining-xinxin-1913', name: '杭州新新饭店·1913餐厅', sector: '北山街 · 葛岭', region: '北山街与孤山',
    c: [120.1394738, 30.2583241], page: '101/5546454',
    summary: '北山街新新饭店内的临湖餐厅，主营杭帮菜，靠近葛岭。',
    dining: {
      label: '新新饭店 · 1913', cuisine: '杭帮菜', price: 333, rating: 4.6, reviews: 174,
      address: '北山街56–60号（新新饭店内）', hours: '11:00–14:00、17:00–21:00'
    }
  },
  {
    id: 'dining-ziwei', name: '西湖国宾馆·紫薇厅', sector: '杨公堤 · 丁家山', region: '杨公堤、茅家埠与三台山',
    c: [120.1282724, 30.2374419], page: '2026903/5141665',
    summary: '杨公堤西湖国宾馆内的江浙菜餐厅，餐厅在宾馆8号楼。',
    dining: {
      label: '国宾馆 · 紫薇厅', cuisine: '江浙菜', price: 468, rating: 4.8, reviews: 310,
      address: '杨公堤18号西湖国宾馆8号楼', hours: '11:00–14:00、17:00–22:00'
    }
  },
  {
    id: 'dining-xinfeng', name: '新丰小吃（庆春路店）', sector: '庆春路 · 凤起路', region: '湖滨与解放路',
    c: [120.1597152, 30.2603403], page: '14/5140637',
    summary: '庆春路的杭州小吃店，有小笼、馄饨等简餐。',
    dining: {
      label: '新丰小吃', cuisine: '杭州小吃', price: 18, rating: 4.4, reviews: 174,
      address: '杭州市庆春路209号天阳明珠商业中心1-2层', hours: '05:00–20:30'
    }
  },
  {
    id: 'dining-kuiyuan', name: '奎元馆（解放路店）', sector: '解放路 · 丰乐桥', region: '湖滨与解放路',
    c: [120.1653795, 30.2531354], page: '100065/253643',
    summary: '解放路老字号面馆，菜单有虾爆鳝面和片儿川。',
    dining: {
      label: '奎元馆', cuisine: '杭州面食', price: 60, rating: 4.6, reviews: 1164,
      address: '杭州市解放路154号（距离西湖直线距离600米）', hours: '07:00–21:00'
    }
  },
  {
    id: 'dining-zhwg', name: '知味观（湖滨总店）', sector: '仁和路 · 湖滨', region: '湖滨与解放路',
    c: [120.1584803, 30.2549149], page: '14/80292139',
    summary: '仁和路总店提供杭帮正餐、点心和小吃。',
    dining: {
      label: '知味观 · 湖滨', cuisine: '杭帮菜与点心', price: 82, rating: 4.2, reviews: 19,
      address: '杭州市仁和路83号', hours: '07:30–21:00'
    }
  },
  {
    id: 'dining-ouxiang', name: '雷峰塔·藕香居餐厅', sector: '南山路 · 净寺', region: '南山路与雷峰塔',
    c: [120.143311, 30.2326874], page: '14/17019564',
    summary: '门店在雷峰塔景区出口旁，从南山路可到。',
    dining: {
      label: '藕香居', cuisine: '杭帮菜', price: 115, rating: 3.5, reviews: 73,
      address: '南山路11号雷峰塔景区出口旁（无需进入雷峰塔）', hours: '11:00–14:00、17:00–19:30'
    }
  },
  {
    id: 'dining-golden-silk', name: '杭州香格里拉饭店·金丝·听海', sector: '北山街 · 栖霞岭', region: '北山街与孤山',
    c: [120.1334814, 30.2558573], page: '14/151724952',
    summary: '北山街香格里拉饭店内，主营浙东沿海菜。',
    dining: {
      label: '金丝 · 听海', cuisine: '浙东海鲜', price: 518, rating: 4.6, reviews: 5,
      address: '北山街78号杭州香格里拉饭店·水知心居一楼', hours: '11:00–13:30、17:00–20:30'
    }
  },
  {
    id: 'dining-shanwaishan', name: '山外山菜馆（玉泉路店）', sector: '玉泉路 · 植物园', region: '灵隐、植物园与龙井',
    c: [120.1160796, 30.2583573], page: '0/5140558',
    summary: '杭州植物园北门内的杭帮菜馆。',
    dining: {
      label: '山外山', cuisine: '杭帮菜', price: 138, rating: 4.5, reviews: 410,
      address: '杭州市西湖街道玉泉路8号植物园北门内（近玉古路）', hours: '10:30–14:00、16:30–20:30'
    }
  },
  {
    id: 'dining-shusheng', name: '殊胜·茶园餐厅（灵隐店）', sector: '龙井路 · 杭州花圃', region: '灵隐、植物园与龙井',
    c: [120.1178713, 30.2481396], page: '0/110396640',
    summary: '龙井路2号的茶园餐厅，对面是杭州花圃西门。',
    dining: {
      label: '殊胜茶园餐厅', cuisine: '杭帮菜', price: 100, rating: 4.8, reviews: 19,
      address: '杭州市龙井路2号（杭州花圃西门正对面）', hours: '11:30–13:30、17:00–20:30'
    }
  },
  {
    id: 'dining-charencun', name: '茶人村（西湖龙井店）', sector: '龙井路 · 茶园', region: '灵隐、植物园与龙井',
    c: [120.1152511, 30.230468], page: '14/5552917',
    summary: '龙井路99号的杭帮菜馆，菜单有西湖醋鱼和东坡肉。',
    dining: {
      label: '茶人村', cuisine: '杭帮菜', price: 123, rating: 4.9, reviews: 356,
      address: '杭州市龙井路99号', hours: '11:00–14:30、16:30–20:30'
    }
  },
  {
    id: 'dining-xiangjiulin', name: '香九邻', sector: '龙井路 · 上茅家埠', region: '杨公堤、茅家埠与三台山',
    c: [120.1170686, 30.2413715], page: '14/5553100',
    summary: '上茅家埠的家常菜馆。',
    dining: {
      label: '香九邻', cuisine: '杭帮菜', price: 76, rating: 3, reviews: 6,
      address: '龙井路上茅家埠157号', hours: '09:00–20:00'
    }
  },
  {
    id: 'dining-shuyange', name: '疏烟阁', sector: '赵公堤 · 曲院风荷', region: '杨公堤、茅家埠与三台山',
    c: [120.1253843, 30.2501538], page: '14/133867012',
    summary: '赵公堤1号，靠近曲院风荷3号门。',
    dining: {
      label: '疏烟阁', cuisine: '杭帮菜', price: 256, rating: 4.8, reviews: 5,
      address: '杨公堤赵公堤1号（曲院风荷3号门斜对面）', hours: '10:30–21:00'
    }
  },
  {
    id: 'dining-jiaoshe', name: '椒舍小馆', sector: '三台山路 · 乌龟潭', region: '杨公堤、茅家埠与三台山',
    c: [120.1266572, 30.232718], page: '11/130111172',
    summary: '三台山路的小馆，以现炒家常菜为主。',
    dining: {
      label: '椒舍小馆', cuisine: '农家菜', price: 93, rating: 4.2, reviews: 5,
      address: '三台山路176号（木木咖啡旁）', hours: '11:00–14:00、16:00–21:00'
    }
  },
  {
    id: 'dining-yaguquan', name: '雅谷泉山庄·青花咖啡厅', sector: '三台山路 · 雅谷泉', region: '杨公堤、茅家埠与三台山',
    c: [120.1281103, 30.2273617], page: '9/15635911',
    summary: '三台山路雅谷泉山庄内的餐厅。',
    dining: {
      label: '雅谷泉 · 青花', cuisine: '酒店餐厅', price: 127, rating: 4.6, reviews: 9,
      address: '西湖区三台山路147号', hours: '11:00–14:00、17:00–20:30'
    }
  },
  {
    id: 'dining-madeng', name: '马灯部落（虎跑动物园店）', sector: '虎跑路 · 四眼井', region: '满觉陇与虎跑',
    c: [120.1334117, 30.2186511], page: '100065/7082498',
    summary: '四眼井的创意杭帮菜馆，靠近杭州动物园。',
    dining: {
      label: '马灯部落', cuisine: '创意杭帮菜', price: 92, rating: 4.8, reviews: 267,
      address: '虎跑路四眼井238号', hours: '10:30–14:00、16:00–21:00'
    }
  },
  {
    id: 'dining-guiyu', name: '桂语山房（满觉陇店）', sector: '满觉陇路 · 五老峰隧道', region: '满觉陇与虎跑',
    c: [120.1253869, 30.2212999], page: '14/5142462',
    summary: '满觉陇路的庭院餐厅，提供创意杭帮菜。',
    dining: {
      label: '桂语山房', cuisine: '创意杭帮菜', price: 638, rating: 4.7, reviews: 304,
      address: '杭州西湖区西湖街道满觉陇路2-1号(近五老峰隧道)', hours: '10:30–14:00、16:30–21:00'
    }
  },
  {
    id: 'dining-shengjian', name: '咬不得高祖生煎（高银街店）', sector: '高银街 · 清河坊', region: '吴山与清河坊',
    c: [120.1664768, 30.2431642], page: '14/253653',
    summary: '高银街的生煎简餐店，靠近南宋御街。',
    dining: {
      label: '咬不得高祖生煎', cuisine: '生煎简餐', price: 21, rating: 4.5, reviews: 1184,
      address: '高银街22-30号(近中山中路)', hours: '07:00–21:30'
    }
  },
  {
    id: 'dining-yangtang', name: '羊汤饭店（中山中路店）', sector: '中山中路 · 河坊街口', region: '吴山与清河坊',
    c: [120.1664246, 30.242374], page: '14/5140612',
    summary: '中山中路与河坊街交会处的羊汤老店。',
    dining: {
      label: '羊汤饭店', cuisine: '羊汤与小吃', price: 42, rating: 4.9, reviews: 238,
      address: '中山中路64号(河坊街口)', hours: '07:00–21:00'
    }
  },
  {
    id: 'dining-huangfan', name: '皇饭儿（高银街总店）', sector: '高银街 · 吴山', region: '吴山与清河坊',
    c: [120.1654433, 30.2429263], page: '14/4927389',
    summary: '高银街总店，菜单有乾隆鱼头等杭帮菜。',
    dining: {
      label: '皇饭儿 · 高银街', cuisine: '杭帮菜', price: 93, rating: 4.3, reviews: 219,
      address: '高银街53-57号', hours: '11:00–14:00、16:30–21:00'
    }
  },
  {
    id: 'dining-huijuan', name: '慧娟面馆（望江路店）', sector: '望江路 · 望江门', region: '吴山与清河坊',
    c: [120.1714653, 30.2394392], page: '0/5140550',
    summary: '望江路老面馆，有片儿川和拌川。',
    dining: {
      label: '慧娟面馆', cuisine: '杭州面食', price: 45, rating: 4.3, reviews: 607,
      address: '杭州市望江路132号', hours: '08:00–14:30、16:00–次日03:00'
    }
  },
  {
    id: 'dining-fuyuan', name: '福缘居酒楼（河坊街店）', sector: '河坊街 · 江城路', region: '吴山与清河坊',
    c: [120.1720013, 30.2413104], page: '14/7082456',
    summary: '河坊街35号的家常杭帮菜馆，靠近江城路地铁站。',
    dining: {
      label: '福缘居', cuisine: '杭帮菜', price: 104, rating: 4.2, reviews: 71,
      address: '杭州市河坊街35号（杭州市机动车驾驶员考试服务中心旁）', hours: '11:00–14:00、16:30–21:00'
    }
  },
  {
    id: 'dining-fanglaoda', name: '方老大面', sector: '江城路 · 望江门', region: '吴山与清河坊',
    c: [120.1714698, 30.2380327], page: '2015167/18657230',
    summary: '江城路面馆，菜单有拌川和片儿川。',
    dining: {
      label: '方老大面', cuisine: '杭州面食', price: 49, rating: 4.5, reviews: 42,
      address: '杭州市江城路629号', hours: '07:00–20:00'
    }
  },
  {
    id: 'dining-sumian', name: '苏面坊（黄龙饭店店）', sector: '曙光路 · 松木场', region: '黄龙与松木场',
    c: [120.1387995, 30.2691739], page: '14/25046288',
    summary: '黄龙饭店南大堂内的苏式面馆。',
    dining: {
      label: '苏面坊', cuisine: '苏式面点', price: 128, rating: 4.8, reviews: 5,
      address: '杭州市西湖区曙光路120号1幢杭州黄龙饭店南大堂A-2区域', hours: '10:00–14:30、17:00–21:00'
    }
  }
];

export const diningPlaces = restaurants.map(({page, ...place}) => ({
  ...place, kind: '餐厅', distance: .65,
  source: 'https://gs.ctrip.com/html5/you/foods/fooddetail/' + page + '.html'
}));
