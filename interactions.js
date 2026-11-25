const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function onHorizontalSwipe(surface, move) {
  let start;
  surface.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.pointerType !== "touch") return;
    start = { x: event.clientX, y: event.clientY };
  });
  surface.addEventListener("pointerup", (event) => {
    if (!event.isPrimary || !start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    start = undefined;
    if (Math.abs(deltaX) >= 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35) {
      move(deltaX < 0 ? 1 : -1);
    }
  });
  surface.addEventListener("pointercancel", () => { start = undefined; });
}

function enableShowcaseReel() {
  const art = document.querySelector(".showcase-art");
  if (!art) return;
  const selections = [...document.querySelectorAll('input[name="showcase"]')];
  const discs = [...art.querySelectorAll("[data-showcase-disc]")];
  let gesture;
  let suppressClick = false;

  function select(input) {
    if (!input || input.checked) return;
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  art.addEventListener("dragstart", (event) => event.preventDefault());
  art.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  });
  art.addEventListener("pointermove", (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.moved && (Math.abs(dx) < 9 || Math.abs(dx) < Math.abs(dy) * 1.35)) return;
    if (!gesture.moved) {
      gesture.moved = true;
      art.classList.add("is-scrubbing");
      art.setPointerCapture(event.pointerId);
    }
    if (reducedMotion.matches) return;
    const drag = Math.max(-110, Math.min(110, dx * .55));
    art.style.setProperty("--reel-drag", `${drag}px`);
    art.style.setProperty("--reel-turn", `${drag * -.37}deg`);
  });

  function finishGesture(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    suppressClick = gesture.moved;
    gesture = undefined;
    art.classList.remove("is-scrubbing");
    art.style.removeProperty("--reel-drag");
    art.style.removeProperty("--reel-turn");
    if (event.type !== "pointerup" || !suppressClick || Math.abs(dx) < 48) return;
    const current = selections.findIndex((input) => input.checked);
    select(selections[current + (dx < 0 ? 1 : -1)]);
  }

  art.addEventListener("pointerup", finishGesture);
  art.addEventListener("pointercancel", finishGesture);
  art.addEventListener("lostpointercapture", (event) => {
    if (event.target === art) finishGesture(event);
  });
  art.addEventListener("click", (event) => {
    if (suppressClick && event.detail > 0) {
      event.preventDefault();
      suppressClick = false;
      return;
    }
    const disc = event.target.closest("[data-showcase-disc]");
    if (!disc || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const input = selections.find((item) => item.id === disc.dataset.showcaseDisc);
    if (input.checked) return;
    event.preventDefault();
    select(input);
  });

  function updateDiscNames() {
    for (const [index, disc] of discs.entries()) {
      const input = selections[index];
      const title = input.labels[0].textContent;
      disc.setAttribute("aria-label", input.checked ? `打开「${title}」案例` : `切换到「${title}」`);
    }
  }
  document.querySelector(".showcase-controls").addEventListener("change", updateDiscNames);
  updateDiscNames();
}

function enableProjectRail() {
  const rail = document.getElementById("project-list");
  const controls = document.querySelector(".work-controls");
  const filters = document.querySelector(".work-filters");
  if (!rail || !controls || !filters) return;

  const [previous, next] = [...controls.querySelectorAll("button")];
  const cards = [...rail.querySelectorAll(".project-card")];
  const filterButtons = [...filters.querySelectorAll("[data-project-filter]")];
  let visibleCards = cards;
  let paintFrame;
  controls.hidden = false;
  filters.hidden = false;

  function updateRail() {
    const { scrollLeft, clientWidth, scrollWidth } = rail;
    const center = scrollLeft + clientWidth / 2;
    const poses = visibleCards.map((card) => {
      const delta = card.offsetLeft + card.offsetWidth / 2 - center;
      return { card, delta, offset: Math.max(-1, Math.min(1, delta / (clientWidth * .46))) };
    });
    const centered = poses.reduce((nearest, pose) =>
      Math.abs(pose.delta) < Math.abs(nearest.delta) ? pose : nearest);

    previous.disabled = scrollLeft <= 2;
    next.disabled = scrollLeft + clientWidth >= scrollWidth - 2;
    for (const { card, offset } of poses) {
      card.toggleAttribute("data-centered", card === centered.card);
      card.style.setProperty("--rail-turn", `${-offset * 22}deg`);
      card.style.setProperty("--rail-roll", `${offset * 4}deg`);
      card.style.setProperty("--rail-scale", 1 - Math.abs(offset) * .08);
    }
  }

  function queueRailUpdate() {
    cancelAnimationFrame(paintFrame);
    paintFrame = requestAnimationFrame(updateRail);
  }

  function advance(direction) {
    if (visibleCards.length < 2) return;
    const distance = visibleCards[1].offsetLeft - visibleCards[0].offsetLeft;
    rail.scrollBy({ left: direction * distance, behavior: reducedMotion.matches ? "instant" : "smooth" });
  }

  previous.addEventListener("click", () => advance(-1));
  next.addEventListener("click", () => advance(1));
  rail.addEventListener("scroll", queueRailUpdate, { passive: true });
  window.addEventListener("resize", queueRailUpdate);

  for (const button of filterButtons) {
    button.addEventListener("click", () => {
      if (button.getAttribute("aria-pressed") === "true") return;
      for (const choice of filterButtons) choice.setAttribute("aria-pressed", String(choice === button));
      const kind = button.dataset.projectFilter;
      visibleCards = cards.filter((card) => {
        card.hidden = kind !== "all" && card.dataset.projectKind !== kind;
        return !card.hidden;
      });
      rail.scrollTo({ left: 0, behavior: "instant" });
      updateRail();
      if (!reducedMotion.matches) {
        rail.getAnimations().forEach((animation) => animation.cancel());
        rail.animate([{ opacity: .4, translate: "12px" }, { opacity: 1, translate: "none" }], {
          duration: 420,
          easing: "cubic-bezier(.16, 1, .3, 1)",
        });
      }
    });
  }

  let pointer;
  let suppressClick = false;
  rail.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    suppressClick = false;
    pointer = {
      id: event.pointerId,
      x: event.clientX,
      scroll: rail.scrollLeft,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
    };
  });
  rail.addEventListener("pointermove", (event) => {
    if (!pointer || pointer.id !== event.pointerId || !(event.buttons & 1)) return;
    const distance = event.clientX - pointer.x;
    if (!suppressClick && Math.abs(distance) < 8) return;
    if (!suppressClick) {
      rail.setPointerCapture(event.pointerId);
      rail.classList.add("is-dragging");
      suppressClick = true;
    }
    rail.scrollLeft = pointer.scroll - distance;
    const elapsed = Math.max(event.timeStamp - pointer.lastTime, 1);
    pointer.velocity = pointer.velocity * .45 + (pointer.lastX - event.clientX) / elapsed * .55;
    pointer.lastX = event.clientX;
    pointer.lastTime = event.timeStamp;
  });
  function endDrag(event) {
    if (!pointer) return;
    const velocity = pointer.velocity;
    const recent = event.timeStamp - pointer.lastTime < 110;
    pointer = undefined;
    rail.classList.remove("is-dragging");
    if (!suppressClick || !recent || event.type !== "pointerup" || reducedMotion.matches) return;
    const offset = Math.max(-rail.clientWidth, Math.min(rail.clientWidth, velocity * 175));
    rail.scrollTo({ left: rail.scrollLeft + offset, behavior: "smooth" });
  }
  rail.addEventListener("pointerup", endDrag);
  rail.addEventListener("pointercancel", endDrag);
  rail.addEventListener("lostpointercapture", endDrag);
  rail.addEventListener("dragstart", (event) => event.preventDefault());
  rail.addEventListener("click", (event) => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
  }, { capture: true });
  updateRail();
}

function revealProjects() {
  if (reducedMotion.matches || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("project-entered");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.15 });

  document.querySelectorAll(".project-card").forEach((card) => observer.observe(card));
}

function enableFlowButtons() {
  for (const button of document.querySelectorAll("[data-next-step]")) {
    const destination = document.getElementById(button.dataset.nextStep);
    button.hidden = false;
    button.addEventListener("click", () => {
      destination.checked = true;
      destination.focus({ preventScroll: true });
    });
  }
}

function enableSceneComparison() {
  const scene = document.querySelector(".scene");
  const slider = scene?.querySelector(".scene-range");
  const splitMode = document.getElementById("scene-split");
  if (!slider || !splitMode) return;

  function updateSplit() {
    const day = slider.valueAsNumber;
    scene.style.setProperty("--split", `${day}%`);
    slider.setAttribute("aria-valuetext", `白天占 ${day}%，夜景占 ${100 - day}%`);
  }

  function dragSplit(event) {
    const { left, width } = slider.getBoundingClientRect();
    const position = Math.round((event.clientX - left) / width * 100);
    slider.value = Math.min(100, Math.max(0, position));
    updateSplit();
  }

  document.querySelector('label[for="scene-split"]').hidden = false;
  splitMode.hidden = false;
  slider.hidden = false;
  if (!document.getElementById("scene-night").checked) splitMode.checked = true;
  slider.addEventListener("input", updateSplit);
  slider.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    slider.focus({ preventScroll: true });
    slider.setPointerCapture(event.pointerId);
    dragSplit(event);
  });
  slider.addEventListener("pointermove", (event) => {
    if (slider.hasPointerCapture(event.pointerId)) dragSplit(event);
  });
  updateSplit();
}

function enableImageViewer() {
  const sections = [...document.querySelectorAll(".case-demo")];
  const gallerySelector = ".case-gallery img, .case-board img, .case-banner img";
  if (!document.querySelector(gallerySelector) || !("HTMLDialogElement" in window)) return;

  const dialog = document.createElement("dialog");
  dialog.className = "image-viewer";
  dialog.setAttribute("aria-labelledby", "image-viewer-title");
  dialog.innerHTML = `
    <div class="image-viewer-content">
      <header class="image-viewer-header">
        <h2 id="image-viewer-title">项目图片</h2>
        <button type="button" data-viewer-close autofocus>关闭</button>
      </header>
      <div class="image-viewer-stage"><img alt=""></div>
      <p class="image-viewer-caption" aria-live="polite"></p>
      <nav class="image-viewer-controls" aria-label="图片切换">
        <button type="button" data-viewer-previous>上一张</button>
        <button type="button" data-viewer-next>下一张</button>
      </nav>
    </div>
  `;
  document.body.append(dialog);

  const stage = dialog.querySelector(".image-viewer-stage");
  const preview = dialog.querySelector("img");
  const caption = dialog.querySelector(".image-viewer-caption");
  const controls = dialog.querySelector(".image-viewer-controls");
  let images = [];
  let activeIndex = 0;
  let trigger;

  function showImage(index, direction = 0) {
    activeIndex = (index + images.length) % images.length;
    const image = images[activeIndex];
    const figureCaption = image.closest("figure")?.querySelector("figcaption")?.textContent.trim();
    preview.src = image.currentSrc || image.src;
    preview.alt = image.alt;
    caption.textContent = `第 ${activeIndex + 1} 张（共 ${images.length} 张）：${figureCaption || image.alt}`;
    controls.hidden = images.length < 2;

    if (direction && !reducedMotion.matches && typeof preview.animate === "function") {
      preview.getAnimations().forEach((animation) => animation.cancel());
      preview.animate(
        [{ opacity: .55, transform: `translateX(${direction * 10}px)` }, { opacity: 1, transform: "none" }],
        { duration: 150, easing: "ease-out" }
      );
    }
  }

  function moveViewer(direction) {
    if (images.length > 1) showImage(activeIndex + direction, direction);
  }

  for (const section of sections) {
    const sectionImages = [...section.querySelectorAll(gallerySelector)];
    sectionImages.forEach((image, index) => {
      let link = image.closest("a");
      if (!link) {
        link = document.createElement("a");
        link.href = image.src;
        image.before(link);
        link.append(image);
      }
      link.classList.add("gallery-trigger");
      link.setAttribute("aria-label", `放大查看：${image.alt}`);
      link.setAttribute("aria-haspopup", "dialog");
      link.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        images = sectionImages;
        trigger = link;
        showImage(index);
        dialog.showModal();
      });
    });
  }

  dialog.querySelector("[data-viewer-close]").addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-viewer-previous]").addEventListener("click", () => moveViewer(-1));
  dialog.querySelector("[data-viewer-next]").addEventListener("click", () => moveViewer(1));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("keydown", (event) => {
    if (images.length < 2 || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    moveViewer(event.key === "ArrowRight" ? 1 : -1);
  });
  dialog.addEventListener("close", () => trigger?.focus({ preventScroll: true }));

  onHorizontalSwipe(stage, moveViewer);
}

enableShowcaseReel();
enableProjectRail();
revealProjects();
enableFlowButtons();
enableSceneComparison();
enableImageViewer();
