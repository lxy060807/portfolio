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
  const waypoints = document.querySelector('#trip-waypoints');
  const addWaypointButton = document.querySelector('#trip-add');
  const stops = new Map(tripStops(places).map(place => [place.id, place]));
  function addStopOptions(select) {
    for (const stop of stops.values()) select.add(new Option(stop.name + (stop.water ? '（湖中）' : ''), stop.id));
  }
  addStopOptions(start);
  addStopOptions(finish);
  let network, request = 0;

  function updateWaypoints() {
    const rows = Array.from(waypoints.children);
    waypoints.hidden = !rows.length;
    for (const [i,row] of rows.entries()) {
      const name = '途经 ' + (i + 1);
      row.querySelector('label span').textContent = name;
      const buttons = row.querySelectorAll('button');
      for (const [j, action] of ['上移','下移','删除'].entries()) buttons[j].setAttribute('aria-label', action + name);
      buttons[0].disabled = i === 0;
      buttons[1].disabled = i === rows.length - 1;
    }
  }

  function addWaypoint() {
    const row = document.createElement('li');
    const label = document.createElement('label');
    label.className = 'trip-stop-field';
    const field = document.createElement('select');
    field.required = true;
    field.add(new Option('选途经景点', ''));
    addStopOptions(field);
    label.append(document.createElement('span'),field);
    const tools = document.createElement('div');
    tools.className = 'trip-waypoint-tools';
    for (const [glyph, action] of [['↑','up'],['↓','down'],['×','remove']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = glyph;
      button.dataset.action = action;
      tools.append(button);
    }
    row.append(label,tools);
    waypoints.append(row);
    reset();
    updateWaypoints();
    field.focus();
  }

  waypoints.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const row = button.closest('li');
    const previous = row.previousElementSibling, next = row.nextElementSibling;
    let focus = row.querySelector('select');
    if (button.dataset.action === 'remove') {
      focus = (next ?? previous)?.querySelector('select') ?? addWaypointButton;
      row.remove();
    } else if (button.dataset.action === 'up' && previous) {
      waypoints.insertBefore(row, previous);
    } else if (button.dataset.action === 'down' && next) {
      waypoints.insertBefore(next, row);
    }
    reset();
    updateWaypoints();
    focus.focus();
  });
  addWaypointButton.addEventListener('click', addWaypoint);

  function itineraryFields() {
    return [start, ...waypoints.querySelectorAll('select'), finish];
  }

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

  function formatSegment(segment, index) {
    const row = document.createElement('li');
    const disclosure = document.createElement('details');
    const heading = document.createElement('summary');
    const caption = document.createElement('strong');
    const metrics = document.createElement('span');
    caption.textContent = (index + 1) + '. ' + segment.from.name + ' → ' + segment.to.name;
    const modes = ['bike','walk'].filter(mode=>segment.legs.some(leg=>leg.mode===mode)).map(mode=>modeNames[mode]);
    const distance = segment.legs.reduce((sum, leg)=>sum + leg.distance, 0);
    const minutes = segment.legs.reduce((sum, leg)=>sum + leg.minutes, 0);
    metrics.textContent = segment.legs.length
      ? modes.join('＋') + ' · ' + amount(distance) + ' · 约 ' + Math.max(1, Math.round(minutes)) + ' 分钟'
      : '同一道路接入点';
    heading.append(caption,metrics);
    disclosure.append(heading);
    if (segment.legs.length) {
      const list = document.createElement('ul');
      list.className = 'trip-segment-legs';
      for (const [i,leg] of segment.legs.entries()) list.append(formatLeg(leg,i,segment.legs.length));
      disclosure.append(list);
    }
    row.append(disclosure);
    return row;
  }

  function show(result) {
    const total = result.legs.reduce((sum, leg) => sum + leg.distance, 0);
    const minutes = result.legs.reduce((sum, leg) => sum + leg.minutes, 0);
    const modes = ['bike','walk'].filter(mode=>result.legs.some(leg=>leg.mode===mode)).map(mode=>modeNames[mode]);
    form.hidden = true;
    details.hidden = false;
    const path = result.routePoints;
    const count = path.length - 2;
    document.querySelector('#trip-endpoints').textContent = path[0].stop.name + ' → ' + path.at(-1).stop.name
      + (count ? ' · 途经 ' + count + ' 站' : '');
    summary.textContent = modes.join('＋') + ' · ' + amount(total) + ' · 约 ' + Math.max(1, Math.round(minutes)) + ' 分钟';
    document.querySelector('#trip-alternate').textContent = form.elements.mode.value === 'bike' ? '改步行' : '改骑行';
    if (form.elements.mode.value === 'bike' && !modes.includes('骑行')) {
      status.textContent = '这些路段均按步行规划。';
    } else {
      status.textContent = '';
    }
    parts.replaceChildren();
    parts.classList.toggle('trip-segments', count > 0);
    if (count) {
      for (const [i,segment] of result.segments.entries()) parts.append(formatSegment(segment,i));
    } else {
      for (const [i,leg] of result.legs.entries()) parts.append(formatLeg(leg,i,result.legs.length));
    }
    document.querySelector('#trip-connection').hidden = result.gap < 25;
    draw(result);
    details.closest('#atlas-details').scrollTop = 0;
    summary.setAttribute('tabindex','-1');
    summary.focus({preventScroll:true});
  }

  form.addEventListener('change', reset);
  document.querySelector('#trip-swap').addEventListener('click', () => {
    const fields = itineraryFields(), values = fields.map(field=>field.value).reverse();
    fields.forEach((field,i)=>{field.value = values[i];});
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
      const result = graph.planItinerary(itineraryFields().map(field=>stops.get(field.value)), form.elements.mode.value);
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
