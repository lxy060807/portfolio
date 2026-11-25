const anchors = {
  // The ordering of the long causeways remains useful as separate trip endpoints.
  sudi: { name: '苏堤南口', c: [120.1397001, 30.2309416] },
  baidi: { name: '白堤西口（平湖秋月）', c: [120.1402059, 30.2535121] },
  moon: { water: true },
  huxin: { water: true },
  ruangong: { water: true }
};

export function tripStops(places) {
  return [
    ...places.filter(place => place.id !== 'overview').map(place => ({ ...place, ...anchors[place.id] })),
    { id: 'sudi-north', name: '苏堤北口（北山街）', c: [120.1308621,30.2539615] }
  ];
}

const metres = (a, b) => Math.hypot((a[0] - b[0]) * 96160, (a[1] - b[1]) * 111320);
const roadLabel = (name, kind) => name || ({ steps:'台阶', footway:'人行步道', path:'景区步道',
  pedestrian:'步行道', cycleway:'自行车道', service:'支路' }[kind] ?? '连接道路');

class MinHeap {
  items = [];
  push(node, cost) {
    const values = this.items;
    let i = values.length;
    values.push([node, cost]);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (values[parent][1] <= cost) break;
      values[i] = values[parent];
      i = parent;
    }
    values[i] = [node,cost];
  }
  pop() {
    const values = this.items, result = values[0], last = values.pop();
    if (!values.length) return result;
    let i = 0;
    while (i * 2 + 1 < values.length) {
      let child = i * 2 + 1;
      if (child + 1 < values.length && values[child + 1][1] < values[child][1]) child++;
      if (last[1] <= values[child][1]) break;
      values[i] = values[child];
      i = child;
    }
    values[i] = last;
    return result;
  }
}

function search(graph, start, reached, costOf, maxCost = Infinity) {
  const best = new Float64Array(graph.length).fill(Infinity);
  const previous = new Array(graph.length);
  const queue = new MinHeap();
  best[start] = 0;
  queue.push(start, 0);
  while (queue.items.length) {
    const [node, cost] = queue.pop();
    if (cost !== best[node]) continue;
    if (reached(node)) {
      const edges = [];
      for (let end = node; end !== start;) {
        const edge = previous[end];
        edges.push(edge);
        end = edge.from;
      }
      return { node, edges: edges.reverse(), cost };
    }
    for (const edge of graph[node]) {
      const nextCost = cost + costOf(edge);
      if (nextCost >= best[edge.to] || nextCost > maxCost) continue;
      best[edge.to] = nextCost;
      previous[edge.to] = edge;
      queue.push(edge.to, nextCost);
    }
  }
  return null;
}

function largestNetwork(graph, back) {
  const scanned = new Uint8Array(graph.length);
  let largest = [];
  for (let start = 0; start < graph.length; start++) {
    if (scanned[start] || (!graph[start].length && !back[start].length)) continue;
    const part = [start];
    scanned[start] = 1;
    for (let i = 0; i < part.length; i++) {
      for (const edges of [graph[part[i]], back[part[i]]]) for (const edge of edges) {
        if (scanned[edge.to]) continue;
        scanned[edge.to] = 1;
        part.push(edge.to);
      }
    }
    if (part.length > largest.length) largest = part;
  }
  return new Set(largest);
}

function shortestVisitOrder(costs) {
  const count = costs.length;
  if (count > 10) {
    // Compare a route from every possible first stop without building an exponential table.
    let bestOrder = null, bestCost = Infinity;
    for (let start = 0; start < count; start++) {
      const order = [start], remaining = new Set(costs.keys());
      let total = 0;
      remaining.delete(start);
      while (remaining.size) {
        const row = costs[order.at(-1)];
        let next = -1, cheapest = Infinity;
        for (const index of remaining) {
          if (row[index] < cheapest) { next = index; cheapest = row[index]; }
        }
        if (next < 0) break;
        order.push(next);
        remaining.delete(next);
        total += cheapest;
      }
      if (!remaining.size && total < bestCost) { bestOrder = order; bestCost = total; }
    }
    return bestOrder;
  }

  // Each state tracks the visited stops and the last stop, with either endpoint free.
  const masks = 1 << count;
  const best = new Float64Array(masks * count).fill(Infinity);
  const previous = new Int8Array(best.length).fill(-1);
  for (let i = 0; i < count; i++) best[(1 << i) * count + i] = 0;
  for (let mask = 1; mask < masks - 1; mask++) {
    for (let last = 0; last < count; last++) {
      const cost = best[mask * count + last];
      if (!Number.isFinite(cost)) continue;
      for (let next = 0; next < count; next++) {
        const bit = 1 << next;
        if (mask & bit) continue;
        const state = (mask | bit) * count + next;
        const total = cost + costs[last][next];
        if (total < best[state]) { best[state] = total; previous[state] = last; }
      }
    }
  }
  let mask = masks - 1, last = 0;
  const offset = mask * count;
  for (let i = 1; i < count; i++) if (best[offset + i] < best[offset + last]) last = i;
  if (!Number.isFinite(best[offset + last])) return null;
  const order = [];
  while (last >= 0) {
    order.push(last);
    const prior = previous[mask * count + last];
    mask ^= 1 << last;
    last = prior;
  }
  return order.reverse();
}

export function createTripNetwork(data) {
  const vertices = data.vertices;
  const walk = vertices.map(() => []), walkBack = vertices.map(() => []);
  const bike = vertices.map(() => []), bikeBack = vertices.map(() => []);

  function edge(graph, back, from, to, road, distance) {
    graph[from].push({ from, to, road, distance });
    back[to].push({ from:to, to:from, road, distance });
  }
  for (const [id,name,kind,mask,nodes] of data.roads) {
    const road = {id,name:roadLabel(name,kind),kind};
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i-1], b = nodes[i], distance = metres(vertices[a],vertices[b]);
      if (distance < .01) continue;
      const blocked = vertices[a][2] | vertices[b][2];
      if (!(blocked & 1)) {
        if (mask & 1) edge(walk,walkBack,a,b,road,distance);
        if (mask & 2) edge(walk,walkBack,b,a,road,distance);
      }
      if (!(blocked & 2)) {
        if (mask & 4) edge(bike,bikeBack,a,b,road,distance);
        if (mask & 8) edge(bike,bikeBack,b,a,road,distance);
      }
    }
  }

  const usableFoot = largestNetwork(walk, walkBack);
  const usableBike = largestNetwork(bike, bikeBack);
  const bikeEntries = new Map(), bikeExits = new Map();
  function anchor(stop, incoming, outgoing) {
    let node = -1, gap = 155;
    for (const i of usableFoot) {
      const distance = metres(stop.c, vertices[i]);
      if (distance >= gap || (incoming && !walkBack[i].length) || (outgoing && !walk[i].length)) continue;
      node = i;
      gap = distance;
    }
    return node < 0 ? null : { node, gap };
  }

  function walkCost(edge) {
    return edge.distance * (edge.road.kind === 'steps' ? 1.55 : 1);
  }

  function bikeCost(edge) {
    const main = ['primary','primary_link','secondary','secondary_link'].includes(edge.road.kind);
    return edge.distance * (main ? 1.22 : 1);
  }

  function leg(edges, mode) {
    const distance = edges.reduce((sum, edge) => sum + edge.distance, 0);
    const minutes = mode === 'bike' ? distance / (13000 / 60)
      : edges.reduce((sum, edge) => sum + walkCost(edge), 0) / (4200 / 60);
    const coordinates = edges.length ? [vertices[edges[0].from], ...edges.map(item => vertices[item.to])] : [];
    return { mode, distance, minutes, coordinates, edges };
  }

  function planSegment(a, b, mode) {
    if (a.node === b.node) return { legs: [] };
    if (mode === 'walk') {
      const path = search(walk, a.node, i => i === b.node, walkCost);
      return path ? { legs: [leg(path.edges,'walk')] }
        : { error: '这两个接入点之间没有连续的已知步行道路。请换一处入口。' };
    }
    if (!bikeEntries.has(a.node)) {
      bikeEntries.set(a.node, search(walk, a.node, i => usableBike.has(i) && bike[i].length, walkCost, 1600));
    }
    if (!bikeExits.has(b.node)) {
      bikeExits.set(b.node, search(walkBack, b.node, i => usableBike.has(i) && bikeBack[i].length, walkCost, 1600));
    }
    const access = bikeEntries.get(a.node), egress = bikeExits.get(b.node);
    if (access && egress && access.node !== egress.node) {
      const cycling = search(bike, access.node, i => i === egress.node, bikeCost);
      if (cycling) return { legs: [
        leg(access.edges,'walk'), leg(cycling.edges,'bike'),
        leg([...egress.edges].reverse().map(e=>({...e,from:e.to,to:e.from})),'walk')
      ].filter(item => item.edges.length) };
    }
    return { error: '未找到两处之间的连续可骑行路段。试试步行，或改选有骑行道路的景点入口。' };
  }

  function recommendSegment(a, b) {
    const walking = planSegment(a, b, 'walk');
    if (a.node === b.node) return walking;
    const cycling = planSegment(a, b, 'bike');
    if (cycling.error) return walking;
    const transferMinutes = 4;
    const cyclingMinutes = cycling.legs.reduce((sum, item) => sum + item.minutes, transferMinutes);
    if (walking.error || cyclingMinutes < walking.legs[0].minutes) {
      return { ...cycling, transferMinutes };
    }
    return walking;
  }

  function segmentCache(mode, allowWalkingFallback) {
    const savedPaths = new Map();
    return (a, b) => {
      const key = a.node + ':' + b.node;
      if (!savedPaths.has(key)) {
        let result = mode === 'auto' ? recommendSegment(a, b) : planSegment(a, b, mode);
        if (result.error && mode === 'bike' && allowWalkingFallback) {
          const walking = planSegment(a, b, 'walk');
          if (!walking.error) result = walking;
        }
        if (!result.error) {
          const transferMinutes = result.transferMinutes ?? 0;
          const minutes = result.legs.reduce((sum, item) => sum + item.minutes, transferMinutes);
          result = { ...result, minutes, transferMinutes };
        }
        savedPaths.set(key, result);
      }
      return savedPaths.get(key);
    };
  }

  function assembleItinerary(routePoints, between) {
    const segments = [];
    for (let i = 1; i < routePoints.length; i++) {
      const a = routePoints[i - 1], b = routePoints[i];
      const result = between(a, b);
      if (result.error) return { error: '第 ' + i + ' 段「' + a.stop.name + ' → ' + b.stop.name + '」：' + result.error };
      segments.push({ from: a.stop, to: b.stop, ...result });
    }
    const legs = segments.flatMap(segment => segment.legs);
    if (!legs.length) return { error: '这些景点使用同一个道路接入点，步行即可就近查看。' };
    const gap = routePoints.reduce((max, point) => Math.max(max, point.gap), 0);
    return { segments, routePoints, legs, gap };
  }

  function planItinerary(stops, mode) {
    if (stops.length < 2) return { error: '请选择起点和终点。' };
    const savedAnchors = new Map();
    const routePoints = [];
    for (const [i, stop] of stops.entries()) {
      if (stop.id === stops[i - 1]?.id) {
        return { error: '第 ' + i + ' 站和第 ' + (i + 1) + ' 站都是「' + stop.name + '」。请选择另一处或删除重复站。' };
      }
      if (stop.water) {
        return { error: '第 ' + (i + 1) + ' 站「' + stop.name + '」在湖中。请改选岸上景点，船班请查景区公告。' };
      }
      const arriving = i > 0, leaving = i < stops.length - 1;
      const key = stop.id + ':' + (arriving ? 'a' : '') + (leaving ? 'l' : '');
      if (!savedAnchors.has(key)) savedAnchors.set(key, anchor(stop, arriving, leaving));
      const point = savedAnchors.get(key);
      if (!point) {
        return { error: '第 ' + (i + 1) + ' 站「' + stop.name + '」附近没有可确认的道路接入点。请改选附近景点或入口。' };
      }
      routePoints.push({ ...point, stop, coordinates: vertices[point.node] });
    }

    return assembleItinerary(routePoints, segmentCache(mode, stops.length > 2));
  }

  async function planVisit(stops, mode, isCurrent = () => true) {
    const unique = [...new Map(stops.map(stop => [stop.id, stop])).values()]
      .sort((a, b) => a.id.localeCompare(b.id));
    if (unique.length < 2) return { error: '请至少选择两个想去的景点。' };
    const routePoints = [];
    for (const stop of unique) {
      if (stop.water) return { error: '「' + stop.name + '」位于湖中，需要乘船。请选择可步行或骑行到达的景点。' };
      const point = anchor(stop, true, true);
      if (!point) return { error: '「' + stop.name + '」附近没有可确认的道路接入点。请改选附近入口。' };
      routePoints.push({ ...point, stop, coordinates: vertices[point.node] });
    }
    const between = segmentCache(mode, unique.length > 2);
    const costs = [];
    let lastYield = performance.now();
    for (const [i, from] of routePoints.entries()) {
      const row = [];
      for (const [j, to] of routePoints.entries()) {
        row.push(i === j ? Infinity : between(from, to).minutes ?? Infinity);
        if (performance.now() - lastYield >= 30) {
          await new Promise(resolve => setTimeout(resolve, 0));
          if (!isCurrent()) return null;
          lastYield = performance.now();
        }
      }
      costs.push(row);
    }
    const order = shortestVisitOrder(costs);
    if (!order) return { error: '当前出行方式无法串联所有已选景点。请试试自动推荐或调整景点。' };
    return assembleItinerary(order.map(index => routePoints[index]), between);
  }

  function plan(from, to, mode) {
    if (from.id === to.id) return { error: '起点和终点相同。请选择另一个景点。' };
    return { ...planItinerary([from, to], mode), from, to };
  }

  return { plan, planItinerary, planVisit };
}
