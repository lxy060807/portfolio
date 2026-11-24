import { places } from './atlas-data.js';
import { trails } from './atlas-trails.js';
import { createPlaceGallery } from './atlas-gallery.js';
import { photoGalleries } from './atlas-photos.js';

export function createAtlasUI({ onPlace, onTrail, onClose, onDetail }) {
  const details = document.querySelector('#atlas-details');
  const routeButton = document.querySelector('#route-open');
  const intro = document.querySelector('#selection');
  const placePanel = document.querySelector('#place-panel');
  const trailPanel = document.querySelector('#trail-panel');
  const gallery = createPlaceGallery();
  const placeList = document.querySelector('#places');
  const routeChoices = document.querySelector('#trail-choices');
  const detailChoices = document.querySelector('#waterfront-choices');
  let trigger;
  let mode;

  document.querySelector('#entrance-count').textContent = trails.length + ' 个';
  const choices = [{ id: null, name: '查看全部' }, ...trails].map(route => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = route.name;
    button.setAttribute('aria-pressed', 'false');
    if (route.color) button.style.setProperty('--trail-color', route.color);
    button.addEventListener('click', () => onTrail(route.id, button));
    routeChoices.append(button);
    return { id: route.id, button };
  });

  const items = places.map((place, index) => {
    const button = document.createElement('button');
    const name = document.createElement('span');
    const category = document.createElement('small');
    button.type = 'button';
    button.className = 'place';
    button.setAttribute('aria-pressed', String(index === 0));
    name.textContent = place.name;
    category.textContent = place.kind;
    button.append(name, category);
    button.addEventListener('click', () => onPlace(index, button));
    if (!place.region) placeList.append(button);
    return button;
  });

  const directory = document.querySelector('#place-index');
  const directoryButton = document.querySelector('#place-index-open');
  const query = document.querySelector('#place-query');
  const results = document.querySelector('#place-results');
  const normalize = value => value.toLowerCase().replace(/[\s·・（）()]+/g, '');
  const sections = new Map();
  for (const [index, place] of places.entries()) {
    if (!index) continue;
    const region = place.region ?? '湖面、堤岛与宝石山';
    if (!sections.has(region)) {
      const section = document.createElement('section');
      const title = document.createElement('h3');
      title.textContent = region;
      section.append(title);
      results.append(section);
      sections.set(region, { section, items: [] });
    }
    const button = document.createElement('button');
    const name = document.createElement('span');
    const kind = document.createElement('small');
    button.type = 'button';
    button.className = 'place-result';
    name.textContent = place.name;
    kind.textContent = place.kind;
    button.append(name, kind);
    button.addEventListener('click', () => {
      directory.close();
      onPlace(index, directoryButton);
    });
    const { section, items } = sections.get(region);
    section.append(button);
    items.push({ button, text: normalize([place.name, place.kind, place.sector, region, ...(place.aliases ?? [])].join(' ')) });
  }

  function filterPlaces() {
    const term = normalize(query.value);
    let matched = false;
    for (const { section, items } of sections.values()) {
      for (const item of items) item.button.hidden = !item.text.includes(term);
      section.hidden = items.every(item => item.button.hidden);
      matched ||= !section.hidden;
    }
    document.querySelector('#place-index-empty').hidden = matched;
  }

  directoryButton.addEventListener('click', () => {
    query.value = '';
    filterPlaces();
    directory.showModal();
  });
  document.querySelector('#place-index-close').addEventListener('click', () => directory.close());
  query.addEventListener('input', filterPlaces);
  query.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.isComposing) return;
    event.preventDefault();
    directory.close();
  });

  function highlight(index) {
    items.forEach((button, current) => {
      button.classList.toggle('active', index === current);
      button.setAttribute('aria-pressed', String(index === current));
    });
  }

  function showPanel(nextMode, nextTrigger) {
    mode = nextMode;
    trigger = nextTrigger ?? trigger;
    details.hidden = false;
    details.dataset.mode = nextMode;
    intro.hidden = true;
    placePanel.hidden = mode !== 'place';
    trailPanel.hidden = mode !== 'route';
    routeButton.setAttribute('aria-expanded', String(mode === 'route'));
    details.scrollTop = 0;
  }

  function showPlace(index, nextTrigger, views = []) {
    highlight(index);
    if (index === 0) {
      close(false);
      return;
    }
    const place = places[index];
    showPanel('place', nextTrigger);
    detailChoices.replaceChildren();
    detailChoices.hidden = views.length === 0;
    detailChoices.setAttribute('aria-label', place.id === 'moon' ? '石塔视角' : '堤桥近景');
    for (const view of views) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = views.length === 1 ? '查看桥拱近景' : view.label;
      button.dataset.detail = view.id;
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => onDetail(view.id));
      detailChoices.append(button);
    }
    gallery.show(place.name, photoGalleries[place.id]);
    document.querySelector('#place-kind').textContent = place.kind + ' · ' + place.sector;
    document.querySelector('#place-title').textContent = place.name;
    document.querySelector('#place-description').textContent = place.summary;
    document.querySelector('#place-trail').hidden = !place.nearTrail;
    document.querySelector('#place-source').href = place.source;
    const coordinate = document.querySelector('#place-coordinate');
    coordinate.hidden = !place.coordinateSource;
    if (place.coordinateSource) coordinate.href = place.coordinateSource;
    document.querySelector('#place-title').focus({preventScroll: true});
  }

  function selectDetail(id) {
    for (const button of detailChoices.children) button.setAttribute('aria-pressed', String(button.dataset.detail === id));
  }

  function showTrail(route, length, nextTrigger) {
    const fromChoice = nextTrigger && routeChoices.contains(nextTrigger);
    showPanel('route', fromChoice ? undefined : nextTrigger);
    highlight(-1);
    for (const choice of choices) choice.button.setAttribute('aria-pressed', String(choice.id === (route?.id ?? null)));
    document.querySelector('#trail-overview-note').hidden = Boolean(route);
    document.querySelector('#trail-selection').hidden = !route;
    const stepList = document.querySelector('#trail-steps');
    stepList.replaceChildren();
    if (route) {
      document.querySelector('#trail-name').textContent = route.name;
      const distance = length >= 1000 ? (length / 1000).toFixed(2) + ' 公里' : Math.round(length / 10) * 10 + ' 米';
      const stairs = route.legs.some(leg => leg.stairs) ? ' · 含台阶' : '';
      document.querySelector('#trail-distance').textContent = route.side + ' · 约 ' + distance + stairs;
      document.querySelector('#trail-note').textContent = (route.note ? route.note + ' ' : '') + '到访以现场指示为准。';
      document.querySelector('#trail-source').href = route.source;
    }
    for (const leg of route?.legs.filter(leg => leg.name) ?? []) {
      const step = document.createElement('li');
      const name = document.createElement('strong');
      const description = document.createElement('span');
      name.textContent = leg.name;
      description.textContent = leg.note;
      step.append(name, description);
      stepList.append(step);
    }
    if (!fromChoice) document.querySelector('#trail-title').focus({preventScroll: true});
  }

  function close(restoreFocus) {
    details.hidden = true;
    intro.hidden = false;
    routeButton.setAttribute('aria-expanded', 'false');
    mode = null;
    if (restoreFocus && trigger?.getClientRects().length) trigger.focus({preventScroll: true});
    trigger = null;
  }

  routeButton.addEventListener('click', () => mode === 'route' ? onClose(true) : onTrail(null, routeButton));
  document.querySelector('#place-trail').addEventListener('click', () => onTrail(null, routeButton));
  document.querySelector('#atlas-close').addEventListener('click', () => onClose(true));
  details.addEventListener('keydown', event => {
    if (event.key === 'Escape') onClose(true);
  });
  highlight(0);
  return { showPlace, showTrail, close, selectDetail };
}
