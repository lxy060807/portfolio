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

function enableShowcaseSwipe() {
  const stage = document.querySelector(".showcase-scenes");
  if (!stage) return;
  const selections = [...document.querySelectorAll('input[name="showcase"]')];
  onHorizontalSwipe(stage, (direction) => {
    const active = selections.findIndex((input) => input.checked);
    const next = selections[active + direction];
    if (next) next.checked = true;
  });
}

function enableProjectRail() {
  const rail = document.getElementById("project-list");
  const controls = document.querySelector(".work-controls");
  if (!rail || !controls) return;

  const [previous, next] = [...controls.querySelectorAll("button")];
  const cards = [...rail.querySelectorAll(".project-card")];
  controls.hidden = false;
  function updateControls() {
    previous.disabled = rail.scrollLeft <= 2;
    next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
  }
  function advance(direction) {
    const distance = cards[1].offsetLeft - cards[0].offsetLeft;
    rail.scrollBy({ left: direction * distance, behavior: reducedMotion.matches ? "instant" : "smooth" });
  }
  previous.addEventListener("click", () => advance(-1));
  next.addEventListener("click", () => advance(1));
  rail.addEventListener("scroll", updateControls, { passive: true });
  window.addEventListener("resize", updateControls);

  let pointer;
  let suppressClick = false;
  rail.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    suppressClick = false;
    pointer = { id: event.pointerId, x: event.clientX, scroll: rail.scrollLeft };
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
  });
  function endDrag() {
    pointer = undefined;
    rail.classList.remove("is-dragging");
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
  updateControls();
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

enableShowcaseSwipe();
enableProjectRail();
revealProjects();
enableFlowButtons();
enableSceneComparison();
enableImageViewer();
