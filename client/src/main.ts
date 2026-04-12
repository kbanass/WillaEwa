const imgs = document.querySelectorAll(".hero__img");
let current = 0;
setInterval(() => {
  imgs[current].classList.remove("hero__img--active");
  current = (current + 1) % imgs.length;
  const next = imgs[current];
  next.classList.add("hero__img--active");
}, 6000);

document.querySelectorAll(".review-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const text = btn.previousElementSibling;
    const expanded = text?.classList.toggle("expanded");
    btn.textContent = expanded ? "Zwiń" : "Czytaj więcej";
  });
});

document.querySelectorAll(".review-card").forEach((card) => {
  const text = card.querySelector(".review-text");
  const btn = card.querySelector(".review-toggle");
});

// Slider logic
const roomsSlider = document.querySelector(".rooms-slider");
const roomsSliderPrevBtn = document.querySelector(".rooms-slider__left-button");
const roomsSliderNextBtn = document.querySelector(
  ".rooms-slider__right-button",
);

const roomsSliderImgs = document.querySelectorAll(".rooms-slider__img");
let roomsSliderCurrent = 0;

if (roomsSlider && roomsSliderPrevBtn && roomsSliderNextBtn) {
  roomsSliderPrevBtn.addEventListener("click", (e) => {
    roomsSliderImgs[roomsSliderCurrent].classList.remove(
      "rooms-slider__img-active",
    );
    if (roomsSliderCurrent <= 0)
      roomsSliderCurrent = roomsSliderImgs.length - 1;
    else roomsSliderCurrent--;

    roomsSliderImgs[roomsSliderCurrent].classList.add(
      "rooms-slider__img-active",
    );
  });

  roomsSliderNextBtn.addEventListener("click", (e) => {
    roomsSliderImgs[roomsSliderCurrent].classList.remove(
      "rooms-slider__img-active",
    );
    if (roomsSliderCurrent >= roomsSliderImgs.length - 1)
      roomsSliderCurrent = 0;
    else roomsSliderCurrent++;

    roomsSliderImgs[roomsSliderCurrent].classList.add(
      "rooms-slider__img-active",
    );
  });
}

const reviews = document.querySelectorAll(".review-card");

const maxReviewsPerPage = 5;
const numOfPages = Math.ceil(reviews.length / maxReviewsPerPage);

let currentReviewsPage = 1;
const page = document.querySelector(".reviews-navigation__page");
const reviewsNavigation = document.querySelector(".reviews-navigation");

const reviewsNavigationLeftBtn = document.querySelector(
  ".reviews-navigation__left-button",
);
const reviewsNavigationRightBtn = document.querySelector(
  ".reviews-navigation__right-button",
);
const reviewsSection = document.querySelector(".reviews");

if (reviews.length > 5) {
  updateReviewsNavigation();

  reviewsNavigationLeftBtn?.addEventListener("click", (e) => {
    if (currentReviewsPage === 1) {
      currentReviewsPage = numOfPages;
    } else {
      currentReviewsPage--;
    }
    updateReviewsNavigation();
    reviewsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  reviewsNavigationRightBtn?.addEventListener("click", (e) => {
    if (currentReviewsPage === numOfPages) {
      currentReviewsPage = 1;
    } else {
      currentReviewsPage++;
    }
    updateReviewsNavigation();
    reviewsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
} else {
  reviewsNavigation?.classList.add("hidden");
}

function updateReviewsNavigation() {
  for (let i = 0; i < reviews.length; i++) {
    reviews[i].classList.add("hidden");
  }

  const start = (currentReviewsPage - 1) * maxReviewsPerPage;
  const end = Math.min(start + maxReviewsPerPage, reviews.length);

  for (let i = start; i < end; i++) {
    reviews[i].classList.remove("hidden");
  }

  if (page) page.innerHTML = `${currentReviewsPage} / ${numOfPages}`;
}
