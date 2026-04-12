import type {
  Review,
  ReviewStatus,
  ReviewTemplateData,
} from "../../shared/types";
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

let currentStatusFilter: ReviewStatus = "pending";
const reviewsSectionTitle = document.querySelector(".reviews .section-title");
const statusFilterElement = document.querySelector(".status-filter");

const statusFilterButtonPending = document.querySelector(
  ".status-filter__button-pending",
);
const statusFilterButtonAccepted = document.querySelector(
  ".status-filter__button-accepted",
);
const statusFilterButtonDeleted = document.querySelector(
  ".status-filter__button-deleted",
);

statusFilterButtonAccepted?.addEventListener("click", () =>
  changeStatusFilter("accepted"),
);
statusFilterButtonPending?.addEventListener("click", () =>
  changeStatusFilter("pending"),
);
statusFilterButtonDeleted?.addEventListener("click", () =>
  changeStatusFilter("deleted"),
);

const statusNamePl: Record<ReviewStatus, string> = {
  pending: "Oczekujące",
  accepted: "Zaakceptowane",
  deleted: "Usunięte",
};

function changeStatusFilter(status: ReviewStatus) {
  if (currentStatusFilter === status) return;
  currentStatusFilter = status;
  statusFilterElement?.setAttribute("data-current-filter", status);
  if (reviewsSectionTitle) reviewsSectionTitle.innerHTML = statusNamePl[status];
  console.log(filterReviews(allReviews, currentStatusFilter));
}

async function fetchReviews(): Promise<Review[]> {
  const res = await fetch("/api/admin/get-reviews");

  if (!res.ok) {
    alert("Coś poszło nie tak przy pobieraniu opini. :(");
  }

  const data = await res.json();
  return data.reviews;
}

let allReviews = await fetchReviews();

function filterReviews(reviews: Review[], status: ReviewStatus): Review[] {
  return reviews.filter((r) => r.status === status);
}

function generateReviews(reviews: Review[]) {}
