import { createTripNetwork, tripStops } from './atlas-trip-network.js';

export const tripColors = { walk: '#0b796c', bike: '#aa491f' };
const modeNames = { walk: '步行', bike: '骑行' };
const amount = distance => distance >= 1000 ? (distance / 1000).toFixed(1) + ' 公里' : Math.round(distance) + ' 米';

export function createTripPlanner(places, loadNetwork, draw, fit, showMapStops) {
  const form = document.querySelector('#trip-form');
  const start = form.elements.start, finish = form.elements.finish;
  const status = document.querySelector('#trip-status');
  const details = document.querySelector('#trip-result');
  const summary = document.querySelector('#trip-summary');
  const parts = document.querySelector('#trip-parts');
  const fitButton = document.querySelector('#trip-fit');
  const waypoints = document.querySelector('#trip-waypoints');
  const addWaypointButton = document.querySelector('#trip-add');
  const picker = document.querySelector('#trip-map-picker');
  const mapButton = document.querySelector('#trip-map-open');
  const mapHint = document.querySelector('#trip-map-hint');
  const roleButtons = [...picker.querySelectorAll('[data-trip-role]')];
  const clearButtons = [...form.closest('#trip-panel').querySelectorAll('[data-trip-clear]')];
  const undoClear = document.querySelector('#trip-undo-clear');
  const alternate = document.querySelector('#trip-alternate');
  const modeKey = document.querySelector('#trip-mode-key');
  modeKey.style.setProperty('--trip-walk', tripColors.walk);
  modeKey.style.setProperty('--trip-bike', tripColors.bike);
  const roleNames = { start:'起点', via:'途经点', finish:'终点' };
  const stops = new Map(tripStops(places).map(place => [place.id, place]));
  function addStopOptions(select) {
    for (const stop of stops.values()) select.add(new Option(stop.name + (stop.water ? '（湖中）' : ''), stop.id));
  }
  addStopOptions(start);
  addStopOptions(finish);
  let network, request = 0, pickRole = null, clearedRoute = null;

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

  function addWaypoint(value = '') {
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
    field.value = value;
    return field;
  }

  addWaypointButton.addEventListener('click', () => {
    const field = addWaypoint();
    updateWaypoints();
    reset();
    field.focus();
  });

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
  function itineraryFields() {
    return [start, ...waypoints.querySelectorAll('select'), finish];
  }

  function draftPoints() {
    const fields = itineraryFields();
    return fields.flatMap((field, index) => {
      const stop = stops.get(field.value);
      return stop ? [{ stop, mark:field === start ? '起' : field === finish ? '终' : String(index) }] : [];
    });
  }

  function reset(showDraft = true) {
    request++;
    form.hidden = Boolean(pickRole);
    details.hidden = true;
    status.textContent = '';
    clearedRoute = null;
    undoClear.hidden = true;
    const canClear = Boolean(start.value || finish.value || waypoints.children.length);
    for (const button of clearButtons) button.disabled = !canClear;
    draw(null, showDraft ? draftPoints() : []);
  }

  function setPickRole(role, chosen = '') {
    pickRole = role;
    picker.hidden = !role;
    picker.closest('#atlas-details').classList.toggle('trip-picking', Boolean(role));
    for (const button of roleButtons) button.setAttribute('aria-pressed', String(button.dataset.tripRole === role));
    mapHint.textContent = role ? chosen + '点击地图上的景点选择' + roleNames[role] + '。' : '';
    showMapStops(Boolean(role), draftPoints());
    reset();
  }

  mapButton.addEventListener('click', () => {
    setPickRole(!start.value ? 'start' : !finish.value ? 'finish' : 'via');
    roleButtons.find(button => button.dataset.tripRole === pickRole).focus();
  });
  for (const button of roleButtons) button.addEventListener('click', () => setPickRole(button.dataset.tripRole));
  document.querySelector('#trip-map-done').addEventListener('click', () => {
    setPickRole(null);
    mapButton.focus({preventScroll:true});
  });

  function clearRoute() {
    const snapshot = {
      values: itineraryFields().map(field => field.value),
      planned: !details.hidden
    };
    start.value = '';
    finish.value = '';
    waypoints.replaceChildren();
    parts.replaceChildren();
    updateWaypoints();
    setPickRole(null);
    clearedRoute = snapshot;
    undoClear.hidden = false;
    status.textContent = '已清除路线和全部站点。';
    undoClear.focus();
  }
  for (const button of clearButtons) button.addEventListener('click', clearRoute);
  undoClear.addEventListener('click', () => {
    const {values, planned} = clearedRoute;
    start.value = values[0];
    finish.value = values.at(-1);
    for (const value of values.slice(1,-1)) addWaypoint(value);
    updateWaypoints();
    reset();
    if (planned) form.requestSubmit();
    else {
      status.textContent = '已恢复站点。';
      mapButton.focus({preventScroll:true});
    }
  });

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
    metrics.textContent = segment.legs.length
      ? modes.join('＋') + ' · ' + amount(distance) + ' · 约 ' + Math.max(1, Math.round(segment.minutes)) + ' 分钟'
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
    const minutes = result.segments.reduce((sum, segment) => sum + segment.minutes, 0);
    const transferMinutes = result.segments.reduce((sum, segment) => sum + segment.transferMinutes, 0);
    const modes = ['bike','walk'].filter(mode=>result.legs.some(leg=>leg.mode===mode)).map(mode=>modeNames[mode]);
    const chosenMode = form.elements.mode.value;
    const hasCycling = modes.includes('骑行');
    form.hidden = true;
    details.hidden = false;
    const path = result.routePoints;
    const count = path.length - 2;
    document.querySelector('#trip-endpoints').textContent = path[0].stop.name + ' → ' + path.at(-1).stop.name
      + (count ? ' · 途经 ' + count + ' 站' : '');
    summary.textContent = (chosenMode === 'auto' ? '自动推荐 · ' : '') + modes.join('＋')
      + ' · ' + amount(total) + ' · 约 ' + Math.max(1, Math.round(minutes)) + ' 分钟';
    alternate.dataset.mode = chosenMode === 'bike' || (chosenMode === 'auto' && hasCycling) ? 'walk' : 'bike';
    alternate.textContent = alternate.dataset.mode === 'walk' ? '改步行' : '改骑行';
    modeKey.hidden = modes.length < 2;
    const modeNote = document.querySelector('#trip-mode-note');
    modeNote.textContent = transferMinutes ? '已计入约 ' + transferMinutes + ' 分钟取车和停车时间。'
      : chosenMode === 'bike' && !hasCycling ? '这些路段均按步行规划。' : '';
    modeNote.hidden = !modeNote.textContent;
    status.textContent = '';
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

  form.addEventListener('change', () => reset());
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
  alternate.addEventListener('click', () => {
    form.elements.mode.value = alternate.dataset.mode;
    form.requestSubmit();
  });
  return {
    open(place) {
      if (stops.has(place)) finish.value = place;
      reset();
    },
    close() {
      if (pickRole) setPickRole(null);
      reset(false);
    },
    pick(place) {
      if (!pickRole || !stops.has(place)) return;
      const stop = stops.get(place);
      if (stop.water) {
        mapHint.textContent = stop.name + '位于湖中，需要乘船。请选择可步行或骑行到达的景点。';
        return;
      }
      const role = pickRole;
      if (role === 'via') {
        const empty = [...waypoints.querySelectorAll('select')].find(field => !field.value);
        if (empty) empty.value = place;
        else {
          addWaypoint(place);
          updateWaypoints();
        }
      } else {
        (role === 'start' ? start : finish).value = place;
      }
      setPickRole(role === 'start' ? 'via' : role, '已选' + roleNames[role] + '「' + stop.name + '」。');
    },
  };
}
