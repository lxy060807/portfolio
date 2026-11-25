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
  function anchor(stop, outgoing) {
    let node = -1, gap = 155;
    const graph = outgoing ? walk : walkBack;
    for (const i of usableFoot) {
      const distance = metres(stop.c, vertices[i]);
      if (distance >= gap || !graph[i].length) continue;
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

  function plan(from, to, mode) {
    if (from.id === to.id) return { error: '起点和终点相同。请选择另一个景点。' };
    if (from.water || to.water) return { error: '选中的景点在湖中，无法全程步行或骑行到达。请选择岸上景点，船班请查景区公告。' };
    const a = anchor(from, true), b = anchor(to, false);
    if (!a || !b) return { error: '这处景点附近暂时没有可确认的步行接入点。可改选附近景点或入口。' };
    if (a.node === b.node) return { error: '这两处使用同一个道路接入点，步行即可就近查看。' };
    const result = legs => ({ legs, from, to, gap: Math.max(a.gap, b.gap) });
    if (mode === 'walk') {
      const path = search(walk, a.node, i => i === b.node, walkCost);
      return path ? result([leg(path.edges,'walk')])
        : { error: '这两个接入点之间没有连续的已知步行道路。请换一处入口。' };
    }
    const access = search(walk, a.node, i => usableBike.has(i) && bike[i].length, walkCost, 1600);
    const egress = search(walkBack, b.node, i => usableBike.has(i) && bikeBack[i].length, walkCost, 1600);
    if (access && egress && access.node !== egress.node) {
      const cycling = search(bike, access.node, i => i === egress.node, bikeCost);
      if (cycling) return result([
        leg(access.edges,'walk'), leg(cycling.edges,'bike'),
        leg(egress.edges.reverse().map(e=>({...e,from:e.to,to:e.from})),'walk')
      ].filter(item => item.edges.length));
    }
    return { error: '未找到两处之间的连续可骑行路段。试试步行，或改选有骑行道路的景点入口。' };
  }

  return { plan };
}
