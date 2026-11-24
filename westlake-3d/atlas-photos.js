const commons = 'https://commons.wikimedia.org/wiki/File:';
const localPhoto = key => globalThis.WESTLAKE_EMBEDDED_PHOTOS?.[key] ?? './photos/' + key + '.jpg';

function photo(key, title, caption, author, license, width, height, position) {
  const source = commons + encodeURIComponent(title.replaceAll(' ', '_'));
  const licensePath = license === 'CC0 1.0' ? 'publicdomain/zero/1.0'
    : 'licenses/' + license.toLowerCase().replace('cc ', '').replace(' ', '/');
  return {
    src: localPhoto(key), thumb: localPhoto(key + '-thumb'), caption, author, license, width, height, position,
    source,
    licenseUrl: license === 'Public domain' ? source + '#Licensing' : 'https://creativecommons.org/' + licensePath + '/'
  };
}

export const photoGalleries = {
  sudi: [
    photo("su-lake", "Su Causeway, West Lake.jpg", "苏堤的林荫长道", "钉钉", "CC BY-SA 4.0", 1800, 976, "center 52%"),
    photo("su-arch", "KuaHongBridge WestLake.jpg", "跨虹桥的石栏题刻", "Farm", "CC BY 3.0", 1524, 1016, "center 58%"),
    photo("su-north", "Su Causeway near West Lake, looking towards north 20120529 1.jpg", "沿苏堤向北望", "DXR（Daniel Vorndran）", "CC BY-SA 4.0", 1800, 1122, "center 55%"),
    photo("su", "20250715 Su Di.jpg", "苏堤北段的林荫步道", "Yumeto", "CC BY-SA 4.0", 1800, 1350, "center 60%")
  ],
  baidi: [
    photo("bai-overlook", "Huanglong & Broken Bridge - Hangzhou City & West Lake w Bai Causeway.jpg", "从宝石山俯瞰白堤", "CatOnMars", "CC BY 4.0", 1800, 1200, "center 68%"),
    photo("bai-walk", "Bai Causeway.jpg", "白堤步道与湖岸", "钉钉", "CC BY-SA 4.0", 1800, 1350, "center 59%"),
    photo("bai", "West Lake 2025.06 03.jpg", "从湖上看白堤与宝石山", "Shujianyang", "CC BY-SA 4.0", 1800, 1012, "center 63%")
  ],
  moon: [
    photo("moon", "West Lake, Hangzhou, China.jpg", "三潭印月石塔近景", "ChiralJon", "CC BY 2.0", 1800, 1195, "center 52%"),
    photo("moon-towers", "Three Ponds Mirroring the Moon With Leifeng Pagoda.jpg", "湖中石塔与远处的雷峰塔", "Lucy Liu", "CC BY 2.0", 500, 375, "center 59%"),
    photo("moon-aerial", "West Lake DJI 0605 (2).jpg", "航拍小瀛洲周边水域", "David290", "CC BY-SA 4.0", 1800, 1350, "center 50%"),
    photo("moon-garden", "Three Pools Mirroring the Moon-pool.JPG", "逆光中的湖上石塔", "Shizhao", "CC BY-SA 3.0", 1800, 1350, "center 52%")
  ],
  leifeng: [
    photo("leifeng-hill", "Huanglong & Broken Bridge - Leifeng Pagoda.jpg", "隔外西湖望夕照山上的雷峰塔", "CatOnMars", "CC BY 4.0", 1800, 1188, "center 55%"),
    photo("leifeng", "West Lake Leifeng Pagoda.jpg", "隔湖望雷峰塔", "饮冰室客人", "CC BY-SA 4.0", 1800, 1350, "center 51%"),
    photo("leifeng-lake", "2014.11.21.113309 Leifeng Pagoda Three Pools Mirroring the Moon Xihu Hangzhou.jpg", "从小瀛洲望向雷峰塔", "Hermann Luyken", "CC0 1.0", 1800, 1200, "center 52%")
  ],
  baochu: [
    photo("baochu", "Huanglong & Broken Bridge - Baochu Pagoda over the Hangzhou City.jpg", "保俶塔与杭城天际线", "CatOnMars", "CC BY 4.0", 1800, 1200, "center 52%"),
    photo("baochu-brick", "Baochu Pagoda, 2015-03-22 03.jpg", "保俶塔的砖塔外观", "Siyuwj", "CC BY-SA 4.0", 1198, 1800, "center 38%"),
    photo("baochu-slope", "Baochu Pagoda 20161002.jpg", "宝石山山脊上的保俶塔", "Tyg728", "CC BY-SA 4.0", 1800, 1125, "center 55%")
  ],
  hama: [
    photo("hama-view", "Huanglong & Broken Bridge - Hangzhou City & Outer West Lake.jpg", "宝石山一带俯瞰外西湖", "CatOnMars", "CC BY 4.0", 1800, 1200, "center 66%"),
    photo("hama", "Huanglong & Broken Bridge - Hama Feng Inscription 1.jpg", "蛤蟆峰岩壁题刻", "CatOnMars", "CC BY 4.0", 1800, 1200, "center 56%"),
    photo("hama-rock", "Huanglong & Broken Bridge - Hama Feng Inscription 2.jpg", "蛤蟆峰另一处题刻", "CatOnMars", "CC BY 4.0", 1800, 1200, "center 56%")
  ],
  duanqiao: [
    photo("duanqiao", "Broken Bridge (Hangzhou) 20250505.jpg", "西湖北岸的断桥", "Suicasmo", "CC0 1.0", 1800, 1200, "center 56%"),
    photo("duanqiao-ridge", "Baochu Pagoda & Broken Bridge.jpg", "断桥与宝石山", "钉钉", "CC BY-SA 4.0", 1800, 945, "center 55%"),
    photo("duanqiao-deck", "20230629 Duan Qiao.jpg", "断桥一带的夏日荷塘", "Yumeto", "CC BY-SA 4.0", 1800, 1350, "center 56%")
  ],
  huagang: [
    photo("huagang", "Fish pool with flowers aside.jpg", "花港观鱼园内，魏庐的梅港观鱼", "CatOnMars", "CC BY-SA 4.0", 1280, 960, "center 58%"),
    photo("huagang-pavilion", "China Hangzhou Flower Harbour.JPG", "花港观鱼的锦鲤", "Mywood", "Public domain", 1280, 960, "center")
  ],
  liulang: [
    photo("liulang-park", "Listining Orioles Singing in the Willows.JPG", "柳浪闻莺的湖滨步道", "Shizhao", "Public domain", 1280, 960, "center"),
    photo("liulang", "Billowing Willow.jpg", "柳浪闻莺园内的垂柳", "Wingchi Poon", "CC BY-SA 3.0", 1280, 960, "center")
  ],
  quyuan: [
    photo("quyuan", "Lotus in the Breeze at the Winding Courtyard.JPG", "从荷塘望向玉带晴虹", "Shizhao", "CC BY-SA 3.0", 1280, 960, "center 56%"),
    photo("quyuan-stele", "20250715 Quyuanfenghe stela.jpg", "曲院风荷题碑", "Yumeto", "CC BY-SA 4.0", 1200, 1600, "center")
  ],
  guozhuang: [
    photo("guozhuang-new", "杭州. 西湖. 郭庄 - panoramio.jpg", "从郭庄看堤岸与荷塘", "zhiyin586@163.com", "CC BY 3.0", 1280, 804, "center 70%"),
    photo("guozhuang-court-new", "杭州.西湖郭庄月季展 - panoramio (1).jpg", "郭庄月季展实景", "zhiyin586@163.com", "CC BY 3.0", 1280, 960, "center")
  ],
  maojiabu: [
    photo("maojiabu", "20250429从茅家埠上空鸟瞰西湖.jpg", "从茅家埠上空望向西湖", "MasaneMiyaPA", "CC BY-SA 4.0", 1280, 853, "center 65%")
  ],
  taiziwan: [
    photo("taiziwan-main", "杭州. 太子湾公园 - panoramio.jpg", "太子湾公园实景", "zhiyin586@163.com", "CC BY 3.0", 1280, 960, "center"),
    photo("taiziwan-flowers", "杭州. 太子湾公园（樱花.郁金香） - panoramio (2).jpg", "太子湾的樱花与郁金香", "zhiyin586@163.com", "CC BY 3.0", 1280, 916, "center 68%")
  ],
  wuguitan: [
    photo("wuguitan", "Boat on the way into the deep part of the west lake.jpg", "在乌龟潭北侧水道拍到的摇橹船", "CatOnMars", "CC BY-SA 4.0", 1280, 960, "center 70%")
  ],
  chenghuang: [
    photo("chenghuang-day", "Chenghuang Temple Hangzhou.jpg", "城隍阁建筑近景", "Takashishin", "CC BY-SA 4.0", 1200, 1600, "center 44%"),
    photo("chenghuang", "2014.11.21.184448 Chenghuangmiao night Wushan Xihu Hangzhou.jpg", "从湖上远望亮灯后的城隍阁", "Hermann Luyken", "CC0 1.0", 1280, 853, "center 32%")
  ],
  wushan: [
    photo("wushan", "Inscriptions on Precipices of Chongyang Nunnery 01 2023-11.jpg", "吴山重阳庵摩崖石刻", "猫猫的日记本", "CC BY-SA 4.0", 1280, 853, "center")
  ],
  yuguwan: [
    photo("yuguwan", "杭州 西湖 浴鸪湾景区（背景：霁虹桥） - panoramio.jpg", "浴鹄湾与霁虹桥", "zhiyin586@163.com", "CC BY 3.0", 1280, 687, "center")
  ],
  yanggong: [
    photo("yanggong", "杨公堤.jpg", "杨公堤的林荫道", "钉钉", "CC BY-SA 4.0", 1280, 960, "center")
  ],
  pinghu: [
    photo("pinghu", "Autumn Moon Over the Calm Lake.jpg", "平湖秋月景点里的亭阁", "钉钉", "CC BY-SA 4.0", 1280, 960, "center")
  ],
  jingci: [
    photo("jingci-modern", "净慈寺大雄宝殿.jpg", "净慈寺大雄宝殿", "Tyg728", "CC BY-SA 4.0", 1280, 800, "center"),
    photo("jingci", "Jingci Temple in Hangzhou (Great Hall).jpg", "1939 年出版的净慈寺大殿旧照", "Sekino Tadashi", "Public domain", 1280, 949, "center")
  ],
  yuemiao: [
    photo("yuemiao", "Memorial Hall in Yue Fei Temple, Hangzhou.jpg", "岳王庙纪念堂", "钉钉", "CC BY-SA 4.0", 1280, 942, "center")
  ],
  botanical: [
    photo("botanical", "A true bamboo forest (36443777482).jpg", "杭州植物园一带的竹林", "shankar s.", "CC BY 2.0", 1280, 848, "center")
  ],
  huanglong: [
    photo("huanglong", "Huanglong & Broken Bridge - Huanglong Cave Entrance.jpg", "黄龙洞正门一带", "CatOnMars", "CC BY 4.0", 1280, 853, "center")
  ],
  changqiao: [
    photo("changqiao-main", "杭州.南山路-长桥 - panoramio.jpg", "长桥与西湖南岸", "zhiyin586@163.com", "CC BY 3.0", 1280, 960, "center")
  ],
  qianwang: [
    photo("qianwang", "2014.11.21.142202 Qianwang Temple Hangzhou.jpg", "钱王祠的殿宇飞檐", "Hermann Luyken", "CC0 1.0", 1280, 853, "center")
  ],
  huxin: [
    photo("huxin-main", "West Lake IMG 8761 huxin pavillion island.jpg", "从湖上看湖心亭岛", "Bjoertvedt", "CC BY-SA 4.0", 1280, 806, "center")
  ],
  ruangong: [
    photo("ruangong", "Ruan Gong Islet Submerged in Greenery.jpg", "绿荫中的阮公墩", "Yinweichen", "CC BY-SA 4.0", 1280, 720, "center 58%")
  ],
  gushan: [
    photo("gushan", "Gushan Park.jpg", "孤山公园的湖岸绿荫", "Yinweichen", "CC BY-SA 4.0", 1280, 853, "center")
  ],
  twinpeaks: [
    photo("twinpeaks", "双峰插云国保碑.JPG", "洪春桥附近的双峰插云文保碑", "Nekitarc", "CC BY-SA 4.0", 1280, 853, "center")
  ]
};
