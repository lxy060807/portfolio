import { createTripNetwork, tripStops } from './atlas-trip-network.js';

export const tripColors = { walk: '#0b796c', bike: '#aa491f' };
const modeNames = { walk: '步行', bike: '骑行' };
const amount = distance => distance >= 1000 ? (distance / 1000).toFixed(1) + ' 公里' : Math.round(distance) + ' 米';

export function createTripPlanner(places, loadNetwork, draw, fit) {
  const form = document.querySelector('#trip-form');
  const start = form.elements.start, finish = form.elements.finish;
  const status = document.querySelector('#trip-status');
  const details = document.querySelector('#trip-result');
  const summary = document.querySelector('#trip-summary');
  const parts = document.querySelector('#trip-parts');
  const fitButton = document.querySelector('#trip-fit');
  const stops = new Map(tripStops(places).map(place => [place.id, place]));
  for (const select of [start,finish]) for (const stop of stops.values()) {
    select.add(new Option(stop.name + (stop.water ? '（湖中）' : ''), stop.id));
  }
  let network, request = 0;

  function reset() {
    request++;
    form.hidden = false;
    details.hidden = true;
    status.textContent = '';
    draw(null);
  }

  function formatLeg(leg, index, count) {
    const li = document.createElement('li');
    const mode = document.createElement('strong');
    mode.textContent = modeNames[leg.mode] + ' · ' + amount(leg.distance) + ' · 约 ' + Math.max(1,Math.round(leg.minutes)) + ' 分钟';
    li.style.setProperty('--trip-leg', tripColors[leg.mode]);
    const roads = [];
    for (const edge of leg.edges) {
      if (roads.at(-1)?.name !== edge.road.name) roads.push({name:edge.road.name,distance:0});
      roads.at(-1).distance += edge.distance;
    }
    const description = document.createElement('span');
    const stairs = leg.edges.some(edge => edge.road.kind === 'steps') ? ' · 含台阶' : '';
    description.textContent = roads.slice(0,5).map(road=>road.name).join(' → ') + (roads.length > 5 ? ' 等' : '') + stairs;
    if (count > 1) li.append(mode);
    li.append(description);
    if (count > 1 && leg.mode === 'walk') {
      const access = document.createElement('small');
      access.textContent = index === 0 ? '先步行到可骑行道路' : '在允许停放处停车后步行';
      li.append(access);
    }
    if (roads.length > 5) {
      const expand = document.createElement('details');
      const label = document.createElement('summary');
      const list = document.createElement('ol');
      label.textContent = '查看全部路段';
      for (const road of roads) {
        const step = document.createElement('li');
        step.textContent = road.name + ' · ' + amount(road.distance);
        list.append(step);
      }
      expand.append(label,list);
      li.append(expand);
    }
    return li;
  }

  function show(result) {
    const total = result.legs.reduce((sum, leg) => sum + leg.distance, 0);
    const minutes = result.legs.reduce((sum, leg) => sum + leg.minutes, 0);
    const modes = ['bike','walk'].filter(mode=>result.legs.some(leg=>leg.mode===mode)).map(mode=>modeNames[mode]);
    form.hidden = true;
    details.hidden = false;
    document.querySelector('#trip-endpoints').textContent = result.from.name + ' → ' + result.to.name;
    summary.textContent = modes.join('＋') + ' · ' + amount(total) + ' · 约 ' + Math.max(1, Math.round(minutes)) + ' 分钟';
    document.querySelector('#trip-alternate').textContent = form.elements.mode.value === 'bike' ? '改步行' : '改骑行';
    parts.replaceChildren(...result.legs.map((leg,index)=>formatLeg(leg,index,result.legs.length)));
    document.querySelector('#trip-connection').hidden = result.gap < 25;
    status.textContent = '';
    draw(result);
    details.closest('#atlas-details').scrollTop = 0;
    summary.setAttribute('tabindex','-1');
    summary.focus({preventScroll:true});
  }

  form.addEventListener('change', reset);
  document.querySelector('#trip-swap').addEventListener('click', () => {
    [start.value, finish.value] = [finish.value, start.value];
    reset();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    reset();
    const current = request;
    status.textContent = '正在规划路线…';
    try {
      network ??= loadNetwork().then(createTripNetwork).catch(error => {
        network = null;
        throw error;
      });
      const graph = await network;
      if (request !== current) return;
      const result = graph.plan(stops.get(start.value), stops.get(finish.value), form.elements.mode.value);
      if (result.error) status.textContent = result.error;
      else show(result);
    } catch {
      if (request === current) status.textContent = '道路数据暂时无法加载，请重新点「规划路线」。';
    }
  });
  fitButton.addEventListener('click', fit);
  document.querySelector('#trip-edit').addEventListener('click', () => {
    reset();
    start.focus({preventScroll:true});
  });
  document.querySelector('#trip-alternate').addEventListener('click', () => {
    form.elements.mode.value = form.elements.mode.value === 'bike' ? 'walk' : 'bike';
    form.requestSubmit();
  });
  return {
    open(place) {
      reset();
      if (stops.has(place)) finish.value = place;
    },
    close: reset,
  };
}
