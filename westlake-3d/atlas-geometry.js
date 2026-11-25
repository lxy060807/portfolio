import * as THREE from 'three';
import { mergeGeometries } from './BufferGeometryUtils.js';

const roofCap = new THREE.MeshStandardMaterial({ color: '#b8b8ad', roughness: .92 });
const knownRoofCap = new THREE.MeshStandardMaterial({ color: '#a4ada3', roughness: .9 });
const wallStone = new THREE.MeshStandardMaterial({ color: '#e1ded1', roughness: .92 });
roofCap.name = 'Mapped_Roofs_Approximate_Height';
knownRoofCap.name = 'Mapped_Roofs_Source_Height';
wallStone.name = 'Building_Walls';

function buffer(vertices, faces) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return geometry;
}

function footprintRing(coordinates, project, hole) {
  const ring = coordinates.map(project).filter((point, i, points) =>
    i === 0 || point[0] !== points[i - 1][0] || point[1] !== points[i - 1][1]);
  if (ring.length > 1 && ring.at(-1).every((value, i) => value === ring[0][i])) ring.pop();
  if (ring.length < 3) return [];
  const area = ring.reduce((sum, [x, z], i) => {
    const [nextX, nextZ] = ring[(i + 1) % ring.length];
    return sum + x * nextZ - z * nextX;
  }, 0);
  if ((area > 0) === hole) ring.reverse();
  return ring;
}

export function createBuildingLayer(buildings, { project, terrainAt, inWater, excludedPoints }) {
  const group = new THREE.Group();
  const walls = { v: [], f: [] };
  const roofs = { v: [], f: [] };
  const knownRoofs = { v: [], f: [] };
  const footprintCells = new Map();
  const cellSize = .07;
  let count = 0;
  let sourcedHeight = 0;

  for (const building of buildings) {
    const outer = footprintRing(building.c, project, false);
    if (!outer.length) continue;
    const holes = (building.holes ?? []).map(ring => footprintRing(ring, project, true)).filter(ring => ring.length);
    const x = outer.reduce((sum, point) => sum + point[0], 0) / outer.length;
    const z = outer.reduce((sum, point) => sum + point[1], 0) / outer.length;
    if (inWater(x, z) || excludedPoints.some(([px, pz, radius]) => Math.hypot(x - px, z - pz) < radius)) continue;
    const mappedHeight = building.h || building.levels * 3 || 0;
    const footprintHeight = Math.min(260, mappedHeight || 5.5) / 1000;
    const terrainHeights = outer.map(([px, pz]) => terrainAt(px, pz));
    const top = Math.max(...terrainHeights, terrainAt(x, z)) + footprintHeight;
    const bottom = Math.min(...terrainHeights) - .002;
    const roof = mappedHeight ? knownRoofs : roofs;
    const rings = [outer, ...holes];
    const projected = rings.map(ring => ring.map(([px, pz]) => new THREE.Vector2(px, pz)));
    const faces = THREE.ShapeUtils.triangulateShape(projected[0], projected.slice(1));
    if (!faces.length) continue;
    const roofPoints = projected.flat();
    const roofStart = roof.v.length / 3;
    for (const point of roofPoints) roof.v.push(point.x, top, point.y);
    for (const [a, b, c] of faces) {
      const p = roofPoints[a], q = roofPoints[b], r = roofPoints[c];
      const up = (q.y - p.y) * (r.x - p.x) - (q.x - p.x) * (r.y - p.y);
      roof.f.push(roofStart + a, roofStart + (up > 0 ? b : c), roofStart + (up > 0 ? c : b));
    }
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
        const start = walls.v.length / 3;
        walls.v.push(ax, bottom, az, bx, bottom, bz, bx, top, bz, ax, top, az);
        walls.f.push(start, start + 2, start + 1, start, start + 3, start + 2);
      }
    }
    const minX = Math.min(...outer.map(point => point[0]));
    const minZ = Math.min(...outer.map(point => point[1]));
    const maxX = Math.max(...outer.map(point => point[0]));
    const maxZ = Math.max(...outer.map(point => point[1]));
    for (let gx = Math.floor(minX / cellSize); gx <= Math.floor(maxX / cellSize); gx++) {
      for (let gz = Math.floor(minZ / cellSize); gz <= Math.floor(maxZ / cellSize); gz++) {
        const key = gx + ':' + gz;
        if (!footprintCells.has(key)) footprintCells.set(key, []);
        footprintCells.get(key).push({ c: outer, b: [minX, minZ, maxX, maxZ] });
      }
    }
    count++;
    if (mappedHeight) sourcedHeight++;
  }
  const meshes = [
    [walls, wallStone, 'Mapped_Building_Walls'],
    [roofs, roofCap, 'Roofs_5_5m_Illustrative'],
    [knownRoofs, knownRoofCap, 'Roofs_Height_Or_Storeys_In_Data']
  ];
  for (const [data, material, name] of meshes) {
    if (!data.f.length) continue;
    const mesh = new THREE.Mesh(buffer(data.v, data.f), material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return {
    group, count, sourcedHeight,
    nearbyFootprints: (x, z) => footprintCells.get(Math.floor(x / cellSize) + ':' + Math.floor(z / cellSize)) ?? []
  };
}

function ribbon(points, width, elevation, terrainAt) {
  const vertices = [];
  const faces = [];
  points.forEach(([x, z], index) => {
    const before = points[Math.max(0, index - 1)], after = points[Math.min(points.length - 1, index + 1)];
    const dx = after[0] - before[0], dz = after[1] - before[1];
    const factor = width / (2 * (Math.hypot(dx, dz) || 1));
    const sx = dz * factor, sz = -dx * factor;
    vertices.push(x + sx, terrainAt(x + sx, z + sz) + elevation, z + sz);
    vertices.push(x - sx, terrainAt(x - sx, z - sz) + elevation, z - sz);
    const first = index * 2;
    if (index) faces.push(first - 2, first - 1, first, first - 1, first + 1, first);
  });
  return buffer(vertices, faces);
}

function trailMesh(geometry, color, name) {
  const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, toneMapped: false });
  material.name = name;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  return mesh;
}

function interpolateTrailEdge([ax, az], [bx, bz]) {
  const distance = Math.hypot(bx - ax, bz - az);
  const steps = Math.max(1, Math.ceil(distance / .003));
  return Array.from({ length: steps + 1 }, (_, i) => [ax + (bx - ax) * i / steps, az + (bz - az) * i / steps]);
}

export function createTrailLayer(route, project, terrainAt, widths = { outline:.019, line:.011 }) {
  const group = new THREE.Group();
  group.name = 'Trail_' + route.id;
  let length = 0;
  const points = [];
  for (const leg of route.legs) {
    const segment = leg.coordinates.map(project);
    for (let i = 1; i < segment.length; i++) {
      const [ax, az] = segment[i - 1], [bx, bz] = segment[i];
      length += Math.hypot(bx - ax, bz - az) * 1000;
      points.push(...interpolateTrailEdge(segment[i - 1], segment[i]).slice(0, -1));
    }
  }
  points.push(project(route.legs.at(-1).coordinates.at(-1)));
  group.add(trailMesh(ribbon(points, widths.outline, .013, terrainAt), '#fff8eb', 'Trail_Outline'));
  group.add(trailMesh(ribbon(points, widths.line, .014, terrainAt), route.color, 'Mapped_Trail'));
  return {group, length, points};
}

export function createTrailOverview(routes, project, terrainAt) {
  const network = new THREE.Group();
  network.name = 'Baoshi_Hill_Entrance_Network';
  const edges = new Map();
  for (const route of routes) {
    for (const leg of route.legs) {
      for (let i = 1; i < leg.nodes.length; i++) {
        const key = [leg.nodes[i - 1], leg.nodes[i]].sort().join(':');
        const entry = edges.get(key);
        if (entry) {
          entry.routes.add(route.id);
        } else {
          edges.set(key, {
            coordinates: [leg.coordinates[i - 1], leg.coordinates[i]],
            routes: new Set([route.id])
          });
        }
      }
    }
  }

  const outlines = [];
  const lines = new Map([['shared', []], ...routes.map(route => [route.id, []])]);
  for (const {coordinates, routes: members} of edges.values()) {
    const points = interpolateTrailEdge(...coordinates.map(project));
    const key = members.size > 1 ? 'shared' : members.values().next().value;
    outlines.push(ribbon(points, .019, .011, terrainAt));
    lines.get(key).push(ribbon(points, .011, .012, terrainAt));
  }
  const mergeAndDispose = geometries => {
    const result = mergeGeometries(geometries);
    geometries.forEach(geometry => geometry.dispose());
    return result;
  };
  network.add(trailMesh(mergeAndDispose(outlines), '#fff8eb', 'Network_Outline'));
  for (const [key, geometries] of lines) {
    if (!geometries.length) continue;
    const color = key === 'shared' ? '#4b5351' : routes.find(route => route.id === key).color;
    network.add(trailMesh(mergeAndDispose(geometries), color, 'Network_' + key));
  }
  for (const route of routes) {
    const [x,z] = project(route.legs[0].coordinates[0]);
    const marker = new THREE.SphereGeometry(.009, 12, 8);
    marker.translate(x, terrainAt(x,z) + .014, z);
    network.add(trailMesh(marker, route.color, 'Entrance_' + route.id));
  }
  return network;
}
