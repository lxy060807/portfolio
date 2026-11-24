const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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

  const preview = dialog.querySelector("img");
  const caption = dialog.querySelector(".image-viewer-caption");
  const controls = dialog.querySelector(".image-viewer-controls");
  let images = [];
  let activeIndex = 0;
  let trigger;

  function showImage(index, animate = false) {
    activeIndex = (index + images.length) % images.length;
    const image = images[activeIndex];
    const figureCaption = image.closest("figure")?.querySelector("figcaption")?.textContent.trim();
    preview.src = image.currentSrc || image.src;
    preview.alt = image.alt;
    caption.textContent = `${activeIndex + 1} / ${images.length} · ${figureCaption || image.alt}`;
    controls.hidden = images.length < 2;

    if (animate && !reducedMotion.matches && typeof preview.animate === "function") {
      preview.getAnimations().forEach((animation) => animation.cancel());
      preview.animate([{ opacity: .55 }, { opacity: 1 }], { duration: 150, easing: "ease-out" });
    }
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
  dialog.querySelector("[data-viewer-previous]").addEventListener("click", () => showImage(activeIndex - 1, true));
  dialog.querySelector("[data-viewer-next]").addEventListener("click", () => showImage(activeIndex + 1, true));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("keydown", (event) => {
    if (images.length < 2 || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    showImage(activeIndex + (event.key === "ArrowRight" ? 1 : -1), true);
  });
  dialog.addEventListener("close", () => trigger?.focus({ preventScroll: true }));
}

revealProjects();
enableFlowButtons();
enableImageViewer();
