let selectedProject;
const reduceCoverMotion = matchMedia("(prefers-reduced-motion: reduce)");

function findProjectCover(link) {
  if (link.matches(".project-card")) return link.querySelector(".project-media");
  return [...document.querySelectorAll(".showcase-disc")].find((disc) => disc.href === link.href);
}

function shareProjectCover(cover, transition) {
  if (!cover) return;
  cover.style.viewTransitionName = "project-cover";
  const clear = () => cover.style.removeProperty("view-transition-name");
  transition.finished.then(clear, clear);
}

function isCase(url) {
  return /\/cases\/[^/]+\.html$/.test(url.pathname);
}

document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  selectedProject = event.target.closest(".project-card, .showcase-action, .showcase-disc");
  if (!event.target.closest(".case-opening .back-link") || !window.navigation?.canGoBack) return;
  const previous = navigation.entries().find((entry) => entry.index === navigation.currentEntry.index - 1);
  const referrer = document.referrer && new URL(document.referrer);
  if (!previous || !referrer || referrer.origin !== location.origin || isCase(referrer)) return;
  const previousUrl = new URL(previous.url);
  const homeUrl = new URL("../index.html", location.href);
  const directory = new URL("./", homeUrl).pathname;
  if (previousUrl.origin !== homeUrl.origin || ![homeUrl.pathname, directory].includes(previousUrl.pathname)) return;
  event.preventDefault();
  history.back();
});

window.addEventListener("pageswap", (event) => {
  const transition = event.viewTransition;
  const destination = event.activation?.entry?.url && new URL(event.activation.entry.url);
  if (!transition || !destination || reduceCoverMotion.matches) return;
  if (document.querySelector(".case-opening") && !isCase(destination)) transition.types?.add("case-out");
  if (!selectedProject || destination.pathname !== new URL(selectedProject.href).pathname) return;
  shareProjectCover(findProjectCover(selectedProject), transition);
  selectedProject = null;
});

window.addEventListener("pagereveal", (event) => {
  const transition = event.viewTransition;
  const referringEntry = window.navigation?.activation?.from?.url;
  if (!transition || !referringEntry || reduceCoverMotion.matches) return;
  const source = new URL(referringEntry);
  if (document.querySelector(".case-opening") && !isCase(source)) {
    transition.types?.add("case-in");
    return;
  }
  if (!document.body.matches(".portfolio-home") || !isCase(source)) return;
  transition.types?.add("case-out");
  for (const link of document.querySelectorAll(".showcase-action, .project-card:not([hidden])")) {
    if (new URL(link.href).pathname !== source.pathname || getComputedStyle(link).visibility !== "visible") continue;
    const cover = findProjectCover(link);
    const bounds = cover.getBoundingClientRect();
    if (bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth) {
      shareProjectCover(cover, transition);
      break;
    }
  }
});
