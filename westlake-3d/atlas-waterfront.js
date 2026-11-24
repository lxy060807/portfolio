import * as THREE from 'three';
import { mergeGeometries } from './BufferGeometryUtils.js';

const waterline = .020;
const causeways = [
  {
    id: 'sudi', name: 'Su_Causeway', width: .034, road: .008, walk: .0022, reverse: true,
    ways: [30072148, 30072147, 30072145, 30072144, 30072138, 30072139, 30072131,
      30072130, 30075393, 30075392, 30072127, 30072125, 975869980, 4335991],
    bridges: {
      30072147: ['映波桥', 'Yingbo', 6.4], 30072144: ['锁澜桥', 'Suolan', 6.8],
      30072139: ['望山桥', 'Wangshan', 7.6], 30072130: ['压堤桥', 'Yadi', 6.3],
      30075392: ['东浦桥', 'Dongpu', 7.4], 30072125: ['跨虹桥', 'Kuahong', 7.1]
    }
  },
  {
    id: 'baidi', name: 'Bai_Causeway', width: .033, road: .009, walk: .0025,
    ways: [4326974, 29416781, 28538285, 28538286, 28538289, 28538290],
    bridges: { 28538285: ['锦带桥', 'Jindai', 5.9], 28538289: ['断桥', 'Broken', 6.1] }
  }
];

export const causewayWays = new Set(causeways.flatMap(causeway => causeway.ways.map(String)));

function centerline(roads, causeway, project) {
  const points = [];
  const bridges = [];
  let length = 0;
  for (const id of causeway.ways) {
    const road = roads.get(String(id));
    if (!road) throw new Error('Missing West Lake causeway way ' + id);
    const coordinates = causeway.reverse ? road.c.slice().reverse() : road.c;
    const start = length;
    for (const coordinate of coordinates) {
      const [x, z] = project(coordinate);
      const previous = points.at(-1);
      const step = previous ? Math.hypot(x - previous.x, z - previous.z) : 0;
      if (previous && step < 1e-8) continue;
      length += step;
      points.push({ x, z, at: length });
    }
    if (causeway.bridges[id]) {
      const [label, name, spanMeters] = causeway.bridges[id];
      bridges.push({ id: String(id), name, label, span: spanMeters / 1000, start, end: length, at: (start + length) / 2 });
    }
  }
  function point(at) {
    const next = Math.max(1, points.findIndex(p => p.at >= Math.min(at, length)));
    const a = points[next - 1], b = points[next];
    const mix = (at - a.at) / (b.at - a.at);
    return [THREE.MathUtils.lerp(a.x, b.x, mix), THREE.MathUtils.lerp(a.z, b.z, mix)];
  }
  function frame(at) {
    const [x, z] = point(at);
    const a = point(Math.max(0, at - .002)), b = point(Math.min(length, at + .002));
    const scale = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dx = (b[0] - a[0]) / scale, dz = (b[1] - a[1]) / scale;
    return { x, z, dx, dz, nx: -dz, nz: dx };
  }
  return { length, points, bridges, point, frame };
}

function strip(rows, profile) {
  const positions = [], indices = [];
  const count = profile.length;
  for (const { x, z, nx, nz, y, half, throat } of rows) {
    for (const [lateral, vertical] of profile) {
      const offset = lateral(half, throat);
      positions.push(x + nx * offset, y + vertical, z + nz * offset);
    }
  }
  for (let i = 1; i < rows.length; i++) {
    for (let j = 1; j < count; j++) {
      const a = (i - 1) * count + j - 1, b = a + count;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addMerged(geometries, material, name, group, mesh) {
  if (!geometries.length) return;
  for (const geometry of geometries) geometry.deleteAttribute('uv');
  const combined = mergeGeometries(geometries);
  geometries.forEach(geometry => geometry.dispose());
  return mesh(combined, material, name, group);
}

function bridgeModel(bridge, stone, deck, mesh) {
  const { span, body, width, y, x, z, dx, dz } = bridge;
  const length = body / 2;
  const rise = bridge.rise;
  const roadHeight = u => y + rise * (1 - (u / length) ** 2);
  const opening = [];
  for (let step = 0; step <= 12; step++) {
    const theta = Math.PI * (1 - step / 12);
    opening.push([span / 2 * Math.cos(theta), waterline - .00035 + bridge.arch * Math.sin(theta)]);
  }
  const shape = new THREE.Shape();
  shape.moveTo(-length, waterline - .005);
  shape.lineTo(-span / 2, waterline - .005);
  opening.forEach(([u, h]) => shape.lineTo(u, h));
  shape.lineTo(span / 2, waterline - .005);
  shape.lineTo(length, waterline - .005);
  for (let step = 16; step >= 0; step--) {
    const u = length * (step / 8 - 1);
    shape.lineTo(u, roadHeight(u) - .00008);
  }
  shape.closePath();

  const group = new THREE.Group();
  group.name = bridge.name + '_Stone_Arch';
  group.position.set(x, waterline, z);
  group.rotation.y = Math.atan2(-dz, dx);
  group.userData = { label: bridge.label, osmWay: bridge.id, modeledClearSpanMetres: span * 1000 };
  const arch = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  arch.translate(0, -waterline, -width / 2);
  arch.deleteAttribute('uv');
  mesh(arch, stone, 'Open_Stone_Vault', group);

  const rows = Array.from({ length: 17 }, (_, step) => {
    const x = length * (step / 8 - 1);
    return { x, z: 0, nx: 0, nz: 1, y: roadHeight(x) - waterline };
  });
  mesh(strip(rows, [[() => -width * .44, 0], [() => width * .44, 0]]), deck, 'Stone_Deck', group);
  for (const side of [-1, 1]) {
    const edge = width * .46 * side;
    const halfRail = .00022;
    const rail = strip(rows, [
      [() => edge - halfRail, 0], [() => edge - halfRail, .00068],
      [() => edge + halfRail, .00068], [() => edge + halfRail, 0]
    ]);
    mesh(rail, stone, side < 0 ? 'Southwest_Parapet' : 'Northeast_Parapet', group);
  }
  const posts = [];
  for (const side of [-1, 1]) {
    for (let i = -3; i <= 3; i++) {
      const u = i * length / 3.3;
      const post = new THREE.BoxGeometry(.00062, .00108, .00058);
      post.translate(u, roadHeight(u) - waterline + .00054, width * .46 * side);
      posts.push(post);
    }
  }
  addMerged(posts, stone, 'Parapet_Posts', group, mesh);
  return group;
}

function placeBridges(config, path) {
  return path.bridges.map(bridge => {
    const { at } = bridge;
    const body = config.id === 'sudi' ? bridge.span + .008 : bridge.name === 'Broken' ? .0088 : .0081;
    return { ...bridge, ...path.frame(at), body, width: config.id === 'sudi' ? .0094 : .0086,
      arch: bridge.span * .46, rise: config.id === 'sudi' ? .00155 : .00112 };
  });
}

function causewayModel({ config, path, bridgeLayout }, context) {
  const { terrainAt, mesh, mat, materials } = context;
  const group = new THREE.Group();
  group.name = config.name;
  const height = ({ x, z }) => Math.max(.0255, Math.min(.034, terrainAt(x, z) + .00032));
  const samples = step => Array.from({ length: Math.ceil(path.length / step) + 1 }, (_, i) => Math.min(path.length, i * step));
  const bridges = bridgeLayout.map(bridge => ({ ...bridge,
    y: Math.max(.024, (height(path.frame(bridge.at - .015)) + height(path.frame(bridge.at + .015))) / 2 - .0006)
  }));
  const halfRoad = config.road / 2;
  const approach = config.id === 'sudi' ? .013 : .021;
  const stations = [...new Set([...samples(.007), ...path.points.map(p => p.at), ...bridges.flatMap(bridge => {
    const start = bridge.at - bridge.body / 2, end = bridge.at + bridge.body / 2;
    return [start - approach, start - approach / 2, start, end, end + approach / 2, end + approach];
  })])].sort((a, b) => a - b);

  const runs = [[]];
  for (const at of stations) {
    const bridge = bridges.find(candidate => Math.abs(candidate.at - at) < candidate.body / 2 + approach);
    const distance = bridge ? Math.abs(bridge.at - at) - bridge.body / 2 : approach;
    if (distance < -1e-7) continue;
    if (bridge && at > bridge.at && distance < 1e-7) runs.push([]);
    const frame = path.frame(at);
    const blend = Math.max(0, distance) / approach;
    const half = THREE.MathUtils.lerp(bridge ? bridge.width / 2 : config.width / 2, config.width / 2, blend);
    runs.at(-1).push({ ...frame, half, throat: bridge ? THREE.MathUtils.lerp(bridge.width * .44, halfRoad, blend) : halfRoad,
      y: bridge ? THREE.MathUtils.lerp(bridge.y, height(frame), blend) : height(frame) });
  }

  const grass = mat('Causeway_Willow_Lawn', 0xa3b285);
  const pavement = mat('Causeway_Warm_Mineral_Pavement', 0xd1c9ae);
  const bank = mat('Causeway_Weathered_Stone', 0xb3b5a0);
  const verge = (half, throat) => Math.min(half, throat + .001);
  const bankEdge = (half, throat) => Math.max(verge(half, throat), half - config.walk);
  const profiles = [
    ['Main_Promenade', pavement, [[(_, w) => -w, .00022], [(_, w) => w, .00022]]],
    ['Planted_Verges', grass, [[(h,w) => -bankEdge(h,w), -.00032], [(_,w) => -w + .00003, .00017]],
      [[(_,w) => w - .00003, .00017], [bankEdge, -.00032]]],
    ['Lakeside_Stone_Walks', materials.road, [[h => -h, -.00034], [(h,w) => -bankEdge(h,w), -.00029]],
      [[bankEdge, -.00029], [h => h, -.00034]]],
    ['Revetments', bank, [[h => -h - .0022, -.017], [h => -h, -.00034]],
      [[h => h, -.00034], [h => h + .0022, -.017]]]
  ];
  for (const [name, material, ...crossSections] of profiles) {
    addMerged(runs.filter(run => run.length > 1).flatMap(run => crossSections.map(profile => strip(run, profile))),
      material, name, group, mesh);
  }
  bridges.forEach(bridge => group.add(bridgeModel(bridge, materials.stone, pavement, mesh)));

  const trunks = [], willows = [], peaches = [];
  for (const [index, at] of samples(.042).entries()) {
    if (at < .038 || path.length - at < .038 || bridges.some(bridge => Math.abs(bridge.at - at) < approach + .012)) continue;
    const frame = path.frame(at);
    for (const side of [-1, 1]) {
      const offset = config.width * .31 * side;
      const x = frame.x + frame.nx * offset, z = frame.z + frame.nz * offset;
      const y = height(frame);
      const peach = (index + Number(side > 0)) % 2 === 0;
      const size = .8 + .2 * Math.sin(index * 8.7 + side);
      const crown = new THREE.IcosahedronGeometry(1, 0);
      crown.scale(.0039 * size, (peach ? .0025 : .0040) * size, .0035 * size);
      crown.rotateY(index * .7);
      crown.translate(x, y + (peach ? .0044 : .0050) * size, z);
      (peach ? peaches : willows).push(crown);
      const trunk = new THREE.BoxGeometry(.0005, .0044 * size, .0005);
      trunk.translate(x, y + .0022 * size, z);
      trunks.push(trunk);
    }
  }
  const planting = new THREE.Group();
  planting.name = config.name + '_Planting';
  addMerged(willows, mat('Causeway_Willow_Leaf', 0x809769), 'Willow_Crowns', planting, mesh);
  addMerged(peaches, mat('Causeway_Peach_Blossom', 0xc6a8a0), 'Peach_Crowns', planting, mesh);
  addMerged(trunks, materials.wood, 'Tree_Trunks', planting, mesh);
  return { id: config.id, group, bridges, planting };
}

export function layoutCauseways(roads, project) {
  const ways = new Map(roads.filter(road => causewayWays.has(String(road.id))).map(road => [String(road.id), road]));
  return causeways.map(config => {
    const path = centerline(ways, config, project);
    return { config, path, bridgeLayout: placeBridges(config, path) };
  });
}

export function buildCauseways(layout, context) {
  return layout.map(causeway => causewayModel(causeway, context));
}

const towerBody = [[.43, .28], [.51, .35], [.59, .415], [.68, .452], [.77, .46], [.86, .455],
  [.94, .426], [1.02, .389], [1.10, .322]];

function stoneLanternBody() {
  const radius = height => {
    height = THREE.MathUtils.clamp(height, .43, 1.10);
    const upper = Math.max(1, towerBody.findIndex(([y]) => y >= height));
    const [low, a] = towerBody[upper - 1], [high, b] = towerBody[upper];
    return THREE.MathUtils.lerp(a, b, (height - low) / (high - low));
  };
  const map = (u, y, rotation, inset = 0) => {
    const theta = u / .46 + rotation, r = radius(y) - inset;
    return [r * Math.sin(theta) / 1000, y / 1000, r * Math.cos(theta) / 1000];
  };
  const positions = [], indices = [];
  const half = Math.PI / 5 * .46;
  const panel = new THREE.Shape();
  panel.moveTo(-half, .43);
  for (let i = 1; i <= 6; i++) panel.lineTo(-half + 2 * half * i / 6, .43);
  for (const [y] of towerBody.slice(1)) panel.lineTo(half, y);
  for (let i = 5; i >= 0; i--) panel.lineTo(-half + 2 * half * i / 6, 1.10);
  for (const [y] of towerBody.slice(1, -1).reverse()) panel.lineTo(-half, y);
  panel.closePath();
  const hole = new THREE.Path();
  const segments = 20;
  const rim = Array.from({ length: segments }, (_, i) => {
    const theta = i / segments * Math.PI * 2;
    return [.122 * Math.cos(theta), .764 - .122 * Math.sin(theta)];
  });
  hole.moveTo(...rim[0]);
  rim.slice(1).forEach(point => hole.lineTo(...point));
  hole.closePath();
  panel.holes.push(hole);
  const flat = new THREE.ShapeGeometry(panel);
  const vertices = flat.getAttribute('position');
  const points = Array.from({length: vertices.count}, (_, i) => [vertices.getX(i), vertices.getY(i)]);
  let faces = Array.from(flat.index.array);
  // Subdivide before bending the panel so the stone follows its curved profile between openings.
  for (let pass = 0; pass < 2; pass++) {
    const midpoints = new Map();
    const midpoint = (a, b) => {
      const key = a < b ? a + ':' + b : b + ':' + a;
      if (!midpoints.has(key)) {
        midpoints.set(key, points.length);
        points.push([(points[a][0] + points[b][0]) / 2, (points[a][1] + points[b][1]) / 2]);
      }
      return midpoints.get(key);
    };
    const smaller = [];
    for (let i = 0; i < faces.length; i += 3) {
      const [a,b,c] = faces.slice(i, i + 3);
      const ab = midpoint(a,b), bc = midpoint(b,c), ca = midpoint(c,a);
      smaller.push(a,ab,ca, ab,b,bc, ca,bc,c, ab,bc,ca);
    }
    faces = smaller;
  }
  const colors = [];
  for (let face = 0; face < 5; face++) {
    const theta = (face + .25) * Math.PI * 2 / 5;
    const start = positions.length / 3;
    for (const [u,y] of points) { positions.push(...map(u,y,theta)); colors.push(1,1,1); }
    for (const index of faces) indices.push(start + index);
    const edge = positions.length / 3;
    for (let i = 0; i < segments * 4; i++) {
      const j = Math.floor(i / 4), a = rim[j], b = rim[(j + 1) % segments], mix = (i % 4) / 4;
      const u = THREE.MathUtils.lerp(a[0], b[0], mix), y = THREE.MathUtils.lerp(a[1], b[1], mix);
      positions.push(...map(u,y,theta), ...map(u * .88, .764 + (y - .764) * .88, theta, .085));
      colors.push(.73,.73,.71, .34,.34,.32);
    }
    for (let i = 0; i < segments * 4; i++) {
      const a = edge + i * 2, b = edge + ((i + 1) % (segments * 4)) * 2;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  flat.dispose();
  const shell = new THREE.BufferGeometry();
  shell.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shell.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  shell.setIndex(indices);
  shell.computeVertexNormals();
  return shell;
}

export function buildStoneLanterns({ project, mesh, mat, materials }) {
  const group = new THREE.Group();
  group.name = 'Three_Pools_Stone_Pagodas';
  // South anchor from OSM node 9025997767. The heritage plan shows the other two to the
  // north-northwest and east-northeast. Its scale is set by the documented 62 m triangle.
  const south = new THREE.Vector2(...project([120.13963, 30.23923]));
  const northwest = new THREE.Vector2(-12, -116).setLength(.062);
  const offsets = [northwest, northwest.clone().rotateAround(new THREE.Vector2(), Math.PI / 3), new THREE.Vector2()];
  const names = [['西北塔', 'Northwest'], ['东塔', 'East'], ['南塔', 'South']];
  const warmStone = mat('Santan_Warm_Limestone', 0xb6b29d, { side: THREE.DoubleSide });
  const sculptedStone = mat('Santan_Opening_Depth', 0xb6b29d, { side: THREE.DoubleSide, vertexColors: true });
  const lanternBody = stoneLanternBody();
  const lathe = (profile, count = 30) => {
    const geo = new THREE.LatheGeometry(profile.map(([r,y]) => new THREE.Vector2(r / 1000, y / 1000)), count);
    geo.deleteAttribute('uv');
    return geo;
  };
  const base = lathe([[0,-.32],[.69,-.32],[.69,.015],[.51,.015],[.51,.10],[.45,.10],
    [.45,.21],[.36,.24],[.34,.31],[.28,.43],[0,.43]]);
  const crown = lathe([[0,1.10],[.322,1.10],[.433,1.13],[.433,1.18],[.385,1.24],
    [.255,1.28],[.22,1.31],[.25,1.42],[.21,1.49],[.20,1.55],[.34,1.57],[.365,1.60],
    [.36,1.64],[.29,1.68],[.22,1.78],[.16,1.80],[.205,1.89],[.207,1.98],[.158,2.05],
    [.166,2.12],[.132,2.18],[.065,2.23],[.052,2.32],[0,2.32]]);
  const features = offsets.map((offset, i) => {
    const [label,name] = names[i];
    const [x,z] = offset.clone().add(south).toArray();
    const tower = new THREE.Group();
    tower.name = 'Santan_' + name + '_Stone_Pagoda';
    tower.position.set(x, waterline, z);
    tower.userData = { label, heightMetres: 2.32, roundOpenings: 5, basis: 'West Lake nomination dossier fig. 2a-92 and 2a-93' };
    mesh(base, materials.stone, 'Carved_Footing', tower);
    mesh(lanternBody, sculptedStone, 'Hollow_Stone_Lantern_Five_Openings', tower);
    mesh(crown, warmStone, 'Layered_Eaves_And_Gourd_Finial', tower);
    group.add(tower);
    return { id: 'santan-' + name.toLowerCase(), label, x, z, y: waterline, height: .00232 };
  });
  const x = features.reduce((sum, tower) => sum + tower.x, 0) / features.length;
  const z = features.reduce((sum, tower) => sum + tower.z, 0) / features.length;
  return { group, features, center: { x, y: waterline, z } };
}
