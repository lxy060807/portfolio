import { createReelParticles } from "./reel-particles.js";

(() => {
  const art = document.getElementById("featured-reel");
  const controls = document.querySelector(".reel-controls");
  const choices = [...document.querySelectorAll('input[name="showcase"]')];
  const discs = choices.map(({ id }) => art.querySelector(`[data-showcase-disc="${id}"]`));
  const [previous, next] = controls.querySelectorAll("button");
  const counter = controls.querySelector("[data-reel-index]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const particles = createReelParticles(art);
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
  let discRadius;
  let focalX;
  let focalY;
  let wheelTime = 0;
  let pressure = 0;
  let pressX = 0;
  let pressY = 0;
  let pressedDisc = -1;
  let lastEmission = -Infinity;
  let introStarted;

  controls.hidden = false;
  art.dataset.enhanced = "";

  function measure() {
    const width = art.clientWidth;
    const diameter = discs[0].offsetWidth;
    spacing = Math.min(width * .30, diameter * .85);
    rise = Math.min(width * .08, diameter * .26);
    discRadius = diameter / 2;
    focalX = discs[0].offsetLeft;
    focalY = discs[0].offsetTop;
    particles.resize(width, art.clientHeight);
  }

  function paint() {
    const momentum = clamp(velocity, -5, 5);
    for (const [index, disc] of discs.entries()) {
      const offset = index - position;
      const distance = Math.abs(offset);
      const depth = Math.min(distance, 2.5);
      const grip = index === pressedDisc ? pressure : 0;
      const yaw = clamp(-22 - clamp(offset * 11 + momentum * 3.4, -37, 39) - grip * (52 - pressX * 28), -83, 38);
      const pitch = grip * (13 - pressY * 27);
      const roll = 15 + clamp(offset * 8 - momentum * 2.5, -27, 25) + grip * (pressX * 7 - 4);
      const scale = Math.max(.48, 1 - depth * .18) * (1 - grip * .045);
      disc.style.transform = `translate(-50%, -50%) translate3d(${offset * spacing}px, ${-offset * rise + depth * depth * 8 - grip * 13}px, ${grip * 52}px) rotateX(${pitch}deg) rotateY(${yaw}deg) rotateZ(${roll}deg) scale(${scale})`;
      disc.style.setProperty("--reel-light", `${offset * 31 + momentum * 8 + grip * (62 - pressX * 54)}deg`);
      disc.style.opacity = clamp(1.54 - distance * .26, 0, 1);
      disc.style.zIndex = String(50 - Math.round(distance * 10) + (grip > .05 ? 8 : 0));
    }
  }

  function emitAround(index, count, push = 0) {
    if (reducedMotion.matches || index < 0) return;
    const offset = index - position;
    const depth = Math.min(Math.abs(offset), 2.5);
    const grip = index === pressedDisc ? pressure : 0;
    particles.emit(focalX + offset * spacing, focalY - offset * rise + depth * depth * 8 - grip * 13,
      discRadius * Math.max(.48, 1 - depth * .18), count, push, .94 - grip * (.58 - pressX * .15));
  }

  function requestRender() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function render(time) {
    const dt = Math.min((time - (previousTime ?? time - 16)) / 1000, .04);
    previousTime = time;
    const dragging = Boolean(gesture?.moved);
    const holding = Boolean(gesture && pressedDisc >= 0);
    const oldPosition = position;
    const oldVelocity = velocity;
    const oldPressure = pressure;
    const oldX = pressX;
    const oldY = pressY;
    if (dragging) {
      position = gesture.lastPosition;
      velocity = gesture.speed * Math.exp(-Math.max(0, time - gesture.time) / 85);
    } else if (Math.abs(target - position) > .002 || Math.abs(velocity) > .025) {
      // Substeps keep the spring stable if a frame runs late.
      const steps = Math.ceil(dt / .009) || 1;
      const step = dt / steps;
      for (let i = 0; i < steps; i += 1) {
        velocity += ((target - position) * 126 - velocity * 19) * step;
        position += velocity * step;
      }
    } else {
      position = target;
      velocity = 0;
    }
    const gripEase = 1 - Math.exp(-dt * (holding ? 14 : 19));
    pressure += ((holding ? 1 : 0) - pressure) * gripEase;
    pressX += ((holding ? gesture.gripX : 0) - pressX) * gripEase;
    pressY += ((holding ? gesture.gripY : 0) - pressY) * gripEase;
    if (!holding && pressure < .004) {
      pressure = 0;
      pressedDisc = -1;
    }
    if (position !== oldPosition || Math.abs(velocity - oldVelocity) > .005 || pressure !== oldPressure ||
        (pressure && (pressX !== oldX || pressY !== oldY))) paint();

    const introAge = introStarted === undefined ? Infinity : time - introStarted;
    const moving = !dragging && (position !== target || velocity !== 0);
    if (time - lastEmission > (dragging || moving ? 38 : 145)) {
      if (holding && (!dragging || Math.abs(velocity) > .6)) {
        emitAround(pressedDisc, dragging ? 5 : 2, -velocity * 28);
        lastEmission = time;
      } else if (moving && Math.abs(velocity) > 1.4) {
        emitAround(clamp(Math.round(position), 0, last), 5, -velocity * 31);
        lastEmission = time;
      } else if (introAge > 310 && introAge < 850) {
        emitAround(0, 4, 34);
        lastEmission = time;
      }
    }
    const hasParticles = particles.draw(dt);
    if (!dragging && !moving) art.removeAttribute("data-moving");
    if (dragging || holding || moving || pressure || hasParticles || introAge < 850) {
      frame = requestAnimationFrame(render);
    } else {
      frame = 0;
      previousTime = undefined;
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
      pressure = 0;
      pressedDisc = -1;
      introStarted = undefined;
      particles.clear();
      paint();
      art.removeAttribute("data-moving");
      art.removeAttribute("data-holding");
      art.removeAttribute("data-intro");
      return;
    }
    if (position === target && !frame && !releaseVelocity) {
      art.removeAttribute("data-moving");
      return;
    }
    art.dataset.moving = "";
    requestRender();
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
    if (!event.isPrimary || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    suppressClick = false;
    const disc = event.target.closest("[data-showcase-disc]");
    const index = discs.indexOf(disc);
    const bounds = disc?.getBoundingClientRect();
    gesture = { id: event.pointerId, type: event.pointerType, x: event.clientX, y: event.clientY,
      origin: position, lastPosition: position, time: event.timeStamp, started: event.timeStamp,
      gripX: bounds ? clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1) : 0,
      gripY: bounds ? clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1) : 0,
      speed: 0, moved: false, index };
    if (index < 0 || reducedMotion.matches) return;
    disc.setPointerCapture(event.pointerId);
    pressedDisc = index;
    art.dataset.holding = "";
    emitAround(index, 13);
    lastEmission = event.timeStamp;
    requestRender();
  });

  art.addEventListener("pointermove", (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (pressedDisc >= 0) {
      gesture.gripX = clamp(gesture.gripX + (dx - (gesture.lastX ?? 0)) / discRadius, -1, 1);
      gesture.gripY = clamp(gesture.gripY + (dy - (gesture.lastY ?? 0)) / discRadius, -1, 1);
      gesture.lastX = dx;
      gesture.lastY = dy;
    }
    if (!gesture.moved && (Math.abs(dx) < 9 || Math.abs(dx) < Math.abs(dy) * 1.35)) return;
    if (!gesture.moved) {
      gesture.moved = true;
      art.setPointerCapture(gesture.id);
      art.dataset.scrubbing = "";
      art.dataset.moving = "";
      gesture.origin = position;
      gesture.lastPosition = position;
    }
    const proposed = gesture.origin - dx / spacing;
    const bounded = clamp(proposed, 0, last);
    const displaced = bounded + clamp((proposed - bounded) * .22, -.34, .34);
    const elapsed = Math.max(event.timeStamp - gesture.time, 8) / 1000;
    gesture.speed = gesture.speed * .62 + (displaced - gesture.lastPosition) / elapsed * .38;
    gesture.lastPosition = displaced;
    gesture.time = event.timeStamp;
    if (!reducedMotion.matches) requestRender();
  });

  function release(event) {
    if (!gesture || gesture.id !== event.pointerId) return;
    const drag = gesture;
    gesture = undefined;
    const wasHeld = drag.index >= 0 && event.timeStamp - drag.started >= 280;
    suppressClick = drag.moved || wasHeld || Math.abs(event.clientY - drag.y) > 12;
    art.removeAttribute("data-holding");
    art.removeAttribute("data-scrubbing");
    if (!reducedMotion.matches && pressedDisc >= 0) {
      if (suppressClick && event.type === "pointerup") emitAround(pressedDisc, 11, -drag.speed * 24);
      requestRender();
    }
    if (!drag.moved) return;
    if (!reducedMotion.matches) position = drag.lastPosition;
    if (event.type !== "pointerup") return select(current, 0);
    const speed = event.timeStamp - drag.time < 100 ? clamp(drag.speed, -6, 6) : 0;
    const distance = event.clientX - drag.x;
    const direction = Math.sign(-distance);
    let destination = Math.round(drag.lastPosition + speed * .17);
    if (destination === current && Math.abs(distance) > 52 && (!speed || Math.sign(speed) === direction)) {
      destination += direction;
    }
    select(destination, speed);
  }

  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
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
  art.addEventListener("contextmenu", (event) => {
    if (gesture && gesture.index >= 0 && gesture.type !== "mouse") event.preventDefault();
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
    introStarted = performance.now();
    requestRender();
    art.addEventListener("animationend", (event) => {
      if (event.animationName === "reel-lift") art.removeAttribute("data-intro");
    });
  }
})();
