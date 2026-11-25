(() => {
  const art = document.getElementById("featured-reel");
  const controls = document.querySelector(".reel-controls");
  const choices = [...document.querySelectorAll('input[name="showcase"]')];
  const discs = choices.map(({ id }) => art.querySelector(`[data-showcase-disc="${id}"]`));
  const [previous, next] = controls.querySelectorAll("button");
  const counter = controls.querySelector("[data-reel-index]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const last = discs.length - 1;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  let current = choices.findIndex((choice) => choice.checked);
  let position = current;
  let target = current;
  let velocity = 0;
  let frame = 0;
  let previousTime;
  let gesture;
  let suppressClick = false;
  let spacing;
  let rise;
  let wheelTime = 0;

  controls.hidden = false;
  art.dataset.enhanced = "";

  function measure() {
    const width = art.clientWidth;
    const diameter = discs[0].offsetWidth;
    spacing = Math.min(width * .30, diameter * .85);
    rise = Math.min(width * .08, diameter * .26);
  }

  function paint() {
    const momentum = clamp(velocity, -5, 5);
    for (const [index, disc] of discs.entries()) {
      const offset = index - position;
      const distance = Math.abs(offset);
      const depth = Math.min(distance, 2.5);
      disc.style.setProperty("--reel-x", `${offset * spacing}px`);
      disc.style.setProperty("--reel-y", `${-offset * rise + depth * depth * 8}px`);
      disc.style.setProperty("--reel-size", Math.max(.48, 1 - depth * .18));
      disc.style.setProperty("--reel-yaw", `${-22 - clamp(offset * 11 + momentum * 3.4, -37, 39)}deg`);
      disc.style.setProperty("--reel-roll", `${15 + clamp(offset * 8 - momentum * 2.5, -27, 25)}deg`);
      disc.style.setProperty("--reel-light", `${offset * 31 + momentum * 8}deg`);
      disc.style.setProperty("--reel-opacity", clamp(1.54 - distance * .26, 0, 1));
      disc.style.zIndex = String(50 - Math.round(distance * 10));
    }
  }

  function render(time) {
    const dt = Math.min((time - (previousTime ?? time - 16)) / 1000, .032);
    previousTime = time;
    velocity += ((target - position) * 126 - velocity * 19) * dt;
    position += velocity * dt;
    if (Math.abs(target - position) > .002 || Math.abs(velocity) > .025) {
      paint();
      frame = requestAnimationFrame(render);
    } else {
      position = target;
      velocity = 0;
      frame = 0;
      previousTime = undefined;
      paint();
      art.removeAttribute("data-moving");
    }
  }

  function settle(index, releaseVelocity = velocity) {
    target = index;
    velocity = releaseVelocity;
    if (reducedMotion.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = undefined;
      position = target;
      velocity = 0;
      paint();
      art.removeAttribute("data-moving");
      return;
    }
    if (position === target && !frame && !releaseVelocity) {
      art.removeAttribute("data-moving");
      return;
    }
    art.dataset.moving = "";
    if (!frame) frame = requestAnimationFrame(render);
  }

  function syncSelection() {
    previous.disabled = current === 0;
    next.disabled = current === last;
    counter.textContent = String(current + 1).padStart(2, "0");
    for (const [index, disc] of discs.entries()) {
      const active = index === current;
      const title = choices[index].labels[0].textContent;
      disc.toggleAttribute("data-active", active);
      disc.tabIndex = active ? 0 : -1;
      disc.setAttribute("aria-label", active ? `打开「${title}」案例` : `切换到「${title}」`);
    }
  }

  function select(index, releaseVelocity) {
    current = clamp(index, 0, last);
    choices[current].checked = true;
    syncSelection();
    settle(current, releaseVelocity);
  }

  for (const [index, choice] of choices.entries()) {
    choice.addEventListener("change", () => select(index));
  }
  previous.addEventListener("click", () => select(current - 1));
  next.addEventListener("click", () => select(current + 1));
  art.addEventListener("dragstart", (event) => event.preventDefault());

  art.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY,
      origin: position, lastPosition: position, time: event.timeStamp, speed: 0, moved: false };
  });

  art.addEventListener("pointermove", (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    if (!gesture.moved && (Math.abs(dx) < 9 || Math.abs(dx) < Math.abs(event.clientY - gesture.y) * 1.35)) return;
    if (!gesture.moved) {
      gesture.moved = true;
      art.setPointerCapture(gesture.id);
      art.dataset.scrubbing = "";
      art.dataset.moving = "";
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = undefined;
      gesture.origin = position;
    }
    const proposed = gesture.origin - dx / spacing;
    const bounded = clamp(proposed, 0, last);
    const displaced = bounded + clamp((proposed - bounded) * .22, -.34, .34);
    const elapsed = Math.max(event.timeStamp - gesture.time, 8) / 1000;
    gesture.speed = gesture.speed * .62 + (displaced - gesture.lastPosition) / elapsed * .38;
    gesture.lastPosition = displaced;
    gesture.time = event.timeStamp;
    if (!reducedMotion.matches) {
      position = displaced;
      velocity = gesture.speed;
      paint();
    }
  });

  function release(event) {
    if (!gesture || gesture.id !== event.pointerId) return;
    const drag = gesture;
    gesture = undefined;
    if (!drag.moved) return;
    suppressClick = true;
    art.removeAttribute("data-scrubbing");
    if (event.type !== "pointerup") return select(current, 0);
    const speed = event.timeStamp - drag.time < 100 ? clamp(drag.speed, -6, 6) : 0;
    const distance = event.clientX - drag.x;
    const suggested = Math.round(drag.lastPosition + speed * .17);
    const minimum = Math.abs(distance) > 52 ? current + Math.sign(-distance) : current;
    const destination = distance < 0 ? Math.max(minimum, suggested) : Math.min(minimum, suggested);
    select(destination, speed);
  }

  art.addEventListener("pointerup", release);
  art.addEventListener("pointercancel", release);
  art.addEventListener("lostpointercapture", (event) => {
    if (event.target === art) release(event);
  });
  art.addEventListener("click", (event) => {
    if (suppressClick && event.detail > 0) {
      suppressClick = false;
      event.preventDefault();
      return;
    }
    const disc = event.target.closest("[data-showcase-disc]");
    const index = discs.indexOf(disc);
    if (index < 0 || index === current || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    select(index);
  });
  art.addEventListener("wheel", (event) => {
    const delta = event.shiftKey ? event.deltaY || event.deltaX : event.deltaX;
    if (Math.abs(delta) < 6 || (!event.shiftKey && Math.abs(delta) <= Math.abs(event.deltaY))) return;
    const destination = current + Math.sign(delta);
    if (destination < 0 || destination > last) return;
    event.preventDefault();
    if (event.timeStamp - wheelTime < 200) return;
    wheelTime = event.timeStamp;
    select(destination);
  }, { passive: false });

  new ResizeObserver(() => { measure(); paint(); }).observe(art);
  reducedMotion.addEventListener("change", () => settle(current, 0));
  addEventListener("pageshow", () => {
    const selected = choices.findIndex((choice) => choice.checked);
    if (selected !== current) select(selected, 0);
  });
  measure();
  paint();
  syncSelection();
  if (!reducedMotion.matches && !location.hash && performance.getEntriesByType("navigation")[0]?.type === "navigate") {
    art.dataset.intro = "";
    art.addEventListener("animationend", (event) => {
      if (event.animationName === "reel-lift") art.removeAttribute("data-intro");
    });
  }
})();
