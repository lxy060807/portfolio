import * as THREE from 'three';
import {OrbitControls} from './OrbitControls.js';
import {mergeGeometries, mergeVertices} from './BufferGeometryUtils.js';
import { places } from './atlas-data.js';
import { readTrails } from './atlas-trails.js';
import { createAtlasUI } from './atlas-ui.js';
import { createBuildingLayer, createTrailLayer, createTrailOverview } from './atlas-geometry.js';
import { buildCauseways, buildStoneLanterns, causewayWays, layoutCauseways } from './atlas-waterfront.js';
import { createLighting } from './atlas-lighting.js';
import { createTripPlanner, tripColors } from './atlas-trip-ui.js';
import { tripStops } from './atlas-trip-network.js';

const $=s=>document.querySelector(s), stage=$('#stage'), canvas=$('#scene');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const compactLayout = matchMedia('(max-width: 760px)');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true})}catch(e){$('#loader').innerHTML='<strong>当前浏览器无法启动三维视图</strong><p>请启用硬件加速，或换用支持 WebGL 的浏览器。</p><a href="westlake.blend" download>下载 Blender 模型</a>';throw e}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#eef2ef');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(39,1,.008,80);camera.position.set(5.7,6.8,8.3);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=.3;controls.maxDistance=19;controls.maxPolarAngle=Math.PI*.46;controls.screenSpacePanning=true;controls.target.set(-.12,.05,.2);controls.autoRotateSpeed=.38;controls.listenToKeyEvents(canvas);
controls.touchZoomSpeed = .68;
const hemisphere = new THREE.HemisphereLight(0xf4fbff,0x718467,2.5);scene.add(hemisphere);
const sun=new THREE.DirectionalLight(0xfff6df,3.1);sun.position.set(-4,8,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:25});sun.shadow.bias=-.00016;sun.shadow.normalBias=.012;scene.add(sun);
const fill=new THREE.DirectionalLight(0xd5e6f2,1);fill.position.set(5,4,-5);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x3e584a,opacity:.12}));ground.rotation.x=-Math.PI/2;ground.position.y=-.2;ground.receiveShadow=true;scene.add(ground);
const model=new THREE.Group();model.name='WestLake_SpatialAtlas';model.userData={source:'OpenStreetMap + Copernicus DEM; see SOURCES.txt',units:'1 unit = 1 km',verticalExaggeration:1.8};scene.add(model);
const groups={};for(const name of ['Terrain','Water','Roads','Buildings','Landmarks','Trees','HikingTrail']){const group=new THREE.Group();group.name=name;model.add(group);groups[name]=group}
groups.HikingTrail.visible = false;
const trailSelectionLayer = new THREE.Group();
scene.add(trailSelectionLayer);
const tripLayer = new THREE.Group();
scene.add(tripLayer);
const mat=(name,color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.85,...extra});m.name=name;return m};
const materials={earth:mat('Terrain_Green',0xffffff,{vertexColors:true}),water:mat('Lake_Jade',0x589f91,{roughness:.3,metalness:.12}),stone:mat('Shore_PaleStone',0xcbd1b5),road:mat('Paths_Limestone',0xe6ddc1),city:mat('Buildings_Porcelain',0xe9e7d9),roof:mat('Roof_CharcoalJade',0x44594d),wood:mat('Timber_Warm',0x947354),gold:mat('Pagoda_Bronze',0x9c8050,{metalness:.25,roughness:.52}),base:mat('Cut_Base',0xb7c2a9)};
const lighting = createLighting({ scene, renderer, hemisphere, sun, fill, water: materials.water, reduced });
for (const [material, coverage, wetness] of [
  [materials.earth, .94, .77], [materials.road, .53, .91], [materials.stone, .75, .85],
  [materials.roof, .96, .8], [materials.wood, .28, .7]
]) lighting.weatherSurface(material, coverage, wetness);
const mesh=(geo,material,name,group)=>{const m=new THREE.Mesh(geo,material);m.name=name;m.castShadow=true;m.receiveShadow=true;group.add(m);return m};
const px=96.16,pz=111.32,origin=[120.142,30.248];
const project=c=>[(c[0]-origin[0])*px,-(c[1]-origin[1])*pz];
const unproject=(x,z)=>[x/px+origin[0],origin[1]-z/pz];
const inRing=(x,z,c)=>{let hit=false;for(let i=0,j=c.length-1;i<c.length;j=i++){const a=c[i],b=c[j];if((a[1]>z)!=(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit};
const ringInfo=c=>({c,b:[Math.min(...c.map(p=>p[0])),Math.min(...c.map(p=>p[1])),Math.max(...c.map(p=>p[0])),Math.max(...c.map(p=>p[1]))]});
const inPoly=(x,z,r)=>x>=r.b[0]&&x<=r.b[2]&&z>=r.b[1]&&z<=r.b[3]&&inRing(x,z,r.c);
const labels = [];
let terrainAt, inWater, selected = 0, flight = null, loaded = false;
let mappedRoutes = [], routeNetwork, activeTrail = null;
const waterfrontViews = new Map();
let waterfrontFocus = null;
let followTowerPresetOnResize = false;
let tripBounds = null, tripPins = [];
const diningPriceBands = [
  {max:50, label:'¥50 以内'},
  {max:100, label:'¥51–100'},
  {max:150, label:'¥101–150'},
  {max:Infinity, label:'¥151 起'}
];
const atlasUI = createAtlasUI({
  onPlace: setActive, onTrail: showTrail, onClose: closeDetails, onDetail: focusWaterfront, onTrip: openTrip
});
const tripPlanner = createTripPlanner(places, () => loadData('trip-network.json'), drawTrip, fitTrip, showMapStops);

function markDiningPrice(element, price) {
  element.classList.add('dining-marker');
  element.dataset.diningPrice = '¥' + price;
  element.dataset.diningTier = diningPriceBands.findIndex(band => price <= band.max);
}

function mapStopName(place) {
  return place.dining ? place.name + '，参考人均 ' + place.dining.price + ' 元' : place.name;
}

function showMapStops(picking, points, multiSelect) {
  stage.toggleAttribute('data-trip-picking', picking);
  const marks = new Map();
  for (const {stop, mark} of points) {
    if (!marks.has(stop.id)) marks.set(stop.id, []);
    marks.get(stop.id).push(mark);
  }
  for (const {el, tripStop} of labels) {
    if (!tripStop) continue;
    const mark = marks.get(tripStop.id)?.join('·') ?? '';
    el.dataset.mark = mark;
    const name = mapStopName(tripStop);
    el.setAttribute('aria-label', !multiSelect && mark ? name + '，已选 ' + mark : name);
    if (multiSelect) el.setAttribute('aria-pressed', String(Boolean(mark)));
    else el.removeAttribute('aria-pressed');
  }
}

function setActive(index, trigger) {
  tripPlanner.close();
  selected = index;
  clearTrail();
  waterfrontFocus = null;
  labels.forEach(label => label.el.classList.toggle('selected', label.i === index));
  atlasUI.showPlace(index, trigger, waterfrontViews.get(places[index].id));
  updateInspectionFraming();
  flyToPlace(index);
}

function closeDetails(restoreFocus) {
  tripPlanner.close();
  clearTrail();
  waterfrontFocus = null;
  if (selected < 0) selected = 0;
  atlasUI.close(restoreFocus);
  updateInspectionFraming();
}

function clearTrail() {
  groups.HikingTrail.visible = false;
  trailSelectionLayer.visible = false;
  activeTrail = null;
}

function showTrail(id, trigger) {
  if (!routeNetwork) return;
  tripPlanner.close();
  const current = mappedRoutes.find(entry => entry.route.id === id);
  activeTrail = current?.route.id ?? null;
  selected = -1;
  waterfrontFocus = null;
  controls.minDistance = .3;
  labels.forEach(label => label.el.classList.remove('selected'));
  groups.HikingTrail.visible = true;
  routeNetwork.visible = !current;
  trailSelectionLayer.visible = Boolean(current);
  for (const entry of mappedRoutes) entry.geometry.group.visible = entry === current;
  atlasUI.showTrail(current?.route, current?.geometry.length, trigger);
  updateInspectionFraming();
  const points = current ? [...current.geometry.points] : mappedRoutes.flatMap(entry => entry.geometry.points);
  const referenceRoutes = current ? [current] : mappedRoutes;
  for (const {route} of referenceRoutes) if (route.reference) points.push(project(route.reference.coordinates));
  const xs = points.map(point => point[0]), zs = points.map(point => point[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const x = (minX + maxX) / 2, z = (minZ + maxZ) / 2;
  const focus = new THREE.Vector3(x, terrainAt(x, z), z);
  const mobile = compactLayout.matches;
  const viewSpan = Math.max(maxX - minX, maxZ - minZ);
  const fit = mobile ? 1.95 : current ? 1.73 : 2.00;
  const routeView = new THREE.Vector3(.12, .89, .48).normalize().multiplyScalar(Math.max(.58, viewSpan * fit));
  fly(focus.clone().add(routeView), focus);
  setPerspective();
}

function openTrip(trigger, destination) {
  if (!loaded) return;
  clearTrail();
  waterfrontFocus = null;
  followTowerPresetOnResize = false;
  if (selected < 0) selected = 0;
  controls.minDistance = .3;
  tripPlanner.open(destination);
  atlasUI.showTrip(trigger);
  if (stage.dataset.view === 'sky') flyToPlace(0);
  updateInspectionFraming();
}

function drawTrip(result, draft = []) {
  tripLayer.traverse(item => {
    item.geometry?.dispose();
    item.material?.dispose();
  });
  tripLayer.clear();
  for (const pin of tripPins) pin.element.remove();
  tripPins = [];
  tripBounds = null;
  delete stage.dataset.trip;
  if (!result) {
    if (!stage.hasAttribute('data-trip-picking')) {
      const mapStops = new Map();
      for (const {stop, mark} of draft) {
        if (!mapStops.has(stop.id)) mapStops.set(stop.id, {coordinates:stop.c,names:[mapStopName(stop)],labels:[],prices:new Set()});
        if (stop.dining) mapStops.get(stop.id).prices.add(stop.dining.price);
        mapStops.get(stop.id).labels.push(mark);
      }
      addTripPins(mapStops);
    }
    return;
  }
  if (result.legs.length) tripBounds = { left:Infinity, right:-Infinity, top:Infinity, bottom:-Infinity };
  for (const leg of new Set(result.legs)) {
    const {group, points} = createTrailLayer(
      { id:leg.mode, color:tripColors[leg.mode], legs:[leg] }, project, terrainAt, { outline:.043, line:.027 }
    );
    tripLayer.add(group);
    for (const [x,z] of points) {
      tripBounds.left = Math.min(tripBounds.left,x);
      tripBounds.right = Math.max(tripBounds.right,x);
      tripBounds.top = Math.min(tripBounds.top,z);
      tripBounds.bottom = Math.max(tripBounds.bottom,z);
    }
  }
  const mapStops = new Map();
  for (const [i,point] of result.routePoints.entries()) {
    if (!mapStops.has(point.node)) mapStops.set(point.node, { coordinates:point.coordinates, names:[], labels:[], prices:new Set() });
    const marker = mapStops.get(point.node);
    marker.names.push(mapStopName(point.stop));
    marker.labels.push(i === 0 ? '起' : i === result.routePoints.length - 1 ? '终' : String(i));
    if (point.stop.dining) marker.prices.add(point.stop.dining.price);
  }
  addTripPins(mapStops);
  stage.dataset.trip = 'active';
  fitTrip();
}

function addTripPins(mapStops) {
  for (const {coordinates,names,labels:marks,prices} of mapStops.values()) {
    const element = document.createElement('span');
    element.className = 'map-label trip-pin';
    if (prices.size === 1) markDiningPrice(element, prices.values().next().value);
    element.textContent = marks.length <= 2 ? marks.join('·') : marks[0] + '＋' + (marks.length - 1);
    element.title = [...new Set(names)].join('、');
    const [x,z] = project(coordinates);
    tripPins.push({ element, position:new THREE.Vector3(x,terrainAt(x,z) + .02,z) });
    $('#labels').append(element);
  }
}

function tripFrame() {
  const width = stage.clientWidth, height = stage.clientHeight;
  const panel = $('#atlas-details');
  const bottomSheet = compactLayout.matches || width <= 792;
  const right = bottomSheet ? width - 54 : panel.offsetLeft - 18;
  const bottom = bottomSheet ? panel.offsetTop - 18 : height - 58;
  return { width, height, left:24, right:Math.max(100,right), top:82, bottom:Math.max(130,bottom) };
}

function tripViewOffset() {
  const frame = tripFrame();
  camera.setViewOffset(frame.width,frame.height,(frame.width-frame.left-frame.right)/2,
    (frame.height-frame.top-frame.bottom)/2,frame.width,frame.height);
}

function fitTrip() {
  if (!tripBounds) return;
  setViewMode('top');
  const f = tripFrame(), bounds = tripBounds;
  const x = (bounds.left + bounds.right) / 2, z = (bounds.top + bounds.bottom) / 2;
  const target = new THREE.Vector3(x,terrainAt(x,z),z);
  const fill = Math.max((bounds.right-bounds.left)/(f.right-f.left),(bounds.bottom-bounds.top)/(f.bottom-f.top));
  const distance = Math.max(.38, fill * f.height * .64 / Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
  tripViewOffset();
  fly(target.clone().add(new THREE.Vector3(0,distance,.0001)),target);
}

function updateTripPins() {
  if (!tripPins.length) return;
  const width = stage.clientWidth, height = stage.clientHeight;
  for (const {element,position} of tripPins) {
    const point = position.clone().project(camera);
    const x = (point.x + 1) * .5 * width, y = (1 - point.y) * .5 * height;
    element.hidden = x < 12 || x > width - 12 || y < 50 || y > height - 16 || Math.abs(point.z) > 1;
    element.style.left = x + 'px';
    element.style.top = y + 'px';
  }
}
function fly(position,target){controls.autoRotate=false;$('#rotate').setAttribute('aria-pressed','false');flight={start:performance.now(),from:camera.position.clone(),to:position,fromTarget:controls.target.clone(),target};if(reduced){camera.position.copy(position);controls.target.copy(target);flight=null}}
function focusWaterfront(id) {
  const view = waterfrontViews.get(places[selected]?.id)?.find(item => item.id === id);
  if (!view) return;
  waterfrontFocus = view;
  const layer = view.place === 'moon' ? ['buildings', 'Landmarks'] : ['roads', 'Roads'];
  $('#layer-' + layer[0]).checked = groups[layer[1]].visible = true;
  if (view.place === 'moon') groups.Buildings.visible = true;
  atlasUI.selectDetail(id);
  updateInspectionFraming();
  flyToPlace(selected);
}

function flyToPlace(i) {
  if (!loaded) return;
  if (i === -1) { showTrail(activeTrail); return; }
  setPerspective();
  const place = places[i];
  if (i === 3 && !waterfrontFocus) { focusWaterfront('all'); return; }
  const view = waterfrontFocus;
  followTowerPresetOnResize = view?.id === 'all';
  controls.minDistance = view ? .0034 : .3;
  if (i === 0) {
    fly(new THREE.Vector3(5.7, 6.8, 8.3), new THREE.Vector3(-.12, .05, .2));
  } else {
    const [x, z] = view ? [view.x, view.z] : project(place.c);
    const target = new THREE.Vector3(x, view?.y ?? terrainAt(x, z), z);
    if (followTowerPresetOnResize) {
      fly(fitTowerGroup(target, view.towers), target);
      return;
    }
    const mobile = compactLayout.matches;
    const direction = view?.direction ?? new THREE.Vector3(.36, .71, .75);
    const visibleHeight = $('#atlas-details').offsetTop - 64;
    const panelFit = view?.place === 'moon' && visibleHeight > 0 ? Math.max(1, 104 / visibleHeight) : 1;
    const distance = view ? view.distance * (mobile ? view.mobileFit * panelFit : 1) : place.distance;
    fly(target.clone().add(direction.clone().normalize().multiplyScalar(distance)), target);
  }
}
function setViewMode(mode) {
  const sky = mode === 'sky';
  stage.dataset.view = mode;
  controls.maxPolarAngle = sky ? Math.PI * .64 : Math.PI * .46;
  lighting.showSky(sky);
  updateFieldOfView();
  for (const name of ['perspective', 'top', 'sky']) {
    const button = $('#view-' + name);
    button.classList.toggle('active', name === mode);
    button.setAttribute('aria-pressed', String(name === mode));
  }
}

function setPerspective() {
  setViewMode('perspective');
}
function makeGeometry(vertices,indices){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));if(indices)g.setIndex(indices);g.computeVertexNormals();return g}
function merged(list,material,name,group){if(!list.length)return;const mixed=list.some(g=>!g.index)&&list.some(g=>g.index);for(const g of list){g.deleteAttribute('uv');g.deleteAttribute('color');if(mixed&&g.index){const n=g.toNonIndexed();g.copy(n);n.dispose()}}const geo=mergeGeometries(list);for(const g of list)g.dispose();return mesh(geo,material,name,group)}
function compactUntextured(geometry) {
  geometry.deleteAttribute('uv');
  const compact = mergeVertices(geometry, 1e-7);
  geometry.dispose();
  return compact;
}
function addLakeBoats() {
  const outline = new THREE.Shape();
  outline.moveTo(0, -.011);
  outline.quadraticCurveTo(.0038, -.007, .0038, -.002);
  outline.lineTo(.0033, .0075);
  outline.quadraticCurveTo(0, .0105, -.0033, .0075);
  outline.lineTo(-.0038, -.002);
  outline.quadraticCurveTo(-.0038, -.007, 0, -.011);
  const hull = new THREE.ExtrudeGeometry(outline, {
    depth: .0017, bevelEnabled: true, bevelThickness: .00038, bevelSize: .0005, bevelSegments: 1, curveSegments: 6
  }).rotateX(-Math.PI / 2);
  const roof = makeGeometry([
    -.0036,.0051,-.0059, -.002,.0061,-.006, 0,.0065,-.0061, .002,.0061,-.006, .0036,.0051,-.0059,
    -.0036,.0051,.0059, -.002,.0061,.006, 0,.0065,.0061, .002,.0061,.006, .0036,.0051,.0059
  ], [0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,8,3,8,4,4,8,9]);
  const post = new THREE.BoxGeometry(.00042,.0036,.00042);
  const deck = new THREE.BoxGeometry(.0065,.00045,.014);
  for (const coordinate of [[120.146,30.248],[120.147,30.241],[120.140,30.246],[120.151,30.250]]) {
    const [x,z] = project(coordinate);
    if (!inWater(x,z)) continue;
    const boat = new THREE.Group();
    boat.name = 'Covered_Lake_Boat';
    boat.position.set(x,.0204,z);
    boat.rotation.y = .38 + (z + 1) * .42;
    groups.Water.add(boat);
    mesh(hull,materials.wood,'Tapered_Hull',boat);
    mesh(deck,materials.stone,'Deck',boat).position.y = .0018;
    mesh(roof,materials.roof,'Cambered_Canopy',boat);
    for (const side of [-1,1]) for (const row of [-1,0,1]) {
      mesh(post,materials.wood,'Canopy_Post',boat).position.set(side * .0027,.0034,row * .00465);
    }
  }
}

function build(d, footprintData){
 const n=d.size,[west,south,east,north]=d.bbox;const[xmin,zmax]=project([west,south]),[xmax,zmin]=project([east,north]);
 const waters=d.water.map(r=>({...ringInfo(r.c.map(project)),role:r.role})),outer=waters.filter(r=>r.role==='outer'),inner=waters.filter(r=>r.role==='inner');
 inWater=(x,z)=>outer.some(r=>inPoly(x,z,r))&&!inner.some(r=>inPoly(x,z,r));
 const causewayLayout = layoutCauseways(d.roads, project);
 const bridgeLayout = causewayLayout.flatMap(section => section.bridgeLayout);
 const nearBridge = (x,z,radius) => bridgeLayout.some(bridge => (x-bridge.x)**2 + (z-bridge.z)**2 < radius**2);
 const smooth=new Float32Array(n*n);
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){let s=0,w=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const u=Math.max(0,Math.min(n-1,i+dx)),v=Math.max(0,Math.min(n-1,j+dy));const q=(dx===0&&dy===0)?3:1;s+=d.elev[v*n+u]*q;w+=q}s/=w;const x=xmin+(xmax-xmin)*i/(n-1),z=zmin+(zmax-zmin)*j/(n-1);
  // The coarse elevation grid cannot preserve narrow channels underneath the stone arches.
  smooth[j*n+i]=inWater(x,z)||nearBridge(x,z,.037)?.008:Math.max(.026,.026+(s-7.5)*.0018);
 }
 terrainAt = (x, z) => {
   const gx = THREE.MathUtils.clamp((x - xmin) / (xmax - xmin) * (n - 1), 0, n - 1.001);
   const gz = THREE.MathUtils.clamp((z - zmin) / (zmax - zmin) * (n - 1), 0, n - 1.001);
   const i = Math.floor(gx), j = Math.floor(gz), u = gx - i, v = gz - j, index = j * n + i;
   const northwest = smooth[index], northeast = smooth[index + 1];
   const southwest = smooth[index + n], southeast = smooth[index + n + 1];
   // Match the actual terrain mesh triangles so routes and buildings meet the surface.
   return u + v <= 1
     ? northwest * (1 - u - v) + northeast * u + southwest * v
     : southeast * (u + v - 1) + northeast * (1 - v) + southwest * (1 - u);
 };
 const verts=[],idx=[],colors=[],low=new THREE.Color('#acb995'),high=new THREE.Color('#4e795b'),urban=new THREE.Color('#d5d6c5');
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=xmin+(xmax-xmin)*i/(n-1),z=zmin+(zmax-zmin)*j/(n-1),h=smooth[j*n+i];verts.push(x,h,z);const c=low.clone().lerp(high,Math.min(1,h*2.5));if(x>1.35)c.lerp(urban,THREE.MathUtils.smoothstep(x,1.35,2.6)*.9);colors.push(c.r,c.g,c.b);if(i<n-1&&j<n-1){const a=j*n+i;idx.push(a,a+n,a+1,a+1,a+n,a+n+1)}}
 const terrain=makeGeometry(verts,idx);terrain.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));mesh(terrain,materials.earth,'DSM_Terrain_1_8x',groups.Terrain);
 const perimeter=[];for(let i=0;i<n;i++)perimeter.push(i);for(let j=1;j<n;j++)perimeter.push(j*n+n-1);for(let i=n-2;i>=0;i--)perimeter.push((n-1)*n+i);for(let j=n-2;j>0;j--)perimeter.push(j*n);
 const sides=[],sideidx=[];perimeter.forEach((id,i)=>{const x=verts[id*3],y=verts[id*3+1],z=verts[id*3+2];sides.push(x,y,z,x,-.14,z);const a=i*2,b=((i+1)%perimeter.length)*2;sideidx.push(a,b,a+1,b,b+1,a+1)});mesh(makeGeometry(sides,sideidx),materials.base,'Terrain_Section',groups.Terrain);
 const plate=new THREE.BoxGeometry(xmax-xmin,.045,zmax-zmin);plate.translate((xmin+xmax)/2,-.16,(zmin+zmax)/2);mesh(plate,materials.base,'Model_Plinth',groups.Terrain);
 for(let oi=0;oi<outer.length;oi++){const r=outer[oi],s=new THREE.Shape(r.c.map(p=>new THREE.Vector2(p[0],-p[1])));for(const h of inner)if(inRing(h.c[0][0],h.c[0][1],r.c))s.holes.push(new THREE.Path(h.c.map(p=>new THREE.Vector2(p[0],-p[1]))));const g=new THREE.ShapeGeometry(s);g.rotateX(-Math.PI/2);g.translate(0,.020,0);const m=mesh(g,materials.water,'WestLake_Water_'+oi,groups.Water);m.castShadow=false}
 for (const bridge of bridgeLayout) {
   if (inWater(bridge.x, bridge.z)) continue;
   const water = new THREE.PlaneGeometry(bridge.span + .0015, .062);
   water.rotateX(-Math.PI / 2);
   water.rotateY(Math.atan2(-bridge.dz, bridge.dx));
   water.translate(bridge.x, .020025, bridge.z);
   mesh(water, materials.water, bridge.name + '_Water_Channel', groups.Water).castShadow = false;
 }
 // Accurate shoreline tracing, kept thin so its visual weight does not obscure islands.
 const shore=[];for(const r of waters){for(let i=1;i<r.c.length;i++){const a=r.c[i-1],b=r.c[i];shore.push(a[0],.022,a[1],b[0],.022,b[1])}}
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(shore,3));const sl=new THREE.LineSegments(sg,new THREE.LineBasicMaterial({color:0xc1cba8}));sl.name='Shoreline';groups.Water.add(sl);
 const greenRings=d.green.map(c=>ringInfo(c.map(project)));const roadGeo=[];
 for(const r of d.roads){if(r.tunnel||causewayWays.has(String(r.id)))continue;const pts=r.c.map(project),width=Math.min(.028,Math.max(.003,(r.widthM||({primary:18,secondary:14,tertiary:10,residential:7,unclassified:6,service:4,pedestrian:5}[r.kind]||2.5))*.001));const v=[],ind=[];for(let k=1;k<pts.length;k++){const a=pts[k-1],b=pts[k],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len>.8||!len)continue;const steps=Math.max(1,Math.ceil(len/.018));for(let t=0;t<steps;t++){const ax=a[0]+(b[0]-a[0])*t/steps,az=a[1]+(b[1]-a[1])*t/steps,bx=a[0]+(b[0]-a[0])*(t+1)/steps,bz=a[1]+(b[1]-a[1])*(t+1)/steps;if(ax<xmin||ax>xmax||az<zmin||az>zmax)continue;if(r.kind==="footway"&&nearBridge((ax+bx)/2,(az+bz)/2,.038)&&inWater((ax+bx)/2,(az+bz)/2))continue;const dx=(bz-az)/len*steps*width/2,dz=-(bx-ax)/len*steps*width/2;const h=(x,z)=>Math.max(terrainAt(x,z)+.005,r.bridge?.054:0);const o=v.length/3;v.push(ax+dx,h(ax+dx,az+dz),az+dz,ax-dx,h(ax-dx,az-dz),az-dz,bx+dx,h(bx+dx,bz+dz),bz+dz,bx-dx,h(bx-dx,bz-dz),bz-dz);ind.push(o,o+1,o+2,o+1,o+3,o+2)}}if(v.length)roadGeo.push(makeGeometry(v,ind))}
 merged(roadGeo,materials.road,'OSM_Road_Network',groups.Roads);
 const causeways = buildCauseways(causewayLayout, { terrainAt, mesh, mat, materials });
 lighting.addLanterns(d.roads, causewayWays, project, terrainAt);
 for (const {id, group, bridges, planting} of causeways) {
   group.traverse(object => {
     if (object.material?.isMeshStandardMaterial) {
       lighting.weatherSurface(object.material, /Lawn|Stone/.test(object.material.name) ? .85 : .55, .86);
     }
   });
   groups.Roads.add(group);
   groups.Trees.add(planting);
   waterfrontViews.set(id, bridges.map(bridge => ({
     ...bridge, height: .0035, place: id, distance: .071, mobileFit: 1.36,
     direction: new THREE.Vector3(bridge.dx * .48 + bridge.nx, .73, bridge.dz * .48 + bridge.nz)
   })));
 }
 const broken = waterfrontViews.get('baidi').find(view => view.name === 'Broken');
 waterfrontViews.set('duanqiao', [broken]);
 const landmarkPoints = ['leifeng', 'baochu'].map(id => project(places.find(place => place.id === id).c));
 const buildings = createBuildingLayer(footprintData.buildings, {
   project, terrainAt, inWater, excludedPoints: landmarkPoints.map(([x,z], i) => [x,z,i === 0 ? .029 : .012])
 });
 groups.Buildings.add(buildings.group);
 buildings.group.traverse(object => {
   if (object.material?.isMeshStandardMaterial) {
     lighting.weatherSurface(object.material, object.name.includes('Roof') ? 1 : .25, .61);
   }
 });
 const routes = readTrails(d.roads);
 mappedRoutes = routes.map(route => ({route, geometry: createTrailLayer(route, project, terrainAt)}));
 routeNetwork = createTrailOverview(routes, project, terrainAt);
 groups.HikingTrail.add(routeNetwork);
 for (const {geometry} of mappedRoutes) trailSelectionLayer.add(geometry.group);
 trailSelectionLayer.visible = false;
 const trailCells = new Set(mappedRoutes.flatMap(({geometry}) => geometry.points.map(([x,z]) => Math.floor(x/.012) + ':' + Math.floor(z/.012))));
 const nearRoute = (x,z) => trailCells.has(Math.floor(x/.012) + ':' + Math.floor(z/.012));
 let seed=2731;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};const crowns=[[],[],[]],trunks=[],treeMats=['#527657','#65845b','#819964'].map((c,i)=>mat('Canopy_'+i,c));
 const treeBase=compactUntextured(new THREE.SphereGeometry(1,6,4));
 const trunkBase=compactUntextured(new THREE.CylinderGeometry(.0014,.002,.014,5));
 let count=0;for(let t=0;t<55000&&count<3750;t++){const x=xmin+.03+rand()*(xmax-xmin-.06),z=zmin+.03+rand()*(zmax-zmin-.06),y=terrainAt(x,z);if(inWater(x,z)||landmarkPoints.some(p=>Math.hypot(x-p[0],z-p[1])<.05)||buildings.nearbyFootprints(x,z).some(r=>inPoly(x,z,r))||nearRoute(x,z))continue;if(!greenRings.some(r=>inPoly(x,z,r))&&!(y>.13&&x<.8))continue;const s=.009+rand()*.009;const c=treeBase.clone();c.scale(s,s*(1.15+rand()*.4),s);c.rotateY(rand()*6.28);c.translate(x,y+s+.01,z);crowns[count%3].push(c);const tr=trunkBase.clone();tr.translate(x,y+.007,z);trunks.push(tr);count++}
 for(let i=0;i<3;i++)merged(crowns[i],treeMats[i],'Canopy_'+i,groups.Trees);merged(trunks,materials.wood,'Tree_Trunks',groups.Trees);treeBase.dispose();trunkBase.dispose();
 groups.Trees.traverse(object => {
   if (object.material?.isMeshStandardMaterial) lighting.weatherSurface(object.material, .78, .55);
 });
 // Named landmarks are deliberately stylized volumes, separate and editable in Blender.
 function pagoda(name,c,levels,tall,radius){const g=new THREE.Group();g.name=name;const[x,z]=project(c),y=terrainAt(x,z);g.position.set(x,y+.006,z);groups.Landmarks.add(g);const add=(geo,m,n,h)=>{geo.translate(0,h,0);return mesh(geo,m,n,g)};add(new THREE.CylinderGeometry(radius*1.3,radius*1.4,.008,8),materials.stone,'Stone_Platform',.004);for(let i=0;i<levels;i++){const h=tall/levels,rad=radius*(1-i/(levels+2)*.52);add(new THREE.CylinderGeometry(rad*.75,rad*.8,h*.72,8),i===0?materials.stone:materials.wood,'Tower_Level_'+(i+1),.008+i*h+h*.36);add(new THREE.CylinderGeometry(rad*.45,rad*1.14,h*.23,8),materials.roof,'Eaves_'+(i+1),.008+i*h+h*.83);add(new THREE.CylinderGeometry(rad*.85,rad*.85,.002,8),materials.gold,'Balcony_'+(i+1),.008+i*h+.004)}add(new THREE.ConeGeometry(radius*.2,.025,8),materials.gold,'Finial',tall+.022);return g}
 pagoda('Leifeng_Pagoda_Concept', places[4].c, 5, .057, .018);
 const [towerX, towerZ] = project(places[5].c);
 const tower = new THREE.Group();
 tower.name = 'Baochu_Pagoda_Brick_Octagon';
 tower.position.set(towerX, terrainAt(towerX, towerZ), towerZ);
 groups.Landmarks.add(tower);
 const brick = mat('Baochu_Warm_Brick', 0x958473);
 const towerBase = new THREE.CylinderGeometry(.0053, .0057, .002, 8);
 towerBase.translate(0, .001, 0);
 mesh(towerBase, materials.stone, 'Octagonal_Footing', tower);
 for (let level = 0; level < 7; level++) {
   const width = .0044 - level * .00031;
   const body = new THREE.CylinderGeometry(width - .00018, width, .0054, 8);
   body.translate(0, .0047 + level * .0054, 0);
   mesh(body, brick, 'Brick_Level_' + (level + 1), tower);
   const ledge = new THREE.CylinderGeometry(width * 1.1, width, .0007, 8);
   ledge.translate(0, .0069 + level * .0054, 0);
   mesh(ledge, brick, 'Brick_Cornice_' + (level + 1), tower);
 }
 const finial = new THREE.ConeGeometry(.0014, .004, 8);
 finial.translate(0, .043, 0);
 mesh(finial, materials.roof, 'Tower_Finial', tower);
 const [rockX, rockZ] = project(places[6].c);
 const rock = new THREE.DodecahedronGeometry(1, 0);
 rock.scale(.010, .005, .007);
 rock.rotateY(.38);
 rock.translate(rockX - .005, terrainAt(rockX - .005, rockZ + .011) + .003, rockZ + .011);
 mesh(rock, mat('Baoshi_Exposed_Rock', 0x978676), 'Hama_Peak_Rock_Concept', groups.Landmarks);
 const lanterns = buildStoneLanterns({ project, mesh, mat, materials });
 groups.Landmarks.add(lanterns.group);
 waterfrontViews.set('moon', [
   { id: 'all', label: '三塔全景', ...lanterns.center, place: 'moon', towers: lanterns.features },
   ...lanterns.features.map(tower => ({ ...tower, y: tower.y + tower.height * .49, place: 'moon',
     distance: .0068, mobileFit: 1.62, direction: new THREE.Vector3(.21, .34, .94) }))
 ]);
 function addMarker(name, x, z, height, index = -1) {
   const el = document.createElement(index < 0 ? 'span' : 'button');
   el.className = 'map-label' + (index < 0 ? ' route-marker' : '');
   el.textContent = name;
   if (index >= 0) {
     el.type = 'button';
     el.dataset.place = places[index].id;
     const place = places[index];
     el.title = mapStopName(place);
     if (place.dining) {
       markDiningPrice(el, place.dining.price);
       el.textContent += ' · ' + el.dataset.diningPrice;
       el.setAttribute('aria-label', el.title);
     }
     el.addEventListener('click', () => setActive(index, el));
   }
   $('#labels').appendChild(el);
   labels.push({el, position: new THREE.Vector3(x, Math.max(.03, terrainAt(x,z)) + height, z), i:index});
 }
 for (let i = 1; i < places.length; i++) {
   const place = places[i], [x,z] = project(place.c);
   addMarker(place.dining?.label ?? place.name, x, z, place.markerHeight ?? .025, i);
 }
 for (const stop of tripStops(places)) {
   const [x,z] = project(stop.c);
   const el = document.createElement('button');
   el.type = 'button';
   el.className = 'map-label trip-choice';
   el.dataset.tripStop = stop.id;
   el.textContent = stop.dining?.label ?? stop.name;
   if (stop.dining) {
     markDiningPrice(el, stop.dining.price);
     el.textContent += ' · ' + el.dataset.diningPrice;
     el.title = mapStopName(stop);
   }
   el.hidden = true;
   el.addEventListener('click', () => tripPlanner.pick(stop.id));
   $('#labels').append(el);
   labels.push({el, position:new THREE.Vector3(x, Math.max(.03,terrainAt(x,z)) + .025,z), i:-1, tripStop:stop});
 }
 for (const [place, views] of waterfrontViews) {
   if (place === 'duanqiao') continue;
   for (const view of views.filter(view => view.id !== 'all')) addWaterfrontMarker(view, place);
 }
 for (const {route} of mappedRoutes) {
   addEntranceMarker(route, route.name, route.legs[0].coordinates[0]);
   if (route.reference) addEntranceMarker(route, route.reference.name, route.reference.coordinates, true);
 }
 addLakeBoats();
 const waterfront = {
   causeways: causeways.map(({id, bridges}) => ({id, bridges: bridges.map(({id,label,x,z,span}) => ({id,label,x,z,span}))})),
   stonePagodas: lanterns.features.map(({id,x,y,z,height}) => ({id,x,y,z,height, inWater: inWater(x,z)}))
 };
 Object.assign(model.userData, {treeCount: count, buildingCount: buildings.count, roadSegments: d.roads.length, waterfront});
 loaded = true;
 window.__model = model;
 window.__stats = {trees:count,buildings:buildings.count,sourcedHeight:buildings.sourcedHeight,roads:d.roads.length,waterfront,
   trails:mappedRoutes.map(({route,geometry})=>({id:route.id,name:route.name,meters:Math.round(geometry.length),start:route.legs[0].coordinates[0]}))};
}

function addWaterfrontMarker(view, place) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'map-label waterfront-marker' + (place === 'moon' ? ' stone-tower-marker' : '');
  el.textContent = view.label;
  el.hidden = true;
  el.addEventListener('click', () => focusWaterfront(view.id));
  $('#labels').appendChild(el);
  const height = place === 'moon' ? view.height * .51 : view.height;
  labels.push({el, position: new THREE.Vector3(view.x, view.y + height, view.z), i: -1, waterfront: view.id, place});
}

function addEntranceMarker(route, name, coordinates, reference = false) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'map-label route-marker' + (reference ? ' route-reference' : '');
  el.textContent = name;
  el.title = name;
  el.setAttribute('aria-label', name + (reference ? ' · 入口位置参考' : ' · 选择上山路线'));
  el.style.setProperty('--trail-color', route.color);
  el.addEventListener('click', () => showTrail(route.id, el));
  const [x, z] = project(coordinates);
  $('#labels').appendChild(el);
  labels.push({el, position: new THREE.Vector3(x, terrainAt(x,z) + .029, z), i:-1, routeId:route.id, reference});
}
async function start() {
  try {
    const [base, footprintData] = await Promise.all([
      loadData('westlake.json'),
      loadData('building-footprints.json')
    ]);
    await new Promise(resolve => setTimeout(resolve, 30));
    build(base, footprintData);
    $('#loader').classList.add('hidden');
    window.__ready = true;
  } catch (error) {
    console.error(error);
    $('#loader').innerHTML = '<strong>模型加载失败</strong><p>请刷新页面后重试。</p><button onclick="location.reload()">重新加载</button>';
  }
}

async function loadData(name) {
  const embedded = document.querySelector('[data-atlas-data="' + name + '"]');
  if (embedded) return JSON.parse(embedded.textContent);
  const response = await fetch('./' + name);
  if (!response.ok) throw new Error(name + ': ' + response.status);
  return response.json();
}
function resize() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  updateFieldOfView();
  if (waterfrontFocus?.id === 'all' && followTowerPresetOnResize) flyToPlace(selected);
  else updateInspectionFraming();
}

function updateFieldOfView() {
  const minimumHorizontalFov = THREE.MathUtils.degToRad(44);
  const verticalFovForNarrowScreen = 2 * Math.atan(Math.tan(minimumHorizontalFov / 2) / camera.aspect);
  const defaultFov = stage.dataset.view === 'sky' ? 76 : 39;
  camera.fov = Math.max(defaultFov, THREE.MathUtils.radToDeg(verticalFovForNarrowScreen));
  camera.updateProjectionMatrix();
}

function fitTowerGroup(target, towers) {
  const {clientWidth: width, clientHeight: height} = stage;
  const details = $('#atlas-details');
  const mobile = compactLayout.matches;
  const abovePanel = { left: 16, right: width - (mobile ? 64 : 20), top: 65, bottom: details.offsetTop - 8 };
  const besidePanel = { left: 34, right: details.offsetLeft - 18, top: 85, bottom: height - 50 };
  const focalLength = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const samples = towers.map(tower => ({
    center: new THREE.Vector3(tower.x, tower.y + tower.height / 2, tower.z).sub(target),
    radius: tower.height * .63,
    labelWidth: 17 + tower.label.length * 6.5
  }));

  function fit(frame, elevation) {
    const direction = new THREE.Vector3(.64, elevation, .77).normalize();
    const right = new THREE.Vector3(direction.z, 0, -direction.x).normalize();
    const up = direction.clone().cross(right);
    const frameWidth = frame.right - frame.left, frameHeight = frame.bottom - frame.top;

    // Project the towers and reserve room above each for its tappable name label.
    function bounds(distance) {
      const edges = samples.map(({center, radius, labelWidth}) => {
        const scale = focalLength / (distance - center.dot(direction));
        const x = center.dot(right) * scale, y = -center.dot(up) * scale;
        const extent = radius * scale;
        return [x - Math.max(extent, labelWidth), x + Math.max(extent, labelWidth), y - extent - 32, y + extent];
      });
      return [Math.min(...edges.map(edge => edge[0])), Math.max(...edges.map(edge => edge[1])),
        Math.min(...edges.map(edge => edge[2])), Math.max(...edges.map(edge => edge[3]))];
    }
    let near = .065, far = .42;
    for (let step = 0; step < 14; step++) {
      const distance = (near + far) / 2;
      const [left, right, top, bottom] = bounds(distance);
      if (right - left <= frameWidth && bottom - top <= frameHeight) far = distance;
      else near = distance;
    }
    const [left, rightEdge, top, bottom] = bounds(far);
    return { direction, distance: far, x: (frame.left + frame.right - left - rightEdge) / 2,
      y: (frame.top + frame.bottom - top - bottom) / 2 };
  }
  const elevation = THREE.MathUtils.clamp(.15 + (abovePanel.bottom - abovePanel.top - 72) * .0025, .16, .32);
  let view = fit(abovePanel, elevation);
  if (!mobile && besidePanel.right - besidePanel.left > 120) {
    const sideView = fit(besidePanel, .45);
    if (sideView.distance < view.distance) view = sideView;
  }
  camera.setViewOffset(width, height, width / 2 - view.x, height / 2 - view.y, width, height);
  return target.clone().addScaledVector(view.direction, view.distance);
}

function updateInspectionFraming() {
  const {clientWidth: width, clientHeight: height} = stage;
  if (!width || !height) return;
  const showDetails = !$('#atlas-details').hidden;
  if (showDetails && tripBounds) { tripViewOffset(); return; }
  if (showDetails && compactLayout.matches) {
    const placeTop = $('#atlas-details').offsetTop;
    const detailOffset = .5 - (placeTop + 64) / (2 * height);
    const offset = groups.HikingTrail.visible ? (activeTrail ? .19 : .12) : waterfrontFocus ? detailOffset : .20;
    camera.setViewOffset(width, height, 0, height * offset, width, height);
  } else if (showDetails && width > 920 && waterfrontFocus) {
    camera.setViewOffset(width, height, width * .115, height * .035, width, height);
  } else if (showDetails && width > 920 && groups.HikingTrail.visible) {
    camera.setViewOffset(width, height, width * .07, height * .085, width, height);
  } else {
    camera.clearViewOffset();
  }
}
new ResizeObserver(resize).observe(stage);resize();
const proj=new THREE.Vector3();
const routeObstacles = [...stage.querySelectorAll('.stage-top > *, .tools')];
function updateLabels() {
  const width = stage.clientWidth, height = stage.clientHeight;
  const trailVisible = groups.HikingTrail.visible;
  const night = document.documentElement.dataset.lighting === 'night';
  const picking = stage.hasAttribute('data-trip-picking');
  const showDining = stage.hasAttribute('data-dining-labels');
  const obstacleRects = picking || (night && trailVisible) ? routeObstacles.map(element => element.getBoundingClientRect()) : [];
  const stageRect = obstacleRects.length ? stage.getBoundingClientRect() : null;
  const detailPanel = $('#atlas-details');
  const detail = detailPanel.hidden ? null : {
    left: detailPanel.offsetLeft, top: detailPanel.offsetTop,
    right: detailPanel.offsetLeft + detailPanel.offsetWidth,
    bottom: detailPanel.offsetTop + detailPanel.offsetHeight
  };
  const positions = [];
  const priority = label => label.tripStop ? (label.el.dataset.mark ? 8 : 7) : label.waterfront ? 6 : label.routeId
    ? (label.routeId === activeTrail ? 4 : label.reference ? 2 : 3)
    : label.i === selected ? 5 : places[label.i]?.region ? .8 : 1;
  const ordered = labels.slice().sort((a, b) => priority(b) - priority(a));
  for (const label of ordered) {
    if (picking !== Boolean(label.tripStop)) { label.el.hidden = true; continue; }
    if (!showDining && (label.tripStop?.dining || places[label.i]?.dining)) {
      label.el.hidden = true;
      continue;
    }
    const place = places[selected]?.id;
    const showWaterfront = label.waterfront && detail && place === label.place && (
      place === 'moon' ? groups.Landmarks.visible && waterfrontFocus?.id === 'all' : groups.Roads.visible && !waterfrontFocus);
    const expanded = places[label.i]?.region;
    const placeLayerVisible = !expanded || label.i === selected || (!trailVisible && !waterfrontFocus);
    const showPlace = label.i >= 0 && placeLayerVisible && !(label.i === selected && waterfrontFocus) && !(
      place === 'baidi' && places[label.i].id === 'duanqiao');
    if (!label.tripStop && !showWaterfront && !showPlace && !(label.routeId && trailVisible)) { label.el.hidden = true; continue; }
    proj.copy(label.position).project(camera);
    const x = (proj.x * .5 + .5) * width, anchorY = (-proj.y * .5 + .5) * height;
    let y = anchorY - (label.waterfront && label.place === 'moon' ? 8 : 0);
    const expandedClearance = label.tripStop ? Math.ceil(label.el.textContent.length * 6.5 + 20)
      : label.routeId && night
      ? 18 + label.el.textContent.length * 7
      : 16 + label.el.textContent.length * 6.5;
    const fits = (clearance, top) => {
      const overlapsPanel = detail && x + clearance > detail.left && x - clearance < detail.right
        && top > detail.top && top - 32 < detail.bottom;
      const overlapsControls = (label.routeId || label.tripStop) && obstacleRects.some(rect => (
        x + stageRect.left + clearance > rect.left && x + stageRect.left - clearance < rect.right
        && top + stageRect.top > rect.top && top + stageRect.top - (picking ? 44 : 30) < rect.bottom
      ));
      const overlapsLabel = positions.some(p => Math.abs(p.x - x) < p.clearance + clearance && Math.abs(p.y - top) < (picking ? 45 : 26));
      return top > 75 && top < height - 35 && x > clearance && x < width - clearance
        && !overlapsPanel && !overlapsControls && !overlapsLabel;
    };
    const asDot = (label.routeId || label.tripStop || (expanded && label.i !== selected)) && !fits(expandedClearance, y);
    const clearance = asDot ? (picking || label.el.dataset.diningPrice ? 22 : 13) : expandedClearance;
    if ((label.routeId || label.tripStop) && asDot && !fits(clearance, y)) {
      for (const offset of [16, 32, 48, 64]) {
        if (fits(clearance, anchorY - offset)) {
          y = anchorY - offset;
          break;
        }
      }
    }
    const visible = proj.z < 1 && proj.z > -1 && fits(clearance, y);
    label.el.hidden = !visible;
    if (!visible) continue;
    if (label.tripStop) {
      label.el.classList.toggle('trip-choice-dot', Boolean(asDot));
      label.el.style.setProperty('--leader', (16 + anchorY - y) + 'px');
    }
    if (expanded) label.el.classList.toggle('place-dot', Boolean(asDot));
    if (label.routeId) {
      label.el.classList.toggle('route-dot', Boolean(asDot));
      label.el.classList.toggle('route-active', label.routeId === activeTrail);
      label.el.style.setProperty('--leader', (16 + anchorY - y) + 'px');
    }
    positions.push({x, y, clearance});
    label.el.style.left = x + 'px';
    label.el.style.top = y + 'px';
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  if (flight) {
    const time = Math.min(1, (now - flight.start) / 1100);
    const ease = 1 - Math.pow(1 - time, 4);
    camera.position.lerpVectors(flight.from, flight.to, ease);
    controls.target.lerpVectors(flight.fromTarget, flight.target, ease);
    if (time === 1) flight = null;
  }
  controls.update();
  const near = THREE.MathUtils.clamp(controls.getDistance() * .026, .00015, .008);
  if (camera.near !== near) { camera.near = near; camera.updateProjectionMatrix(); }
  lighting.update(now, camera);
  renderer.render(scene, camera);
  $('#compass').style.transform = 'rotate(' + (-controls.getAzimuthalAngle() * 180 / Math.PI) + 'deg)';
  updateLabels();
  updateTripPins();
}
requestAnimationFrame(animate);
controls.addEventListener('start',()=>{flight=null;followTowerPresetOnResize=false});
for (const control of ['view-top', 'north', 'zoom-in', 'zoom-out', 'rotate']) {
  $('#' + control).addEventListener('click', () => { followTowerPresetOnResize = false; });
}
$('#reset').onclick=()=>setActive(0);
$('#view-perspective').onclick=()=>flyToPlace(selected);
$('#view-top').onclick = () => {
  if (stage.dataset.view === 'sky') setActive(0);
  const target = controls.target.clone(), distance = Math.max(controls.getDistance(), waterfrontFocus ? .009 : .5);
  setViewMode('top');
  fly(target.clone().add(new THREE.Vector3(0, distance, .0001)), target);
};
$('#view-sky').onclick = () => {
  setActive(0);
  setViewMode('sky');
  fly(new THREE.Vector3(1.13, .123, -.38), new THREE.Vector3(-1.25, .545, -.21));
};
$('#north').onclick=()=>{const t=controls.target.clone(),d=controls.getDistance(),a=controls.getPolarAngle();fly(t.clone().add(new THREE.Vector3(0,Math.cos(a)*d,Math.sin(a)*d)),t)};
function zoom(f){const target=controls.target.clone(),dir=camera.position.clone().sub(target);dir.setLength(THREE.MathUtils.clamp(dir.length()*f,controls.minDistance,controls.maxDistance));fly(target.clone().add(dir),target)}
$('#zoom-in').onclick = () => zoom(compactLayout.matches ? .84 : .75);
$('#zoom-out').onclick = () => zoom(compactLayout.matches ? 1 / .84 : 1.3);
$('#rotate').onclick=()=>{flight=null;controls.autoRotate=!controls.autoRotate;$('#rotate').setAttribute('aria-pressed',String(controls.autoRotate))};
$('#capture').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.download='西湖空间图志.png';a.href=canvas.toDataURL('image/png');a.click()};
for(const [id,names]of[['buildings',['Buildings','Landmarks']],['trees',['Trees']],['roads',['Roads']]])$('#layer-'+id).onchange=e=>names.forEach(n=>groups[n].visible=e.target.checked);
$('#layer-labels').onchange=e=>$('#labels').style.visibility=e.target.checked?'visible':'hidden';
const diningLayer = $('#layer-dining');
const tripDiningButton = $('#trip-map-dining');
const diningKeys = [...document.querySelectorAll('.dining-price-key')];
for (const key of diningKeys) {
  diningPriceBands.forEach((band, tier) => {
    const item = document.createElement('li');
    item.dataset.diningTier = tier;
    item.textContent = band.label;
    key.append(item);
  });
}
const diningPreference = 'westlake-dining-labels';
function setDiningLabels(visible) {
  stage.toggleAttribute('data-dining-labels', visible);
  diningLayer.checked = visible;
  tripDiningButton.setAttribute('aria-pressed', String(visible));
  for (const key of diningKeys) key.hidden = !visible;
}
try { setDiningLabels(localStorage.getItem(diningPreference) === 'true'); } catch { setDiningLabels(false); }
function changeDiningLabels(visible) {
  setDiningLabels(visible);
  try { localStorage.setItem(diningPreference, String(visible)); } catch {}
}
diningLayer.addEventListener('change', () => changeDiningLabels(diningLayer.checked));
tripDiningButton.addEventListener('click', () => changeDiningLabels(!diningLayer.checked));
const layerButton = $('#mobile-layers');
const layerPanel = $('#spatial-layers');
function closeMobileLayers() {
  layerButton.setAttribute('aria-expanded', 'false');
}
layerButton.addEventListener('click', () => {
  const expanded = layerButton.getAttribute('aria-expanded') === 'true';
  layerButton.setAttribute('aria-expanded', String(!expanded));
});
document.addEventListener('pointerdown', event => {
  if (!layerButton.contains(event.target) && !layerPanel.contains(event.target)) closeMobileLayers();
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || layerButton.getAttribute('aria-expanded') !== 'true') return;
  closeMobileLayers();
  layerButton.focus();
});
$('#about-open').onclick=()=>$('#about').showModal();$('#about-close').onclick=()=>$('#about').close();$('#about').addEventListener('click',e=>{if(e.target===$('#about')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
const modelDownloads = $('.downloads');
if (modelDownloads) {
  const sidebar = modelDownloads.parentElement;
  function placeDownloads() {
    const destination = compactLayout.matches ? $('#about-downloads') : sidebar;
    if (modelDownloads.parentElement !== destination) destination.append(modelDownloads);
  }
  placeDownloads();
  compactLayout.addEventListener('change', placeDownloads);
}
window.exportGLB=async()=>{const {GLTFExporter}=await import('./GLTFExporter.js');const visible=Object.values(groups).map(g=>g.visible);Object.values(groups).forEach(g=>g.visible=true);try{const buffer=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:false});const bytes=new Uint8Array(buffer);let str='';for(let i=0;i<bytes.length;i+=32768)str+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(str)}finally{Object.values(groups).forEach((g,i)=>g.visible=visible[i])}};
window.__sceneDiagnostics=()=>({ready:loaded,geometries:renderer.info.memory.geometries,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,camera:camera.position.toArray(),target:controls.target.toArray(),groups:Object.fromEntries(Object.entries(groups).map(([k,g])=>[k,g.visible]))});
start();



