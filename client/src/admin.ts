import type { Review, ReviewStatus } from "../../shared/types";
import { formatDate, getInitials } from "../../shared/utils";

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    '<div class="star star--filled"></div>'.repeat(full) +
    (half ? '<div class="star star--half"></div>' : "") +
    '<div class="star"></div>'.repeat(empty)
  );
}

let currentStatusFilter: StatusFilter = "pending";
const reviewsSectionTitle = document.querySelector(".reviews .section-title");
const statusFilterElement = document.querySelector(".status-filter");
const reviewsContainerElement = document.querySelector(".reviews__grid")!;

type StatusFilter = ReviewStatus | "all";
const statusNamePl: Record<StatusFilter, string> = {
  all: "Wszystkie",
  pending: "Oczekujące",
  accepted: "Zaakceptowane",
  deleted: "Usunięte",
};

const pendingChanges = new Map<number, ReviewStatus>();
const applyChangesButton = document.querySelector("#apply-changes")!;

applyChangesButton.addEventListener("click", () => applyChanges());

// --- Status filter ---

statusFilterElement?.addEventListener("click", (e) => {
  const button = (e.target as HTMLElement).closest("button");
  if (!button) return;

  if (button.classList.contains("status-filter__btn--pending")) {
    changeStatusFilter("pending");
  } else if (button.classList.contains("status-filter__btn--accepted")) {
    changeStatusFilter("accepted");
  } else if (button.classList.contains("status-filter__btn--deleted")) {
    changeStatusFilter("deleted");
  } else if (button.classList.contains("status-filter__btn--all")) {
    changeStatusFilter("all");
  }
});

function changeStatusFilter(filter: StatusFilter) {
  if (currentStatusFilter === filter) return;
  currentStatusFilter = filter;
  statusFilterElement?.setAttribute("data-current-filter", filter);
  if (reviewsSectionTitle)
    reviewsSectionTitle.textContent = statusNamePl[filter];
  renderReviews();
}
// --- Fetch & render ---

async function fetchReviews(): Promise<Review[]> {
  const res = await fetch("/api/admin/get-reviews");
  if (!res.ok) {
    alert("Błąd podczas pobierania opini z serwera");
    throw new Error("Błąd pobierania recenzji");
  }

  const data = await res.json();
  return data.reviews;
}

let allReviews = await fetchReviews();
renderReviews();

function renderReviews() {
  const filtered =
    currentStatusFilter === "all"
      ? allReviews
      : allReviews.filter((r) => r.status === currentStatusFilter);
  reviewsContainerElement.innerHTML = filtered.map(renderReview).join("");
}

// --- Reviews cards Events ---

reviewsContainerElement.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;

  const toggleBtn = target.closest(".review-toggle") as HTMLElement | null;
  if (toggleBtn) {
    const quote = toggleBtn.previousElementSibling;
    const expanded = quote?.classList.toggle("expanded");
    toggleBtn.textContent = expanded ? "Zwiń" : "Czytaj więcej";
    return;
  }

  // Status picker
  const statusBtn = target.closest(
    "[class*='status-picker__btn']",
  ) as HTMLElement | null;
  if (!statusBtn) return;

  const card = statusBtn.closest(".review-card") as HTMLElement;
  if (!card) return;

  const id = Number(card.dataset.id);
  let newStatus: ReviewStatus | null = null;

  if (statusBtn.classList.contains("status-picker__btn--accepted")) {
    newStatus = "accepted";
  } else if (statusBtn.classList.contains("status-picker__btn--pending")) {
    newStatus = "pending";
  } else if (statusBtn.classList.contains("status-picker__btn--deleted")) {
    newStatus = "deleted";
  }

  if (newStatus) {
    const review = allReviews.find((r) => r.id === id);
    if (!review) return;

    if (newStatus === review.status) {
      pendingChanges.delete(id);
      card.removeAttribute("data-pending-status");
    } else {
      pendingChanges.set(id, newStatus);
      card.setAttribute("data-pending-status", newStatus);
    }
  }
  updateApplyButton();
});

function updateApplyButton() {
  const count = pendingChanges.size;

  if (count === 0) {
    applyChangesButton.classList.add("hidden");
  } else {
    applyChangesButton.classList.remove("hidden");
    applyChangesButton.textContent = `Zatwierdź zmiany: ${count} ${count === 1 ? "opinia" : count < 5 ? "opinie" : "opinii"}`;
  }
}

async function applyChanges() {
  if (pendingChanges.size === 0) return;

  const changes = Array.from(pendingChanges, ([id, status]) => ({
    id,
    status,
  }));

  const res = await fetch("/api/admin/change-statuses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviews: changes }),
  });

  if (!res.ok) {
    alert("Błąd zapisywania zmian");
    return;
  }

  // zaktualizuj lokalny stan
  for (const [id, status] of pendingChanges) {
    const review = allReviews.find((r) => r.id === id);
    if (review) review.status = status;
  }

  pendingChanges.clear();
  updateApplyButton();
  renderReviews();
  alert("Udało się zaktualizować status opini");
}

function renderReview(review: Review) {
  const pendingStatus = pendingChanges.get(review.id);
  const pendingAttr = pendingStatus
    ? `data-pending-status="${pendingStatus}"`
    : "";

  return `
            <div class="review-card ${review.quote.length > 450 && "long-quote"}" data-status="${review.status}" data-id="${review.id}" ${pendingAttr}>
            <div class="review-card__source">
              <div class="review-card__source-logo-wrap">
                <div class="review-card__source-logo">
                ${
                  review.source === "google"
                    ? `                  
                    <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path
                      d="M12 2a9.96 9.96 0 0 1 6.29 2.226a1 1 0 0 1 .04 1.52l-1.51 1.362a1 1 0 0 1 -1.265 .06a6 6 0 1 0 2.103 6.836l.001 -.004h-3.66a1 1 0 0 1 -.992 -.883l-.007 -.117v-2a1 1 0 0 1 1 -1h6.945a1 1 0 0 1 .994 .89c.04 .367 .061 .737 .061 1.11c0 5.523 -4.477 10 -10 10s-10 -4.477 -10 -10s4.477 -10 10 -10z"
                    />
                    </svg>`
                    : `<img src="/favicon/favicon.svg" width="24" height="24" alt="Willa Ewa" />`
                }
                </div>
                <span class="review-card__source-name">${review.source === "google" ? "Google" : "Strona"}</span>
              </div>

              <div class="review-card__stars">
                ${renderStars(review.rating)}
              </div>
            </div>

            ${review.quote ? `<blockquote class="review-card__quote">„${review.quote}"</blockquote>` : ""}
            <button class="review-toggle">Czytaj więcej</button>

            <div class="review-card__bottom">
              <div class="review-card__author">
                <div class="review-card__avatar" aria-hidden="true">${getInitials(review.author)}</div>
                <div>
                  <p class="review-card__name">${review.author}</p>
                  <p class="review-card__date">${formatDate(review.time)}</p>
                </div>
              </div>
              <div class="status-picker">
                <button class="status-picker__btn--accepted">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-circle-check"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
                    <path d="M9 12l2 2l4 -4" />
                  </svg>
                </button>
                <button class="status-picker__btn--pending">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-question-mark"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path
                      d="M8 8a3.5 3 0 0 1 3.5 -3h1a3.5 3 0 0 1 3.5 3a3 3 0 0 1 -2 3a3 4 0 0 0 -2 4"
                    />
                    <path d="M12 19l0 .01" />
                  </svg>
                </button>
                <button class="status-picker__btn--deleted">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="icon icon-tabler icons-tabler-outline icon-tabler-trash"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M4 7l16 0" />
                    <path d="M10 11l0 6" />
                    <path d="M14 11l0 6" />
                    <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
                    <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          `;
}
