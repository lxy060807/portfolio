const regionalPlan = 'https://westlake.hangzhou.gov.cn/attach/-1/2010091025032014399.pdf';
const worldHeritage = 'https://whc.unesco.org/en/list/1334/';
const historicScenes = 'https://ywhz.hangzhou.com.cn/hssj/content/content_6220007.htm';
const sedimentStudy = 'https://www.sciengine.com/cfs/files/pdfs/view/0254-6108/18FAE923783F4F0999342110CD767E1C.pdf';
const waterBays = '里西湖与杨公堤';
const northShore = '北岸与宝石山';
const southShore = '南山路与西湖南岸';
const eastShore = '湖滨与吴山';
const islands = '湖面与堤岛';
const scene = (id, name, kind, region, c, distance, summary, source, coordinateSource, aliases = [], nearTrail = false) =>
  ({ id, name, kind, sector: region, region, c, distance, summary, source, coordinateSource, aliases, nearTrail });

export const expandedPlaces = [
  scene('huagang', '花港观鱼', '园林', southShore, [120.13409, 30.23228], .82,
    '公园位于苏堤南段西侧，小南湖和西里湖之间。红鱼池、牡丹园和临水长廊组成园内主要景观。', historicScenes, 'https://www.openstreetmap.org/way/975340430', ['花港公园','红鱼池']),
  scene('liulang', '柳浪闻莺', '湖滨公园', eastShore, [120.15108, 30.2419], .85,
    '柳浪闻莺位于西湖东南岸。从柳荫下的步道可走向开阔的湖滨，与南山路及钱王祠相邻。', historicScenes, 'https://www.openstreetmap.org/node/1468743758', ['柳浪闻莺公园']),
  scene('quyuan', '曲院风荷', '湖滨公园', northShore, [120.1317871, 30.2504698], .83,
    '曲院风荷位于岳湖一带，靠近苏堤北端。曲折的水岸把荷塘、亭廊和桥连在一起。', historicScenes, regionalPlan, ['曲苑风荷','曲院','岳湖']),
  scene('guozhuang', '郭庄', '古典园林', waterBays, [120.1275924, 30.245895], .54,
    '郭庄又称汾阳别墅，位于杨公堤东侧。园内以池水为中心布置楼阁和曲廊，靠湖一侧可远望苏堤。',
    'https://ywhz.hangzhou.com.cn/yjls/content/2016-06/18/content_6218545.htm', 'https://commons.wikimedia.org/wiki/Category:Fenyang_Villa', ['汾阳别墅']),
  scene('maojiabu', '茅家埠', '湿地与古村', waterBays, [120.1197808, 30.2408646], .91,
    '茅家埠在杨公堤以西，龙井路一侧。陆地的村落步道通往湿地和内湖，隔水可见杨公堤。',
    'https://westlake.hangzhou.gov.cn/module/download/downfile.jsp?classid=0&filename=ba38d6f8953b4e23a327c06c61d57a3e.pdf', regionalPlan, ['茅乡水情','茅公埠']),
  scene('taiziwan', '太子湾公园', '山水公园', southShore, [120.1373568, 30.2288694], .86,
    '太子湾位于花港观鱼南侧、南屏山下。溪流穿过草坡和树林，春季花景集中在园内开阔地带。', regionalPlan, 'https://commons.wikimedia.org/wiki/Category:Taiziwan_Park', ['太子湾']),
  scene('wuguitan', '乌龟潭', '湖湾湿地', waterBays, [120.1294444, 30.23375], .65,
    '乌龟潭在杨公堤以西、浴鹄湾以北。林荫步道沿潭边绕行，永福桥横跨相邻水道。',
    'https://hznews.hangzhou.com.cn/wghz/content/2019-05/09/content_7190633.htm', sedimentStudy, ['永福桥','三台云水']),
  scene('chenghuang', '城隍阁', '建筑地标', eastShore, [120.15993, 30.23889], .63,
    '城隍阁位于吴山山顶区域。重檐楼阁高于周围树冠，是从湖东和老城辨认吴山时的地标。', regionalPlan, 'https://www.openstreetmap.org/way/399030896', ['城隍庙']),
  scene('wushan', '吴山景区', '山地景区', eastShore, [120.1577165, 30.2350005], .91,
    '吴山位于西湖南端与杭州老城之间。山脊步道串连城隍阁、岩石和摩崖题刻，图钉标注景区内的参考点。', regionalPlan, 'https://commons.wikimedia.org/wiki/Category:Wushan,_Hangzhou', ['吴山天风','三茅观','崇阳庵']),
  scene('yuguwan', '浴鹄湾', '湖湾湿地', waterBays, [120.12973, 30.23083], .75,
    '浴鹄湾位于花港观鱼西南方向，水湾与杨公堤相邻。霁虹桥的长廊沿水展开，是湾内容易辨认的地标。', regionalPlan, 'https://commons.wikimedia.org/wiki/Category:Yuguwan_Scenic_Area', ['霁虹桥','三台云水']),
  scene('yanggong', '杨公堤', '堤岸', waterBays, [120.1263686, 30.2373941], 1.52,
    '杨公堤串联花港观鱼、乌龟潭、茅家埠一带和曲院风荷。桥下水道把堤两侧的水域连起来。', historicScenes, 'https://commons.wikimedia.org/wiki/Category:Yanggong_Causeway'),
  scene('pinghu', '平湖秋月', '临湖园林', islands, [120.1414654, 30.2547024], .61,
    '平湖秋月在孤山东端、白堤西侧，临湖的平台和亭廊面向外西湖。', historicScenes, regionalPlan, ['御碑亭']),
  scene('jingci', '净慈寺 · 南屏晚钟', '寺院', southShore, [120.149, 30.2295], .73,
    '净慈寺背靠南屏山，隔南山路与雷峰塔相望。寺内钟声是西湖十景「南屏晚钟」的由来。', historicScenes,
    'https://commons.wikimedia.org/wiki/Category:Jingci_Temple', ['净慈寺','南屏晚钟','南屏山']),
  scene('yuemiao', '岳王庙', '历史建筑', northShore, [120.12977, 30.25474], .68,
    '岳王庙在北山街旁、岳湖北岸，庙内分布纪念建筑与墓园。景区与苏堤北端、曲院风荷相邻。', worldHeritage,
    'https://www.openstreetmap.org/way/435906176', ['岳庙','岳飞墓']),
  scene('botanical', '杭州植物园', '植物园', northShore, [120.1232066, 30.2552608], 1.03,
    '杭州植物园位于西湖北侧山麓，园内有竹类、观赏植物和林间水景。这里标注靠近西湖的园区入口参考点。', regionalPlan,
    'https://commons.wikimedia.org/wiki/Category:Hangzhou_Botanical_Garden', ['植物园','玉泉','灵峰']),
  scene('huanglong', '黄龙洞', '园林与山径', northShore, [120.133892, 30.267017], .69,
    '黄龙洞位于宝石山北麓。景区正门供识别位置，图中的登山路线从后山口起算。', regionalPlan,
    'https://commons.wikimedia.org/wiki/File:Huanglong_%26_Broken_Bridge_-_Huanglong_Cave_Entrance.jpg', ['黄龙吐翠','圆缘民俗园'], true),
  scene('changqiao', '长桥公园', '湖滨公园', southShore, [120.1502965, 30.2358002], .67,
    '长桥公园沿西湖南岸展开，桥与临水步道面向外西湖，可隔水望见雷峰塔。', regionalPlan,
    'https://commons.wikimedia.org/wiki/Category:Changqiao_Park', ['长桥','十八相送']),
  scene('qianwang', '钱王祠', '祠堂', eastShore, [120.15329, 30.24517], .56,
    '钱王祠位于西湖东岸、柳浪闻莺北侧，是纪念吴越国钱氏诸王的祠堂。', historicScenes,
    'https://www.openstreetmap.org/node/13164838810', ['钱祠表忠','钱王']),
  scene('huxin', '湖心亭', '湖中岛屿', islands, [120.1397222, 30.2483333], .63,
    '湖心亭位于外西湖的小岛上。岛上的亭阁和临水平台可从湖岸、苏堤和游船上辨认。', worldHeritage,
    'https://commons.wikimedia.org/wiki/Category:Huxin_Pavilion', ['湖心平眺']),
  scene('ruangong', '阮公墩', '湖中岛屿', islands, [120.1369444, 30.2488889], .60,
    '阮公墩位于湖心亭以西，与苏堤隔水相望。远看可辨绿色树冠和低平的岛岸。', worldHeritage,
    'https://commons.wikimedia.org/wiki/Category:Ruangong_Islet', ['阮墩环碧']),
  scene('gushan', '孤山', '湖中山岛', islands, [120.1375, 30.253], .82,
    '孤山位于外西湖与北里湖之间，东接白堤，西侧由西泠桥连向北岸，岛上分布中山公园等园林。', worldHeritage,
    'https://commons.wikimedia.org/wiki/Category:Gushan', ['中山公园']),
  scene('twinpeaks', '双峰插云', '历史景观点', waterBays, [120.1181, 30.24993], .85,
    '西湖十景之一，意指云雾中相对而立的南高峰与北高峰。图钉标在洪春桥附近的景名碑位置。', historicScenes,
    'https://www.openstreetmap.org/node/1468743763', ['双峰','洪春桥'])
];
