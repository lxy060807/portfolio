import { expandedPlaces } from './atlas-places-expanded.js';

const heritage = 'https://whc.unesco.org/en/list/1334/';
const mountainGuide = 'https://hznews.hangzhou.com.cn/wenti/content/2018-03/16/content_6822714.htm';

export const places = [
  {
    id: 'overview', name: '西湖全景', kind: '全景', c: [120.142, 30.248],
    summary: '点击地图上的景点，查看实拍照片与周边空间。'
  },
  {
    id: 'sudi', name: '苏堤', kind: '堤岸', sector: '西湖西侧', c: [120.1332642, 30.2461187], distance: 3.15,
    summary: '苏堤纵贯西湖西侧，连接南北两岸。上方六桥按南到北排列，点选桥名可近看桥拱、栏杆和两侧堤岸。',
    source: heritage
  },
  {
    id: 'baidi', name: '白堤 · 孤山', kind: '堤岸', sector: '西湖北岸', c: [120.1402059, 30.2535121], distance: 2.35,
    summary: '白堤从孤山经锦带桥走向断桥，将北里湖与外西湖分开。堤面从中央步道向两侧过渡到桃柳绿带和临水石径。',
    source: heritage
  },
  {
    id: 'moon', name: '三潭印月', kind: '湖中岛屿', sector: '小瀛洲', c: [120.1397779, 30.2394753], distance: 1.45,
    summary: '小瀛洲南侧的三座石塔相距约 62 米，排成等边三角形。选一座塔近看，可以看到圆鼓形塔身、五个圆孔和葫芦形塔刹。',
    source: 'https://whc.unesco.org/uploads/nominations/1334.pdf#page=135'
  },
  {
    id: 'leifeng', name: '雷峰塔', kind: '建筑地标', sector: '西湖南岸', c: [120.1449996, 30.2338588], distance: .85,
    summary: '雷峰塔立在西湖南岸夕照山上，隔湖与保俶塔相望。现塔保留八角形、重檐的轮廓，塔内可见旧塔遗址。',
    source: heritage, markerHeight: .075
  },
  {
    id: 'baochu', name: '保俶塔', kind: '建筑地标', sector: '宝石山东端', c: [120.14361, 30.26333], distance: .62,
    summary: '保俶塔位于宝石山山脊东端。八面七级的砖塔以瘦高的轮廓辨识，从北山街和断桥都能望见。沿塔旁游步道向西可接近蛤蟆峰一带。',
    source: heritage, markerHeight: .06, nearTrail: true
  },
  {
    id: 'hama', name: '蛤蟆峰观景平台', kind: '观景点', sector: '宝石山山脊', c: [120.1425767, 30.2632492], distance: .58,
    summary: '蛤蟆峰一带以裸露岩石和俯瞰西湖的视野著称。图中标注附近游步道旁的观景区域，位置为参考点。到访请遵循现场指示，留在开放步道内。',
    source: mountainGuide, markerHeight: .025, nearTrail: true
  },
  {
    id: 'duanqiao', name: '断桥', kind: '桥梁', sector: '白堤东端', c: [120.1470304, 30.2609008], distance: .72,
    summary: '断桥连通白堤东端和北山街。从桥上向西可沿白堤走向孤山，向北可辨认宝石山山脊和保俶塔。',
    source: heritage
  },
  ...expandedPlaces
];

