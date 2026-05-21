document.addEventListener("touchstart", () => {}, { passive: true });

// ── Hero slideshow ────────────────────────────────────────────────────────────

const heroImgs = document.querySelectorAll(".hero__img");
let heroCurrent = 0;
setInterval(() => {
  heroImgs[heroCurrent].classList.remove("hero__img--active");
  heroCurrent = (heroCurrent + 1) % heroImgs.length;
  heroImgs[heroCurrent].classList.add("hero__img--active");
}, 5000);

// ── Rooms slider ─────────────────────────────────────────────────────────────

// import.meta.glob importuje pliki z folderu rooms/ w czasie budowania
const roomsGlob = import.meta.glob<string>("../public/rooms/*.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});
const ROOMS_PHOTOS = Object.values(roomsGlob);

const roomsSlider = document.querySelector(".rooms-slider");
const roomsButtonsWrapper = document.querySelector(
  ".rooms-slider__buttons-wrapper",
);

// Wstrzyknij obrazy do slidera dynamicznie
ROOMS_PHOTOS.forEach((src, i) => {
  const img = document.createElement("img");
  img.className =
    "rooms-slider__img" + (i === 0 ? " rooms-slider__img--active" : "");
  img.src = src;
  img.alt = `Pokój ${i + 1}`;
  roomsSlider?.insertBefore(img, roomsButtonsWrapper);
});

const roomsPrevBtn = document.querySelector(".rooms-slider__btn--prev");
const roomsNextBtn = document.querySelector(".rooms-slider__btn--next");
const roomsImgs = document.querySelectorAll(".rooms-slider__img");
let roomsCurrent = 0;

let isSliding = false;

function slideTo(next: number) {
  if (isSliding) return;
  isSliding = true;

  const current = roomsImgs[roomsCurrent] as HTMLElement;
  const nextImg = roomsImgs[next] as HTMLElement;

  // Pokaż nowe zdjęcie jako przezroczyste (pod aktualnym)
  nextImg.classList.add("rooms-slider__img--fading");

  // Wymuś reflow żeby transition zadziałało
  nextImg.getBoundingClientRect();

  // Crossfade: jednocześnie fade out stare, fade in nowe
  current.classList.replace(
    "rooms-slider__img--active",
    "rooms-slider__img--fading",
  );
  nextImg.classList.replace(
    "rooms-slider__img--fading",
    "rooms-slider__img--active",
  );

  setTimeout(() => {
    current.classList.remove("rooms-slider__img--fading");
    roomsCurrent = next;
    isSliding = false;
  }, 120);
}

if (roomsSlider && roomsPrevBtn && roomsNextBtn) {
  roomsPrevBtn.addEventListener("click", () => {
    const next = roomsCurrent <= 0 ? roomsImgs.length - 1 : roomsCurrent - 1;
    slideTo(next);
  });

  roomsNextBtn.addEventListener("click", () => {
    const next = roomsCurrent >= roomsImgs.length - 1 ? 0 : roomsCurrent + 1;
    slideTo(next);
  });
}

// ── Reviews pagination ────────────────────────────────────────────────────────

type ReviewData = { id: number; size: 1 | 2 };
type ReviewsPages = Record<number, number[]>;

const MAX_SLOTS = 6;

function buildReviewsPages(reviews: ReviewData[]): ReviewsPages {
  const pages: ReviewsPages = {};
  const remaining = [...reviews];
  let pageNum = 1;

  while (remaining.length > 0) {
    const pageIds: number[] = [];
    let currentSum = 0;
    const usedIndices = new Set<number>();

    let i = 0;
    while (i < remaining.length) {
      if (usedIndices.has(i)) {
        i++;
        continue;
      }

      const review = remaining[i]!;

      if (currentSum + review.size <= MAX_SLOTS) {
        pageIds.push(review.id);
        currentSum += review.size;
        usedIndices.add(i);
        i++;
        if (currentSum === MAX_SLOTS) break;
      } else {
        // Opinia nie mieści się na stronie.
        // Szukaj dalej w kolejce takiej, która wypełni stronę dokładnie do MAX_SLOTS.
        let foundIdx = -1;
        for (let j = i + 1; j < remaining.length; j++) {
          if (
            !usedIndices.has(j) &&
            currentSum + remaining[j]!.size === MAX_SLOTS
          ) {
            foundIdx = j;
            break;
          }
        }
        if (foundIdx !== -1) {
          pageIds.push(remaining[foundIdx]!.id);
          usedIndices.add(foundIdx);
        }
        break;
      }
    }

    // Usuń użyte opinie z kolejki (od końca, żeby nie przesunąć indeksów)
    for (const idx of [...usedIndices].sort((a, b) => b - a)) {
      remaining.splice(idx, 1);
    }

    if (pageIds.length === 0) break;
    pages[pageNum++] = pageIds;
  }

  return pages;
}

const allCards = document.querySelectorAll(
  ".review-card",
) as NodeListOf<HTMLElement>;
const pageNumberEl = document.querySelector(".reviews__navigation-page");
const navigationEl = document.querySelector(".reviews__navigation");
const prevBtn = document.querySelector(".reviews__nav-btn--prev");
const nextBtn = document.querySelector(".reviews__nav-btn--next");
const reviewsSection = document.querySelector(".reviews");

const cardMap = new Map<number, HTMLElement>();
const reviewsData: ReviewData[] = [];

allCards.forEach((el) => {
  const id = Number(el.dataset.id);
  if (isNaN(id)) return;
  cardMap.set(id, el);
  reviewsData.push({ id, size: el.classList.contains("long-quote") ? 2 : 1 });
});

const reviewsPages = buildReviewsPages(reviewsData);
const numPages = Object.keys(reviewsPages).length;
let currentPage = 1;

function showPage(pageNum: number) {
  const nextIds = new Set(reviewsPages[pageNum] ?? []);

  cardMap.forEach((el) => {
    if (!el.classList.contains("hidden")) {
      el.classList.add("is-fading");
    }
  });

  setTimeout(() => {
    cardMap.forEach((el, id) => {
      el.classList.remove("is-fading");
      el.classList.toggle("hidden", !nextIds.has(id));
    });

    requestAnimationFrame(() => {
      nextIds.forEach((id) => {
        const el = cardMap.get(id);
        el?.classList.add("is-fading");
        requestAnimationFrame(() => el?.classList.remove("is-fading"));
      });
    });

    if (pageNumberEl) pageNumberEl.textContent = `${pageNum} / ${numPages}`;
  }, 200);
}

if (numPages <= 1) {
  navigationEl?.classList.add("hidden");
} else {
  prevBtn?.addEventListener("click", () => {
    currentPage = currentPage === 1 ? numPages : currentPage - 1;
    showPage(currentPage);
    reviewsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  nextBtn?.addEventListener("click", () => {
    currentPage = currentPage === numPages ? 1 : currentPage + 1;
    showPage(currentPage);
    reviewsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  showPage(1);
}

// ── Gallery modal ────────────────────────────────────────────────────────────

const galleryPublicGlob = import.meta.glob<string>("../public/*.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});
const galleryExclude = /placeholder|favicon|map-/i;
const galleryPublicPhotos = Object.entries(galleryPublicGlob)
  .filter(([path]) => !galleryExclude.test(path))
  .map(([, url]) => url);

const GALLERY_PHOTOS = [...galleryPublicPhotos, ...ROOMS_PHOTOS];

const galleryModal = document.getElementById("gallery-modal")!;
const galleryImg = document.getElementById("gallery-img") as HTMLImageElement;
const galleryCounter = document.getElementById("gallery-counter")!;
const galleryBackdrop = document.getElementById("gallery-backdrop")!;

let galleryIndex = 0;
let isGalleryChanging = false;

const preloaded = new Set<string>();

function preload(index: number) {
  const total = GALLERY_PHOTOS.length;
  const src = GALLERY_PHOTOS[((index % total) + total) % total]!;
  if (preloaded.has(src)) return;
  preloaded.add(src);
  new Image().src = src;
}

function preloadAdjacent(index: number) {
  preload(index + 1);
  preload(index + 2);
  preload(index - 1);
}

function openGallery(index: number) {
  galleryIndex = index;
  galleryImg.classList.remove("gallery-modal__img--fading");
  setGalleryPhoto();
  preloadAdjacent(index);
  galleryModal.classList.add("open");
  galleryModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeGallery() {
  galleryModal.classList.remove("open");
  galleryModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function setGalleryPhoto() {
  galleryImg.src = GALLERY_PHOTOS[galleryIndex]!;
  galleryImg.alt = `Zdjęcie ${galleryIndex + 1}`;
  galleryCounter.textContent = `${galleryIndex + 1} / ${GALLERY_PHOTOS.length}`;
}

function galleryChangeTo(next: number) {
  if (isGalleryChanging) return;
  isGalleryChanging = true;

  galleryImg.classList.add("gallery-modal__img--fading");

  const total = GALLERY_PHOTOS.length;
  const src = GALLERY_PHOTOS[((next % total) + total) % total]!;

  function showNext() {
    galleryIndex = next;
    setGalleryPhoto();
    galleryImg.classList.remove("gallery-modal__img--fading");
    preloadAdjacent(next);
    isGalleryChanging = false;
  }

  // Poczekaj na fade-out, potem sprawdź czy obraz jest już w cache
  setTimeout(() => {
    const tmp = new Image();
    tmp.onload = showNext;
    tmp.onerror = showNext;
    tmp.src = src;
    // Jeśli obraz był już w cache przeglądarki, complete=true od razu
    if (tmp.complete) {
      tmp.onload = null;
      showNext();
    }
  }, 200);
}

function galleryPrev() {
  galleryChangeTo(
    galleryIndex === 0 ? GALLERY_PHOTOS.length - 1 : galleryIndex - 1,
  );
}

function galleryNext() {
  galleryChangeTo(
    galleryIndex === GALLERY_PHOTOS.length - 1 ? 0 : galleryIndex + 1,
  );
}

document
  .getElementById("gallery-open")
  ?.addEventListener("click", () => openGallery(0));
document
  .getElementById("gallery-close")
  ?.addEventListener("click", closeGallery);
document.getElementById("gallery-prev")?.addEventListener("click", galleryPrev);
document.getElementById("gallery-next")?.addEventListener("click", galleryNext);
galleryBackdrop.addEventListener("click", closeGallery);

// Otwórz modal na konkretnym zdjęciu po kliknięciu w podgląd.
// Dopasowanie po pathname URL, bo Vite hashuje nazwy assetów.
document
  .querySelectorAll<HTMLImageElement>(".gallery__grid img")
  .forEach((img) => {
    img.addEventListener("click", () => {
      const pathname = new URL(img.src).pathname;
      const index = GALLERY_PHOTOS.findIndex(
        (url) => url.endsWith(pathname) || pathname.endsWith(url),
      );
      openGallery(index !== -1 ? index : 0);
    });
  });

// Nawigacja klawiaturą
document.addEventListener("keydown", (e) => {
  if (!galleryModal.classList.contains("open")) return;
  if (e.key === "ArrowLeft") galleryPrev();
  if (e.key === "ArrowRight") galleryNext();
  if (e.key === "Escape") closeGallery();
});

// Swipe na mobile
let touchStartX = 0;
galleryModal.addEventListener(
  "touchstart",
  (e) => {
    touchStartX = e.touches[0]!.clientX;
  },
  { passive: true },
);
galleryModal.addEventListener(
  "touchend",
  (e) => {
    const diff = touchStartX - e.changedTouches[0]!.clientX;
    if (Math.abs(diff) > 50) diff > 0 ? galleryNext() : galleryPrev();
  },
  { passive: true },
);

// ── Review toggle ("Czytaj więcej") ──────────────────────────────────────────

document.querySelectorAll(".review-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const quote = btn.previousElementSibling;
    const expanded = quote?.classList.toggle("expanded");
    btn.textContent = expanded ? "Zwiń" : "Czytaj więcej";
  });
});
