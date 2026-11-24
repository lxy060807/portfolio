import EmblaCarousel from './vendor/embla-carousel.esm.js';
import PhotoSwipeLightbox from './vendor/photoswipe-lightbox.esm.min.js';

export function createPlaceGallery() {
  const gallery = document.querySelector('#place-gallery');
  const viewport = gallery.querySelector('.gallery-viewport');
  const track = gallery.querySelector('.gallery-track');
  const thumbs = document.querySelector('#gallery-thumbnails');
  const previous = document.querySelector('#gallery-previous');
  const next = document.querySelector('#gallery-next');
  const expand = document.querySelector('#gallery-expand');
  const count = document.querySelector('#gallery-count');
  const caption = document.querySelector('#place-caption');
  const credit = document.querySelector('#photo-credit');
  const license = document.querySelector('#photo-license');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let carousel;
  let current = 0;
  let photos = [];
  let entries = [];
  let placeName = '';

  const lightbox = new PhotoSwipeLightbox({
    gallery: track,
    children: '.gallery-open',
    pswpModule: () => import('./vendor/photoswipe.esm.min.js'),
    mainClass: 'atlas-lightbox',
    bgOpacity: .97,
    showAnimationDuration: 360,
    hideAnimationDuration: 230,
    zoomTitle: '放大或缩小照片',
    closeTitle: '关闭大图',
    arrowPrevTitle: '上一张',
    arrowNextTitle: '下一张',
    errorMsg: '这张照片暂时无法加载。',
    returnFocus: false,
    paddingFn: ({ x }) => x <= 760
      ? { top: 62, bottom: 98, left: 12, right: 12 }
      : { top: 65, bottom: 96, left: 68, right: 68 }
  });

  function showCredit(photo, authorNode, licenseNode) {
    authorNode.href = photo.source;
    authorNode.textContent = photo.author;
    authorNode.setAttribute('aria-label', '照片原页，摄影 ' + photo.author);
    licenseNode.href = photo.licenseUrl;
    licenseNode.textContent = photo.license;
  }

  lightbox.on('uiRegister', () => {
    const pswp = lightbox.pswp;
    pswp.element.setAttribute('aria-label', placeName + '实拍图库');
    pswp.ui.registerElement({
      name: 'atlas-photo-details', order: 9, appendTo: 'root',
      onInit(element) {
        const title = document.createElement('p');
        const author = document.createElement('a');
        const terms = document.createElement('a');
        for (const link of [author, terms]) {
          link.target = '_blank';
          link.rel = 'noreferrer';
        }
        element.append(title, author, terms);
        function update() {
          const photo = photos[pswp.currIndex];
          if (photo) {
            title.textContent = photo.caption;
            showCredit(photo, author, terms);
          }
        }
        pswp.on('change', update);
        update();
      }
    });
  });
  lightbox.on('change', () => carousel?.scrollTo(lightbox.pswp.currIndex, true));
  lightbox.on('openingAnimationEnd', () => lightbox.pswp.element.classList.add('atlas-lightbox-ready'));
  lightbox.on('closingAnimationStart', () => lightbox.pswp.element.classList.remove('atlas-lightbox-ready'));
  lightbox.on('destroy', () => entries[current]?.link.focus({ preventScroll: true }));
  lightbox.init();

  function sync() {
    current = carousel.selectedScrollSnap();
    const photo = photos[current];
    if (!photo) return;
    count.textContent = `${current + 1} / ${photos.length}`;
    caption.textContent = photo.caption;
    previous.disabled = !carousel.canScrollPrev();
    next.disabled = !carousel.canScrollNext();
    showCredit(photo, credit, license);
    entries.forEach(({slide, image, thumbnail}, index) => {
      const active = index === current;
      thumbnail.setAttribute('aria-current', String(active));
      slide.inert = !active;
      if (active) image.id = 'place-photo';
      else image.removeAttribute('id');
    });
    const activeThumb = entries[current].thumbnail;
    const thumbBounds = thumbs.getBoundingClientRect(), activeBounds = activeThumb.getBoundingClientRect();
    if (activeBounds.right > thumbBounds.right || activeBounds.left < thumbBounds.left) {
      thumbs.scrollTo({ left: thumbs.scrollLeft + activeBounds.left - thumbBounds.left - 4,
        behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    }
  }

  function makeEntry(photo, index) {
    const slide = document.createElement('div');
    slide.className = 'gallery-slide';
    const link = document.createElement('a');
    link.className = 'gallery-open';
    link.href = photo.src;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.dataset.pswpWidth = photo.width;
    link.dataset.pswpHeight = photo.height;
    link.dataset.cropped = 'true';
    link.setAttribute('aria-label', '全屏查看：' + photo.caption);
    const image = document.createElement('img');
    image.src = photo.src;
    image.alt = photo.caption;
    image.decoding = 'async';
    image.loading = index === 0 ? 'eager' : 'lazy';
    image.draggable = false;
    image.style.objectPosition = photo.position ?? 'center';
    const unavailable = document.createElement('span');
    unavailable.className = 'gallery-unavailable';
    unavailable.textContent = '这张照片暂时无法加载';
    unavailable.hidden = true;
    image.addEventListener('error', () => {
      image.hidden = true;
      unavailable.hidden = false;
    });
    link.append(image, unavailable);
    slide.append(link);

    const thumbnail = document.createElement('button');
    thumbnail.className = 'gallery-thumbnail';
    thumbnail.type = 'button';
    thumbnail.setAttribute('aria-label', photo.caption);
    const thumbnailImage = document.createElement('img');
    thumbnailImage.src = photo.thumb ?? photo.src;
    thumbnailImage.alt = '';
    thumbnailImage.draggable = false;
    thumbnailImage.style.objectPosition = image.style.objectPosition;
    thumbnail.append(thumbnailImage);
    thumbnail.addEventListener('click', () => carousel.scrollTo(index));
    return { slide, link, image, thumbnail };
  }

  function show(name, images) {
    carousel?.destroy();
    placeName = name;
    photos = images;
    current = 0;
    thumbs.hidden = previous.hidden = next.hidden = count.hidden = images.length < 2;
    gallery.setAttribute('aria-label', name + '实拍照片');
    entries = images.map(makeEntry);
    track.replaceChildren(...entries.map(entry => entry.slide));
    thumbs.replaceChildren(...entries.map(entry => entry.thumbnail));
    thumbs.scrollLeft = 0;
    carousel = EmblaCarousel(viewport, {
      loop: false, align: 'start', duration: 23,
      breakpoints: { '(prefers-reduced-motion: reduce)': { duration: 0 } }
    });
    carousel.on('select', sync).on('reInit', sync);
    sync();
  }

  previous.addEventListener('click', () => carousel?.scrollPrev());
  next.addEventListener('click', () => carousel?.scrollNext());
  expand.addEventListener('click', () => entries[current]?.link.click());
  gallery.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || !carousel) return;
    if (event.key === 'ArrowLeft') carousel.scrollPrev();
    else if (event.key === 'ArrowRight') carousel.scrollNext();
    else return;
    event.preventDefault();
  });

  return { show };
}
