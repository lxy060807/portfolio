let selectedProject;

function findProjectCover(link) {
  if (link.matches(".project-card")) return link.querySelector(".project-media");
  return [...document.querySelectorAll(".showcase-disc")].find((disc) => disc.href === link.href);
}

function shareProjectCover(cover, transition) {
  if (!cover) return;
  cover.style.viewTransitionName = "project-cover";
  transition.finished.finally(() => cover.style.removeProperty("view-transition-name"));
}

document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  selectedProject = event.target.closest(".project-card, .showcase-action, .showcase-disc");
});

window.addEventListener("pageswap", (event) => {
  if (!event.viewTransition || !selectedProject || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const destination = event.activation?.entry?.url;
  if (destination && new URL(destination).pathname !== new URL(selectedProject.href).pathname) return;
  shareProjectCover(findProjectCover(selectedProject), event.viewTransition);
  selectedProject = null;
});

window.addEventListener("pagereveal", (event) => {
  const source = window.navigation?.activation?.from?.url;
  if (!event.viewTransition || !source || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const sourcePath = new URL(source).pathname;
  for (const link of document.querySelectorAll(".showcase-action, .project-card:not([hidden])")) {
    if (new URL(link.href).pathname !== sourcePath || getComputedStyle(link).visibility !== "visible") continue;
    const cover = findProjectCover(link);
    const bounds = cover.getBoundingClientRect();
    if (bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth) {
      shareProjectCover(cover, event.viewTransition);
      break;
    }
  }
});
