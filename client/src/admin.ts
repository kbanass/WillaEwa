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
                    : `
                    <svg xmlns="http://www.w3.org/2000/svg" 
                    width="127" 
                    height="18" 
                    viewBox="0 0 127 18" 
                    fill="none">
                    <path d="M15.5742 17.351L10.7484 4.27742C10.6021 3.86796 10.4632 3.54624 10.3316 3.31226C10.2 3.07828 10.0391 2.90279 9.84901 2.78581C9.67353 2.66882 9.42493 2.5957 9.1032 2.56645L8.51095 2.52258V1.6671C8.84729 1.68172 9.24213 1.69634 9.69546 1.71097C10.1634 1.72559 10.6241 1.7329 11.0774 1.7329H11.1213C11.4722 1.7329 11.8305 1.7329 12.1961 1.7329C12.5617 1.71828 12.9127 1.71097 13.249 1.71097C13.5854 1.69634 13.8925 1.68903 14.1703 1.68903C14.4628 1.67441 14.7114 1.6671 14.9161 1.6671V2.50064L14.4774 2.56645C13.9071 2.62495 13.5415 2.79312 13.3806 3.07097C13.2344 3.33419 13.2709 3.80946 13.4903 4.49677L16.978 13.951L16.6051 14.1045L19.3251 5.94451C19.6761 4.93548 19.698 4.1458 19.3909 3.57548C19.0985 3.00516 18.4916 2.66882 17.5703 2.56645L17.1097 2.52258V1.6671C17.6946 1.68172 18.3015 1.69634 18.9303 1.71097C19.5591 1.72559 20.1587 1.7329 20.729 1.7329C21.2701 1.7329 21.7746 1.72559 22.2426 1.71097C22.7105 1.69634 23.1419 1.68172 23.5368 1.6671V2.52258L23.1639 2.56645C22.6666 2.63957 22.2572 2.77849 21.9355 2.98322C21.6284 3.18796 21.3505 3.50968 21.1019 3.94839C20.8679 4.37247 20.6193 4.97204 20.3561 5.7471L16.3858 17.351H15.5742ZM7.32643 17.351L2.47869 4.29935C2.33245 3.88989 2.18621 3.56817 2.03998 3.33419C1.90837 3.08559 1.74751 2.91011 1.5574 2.80774C1.36729 2.69075 1.09675 2.61763 0.745785 2.58839L-2.15694e-05 2.52258V1.6671C0.263204 1.6671 0.548366 1.67441 0.855462 1.68903C1.16256 1.70365 1.48428 1.71828 1.82062 1.7329C2.15697 1.7329 2.47869 1.7329 2.78578 1.7329H2.82966H2.87353C3.22449 1.7329 3.57546 1.7329 3.92643 1.7329C4.29202 1.71828 4.64299 1.71097 4.97933 1.71097C5.31568 1.69634 5.62277 1.68903 5.90062 1.68903C6.1931 1.67441 6.4417 1.6671 6.64643 1.6671V2.50064L6.18578 2.56645C5.63009 2.62495 5.27181 2.79312 5.11095 3.07097C4.96471 3.34882 5.00858 3.82408 5.24256 4.49677L8.83998 14.2142L8.29159 14.4994L11.6916 4.80387L12.1742 5.96645L8.13804 17.351H7.32643ZM27.7737 11.56V8.59871C27.7737 7.96989 27.6567 7.53118 27.4228 7.28258C27.2034 7.03398 26.772 6.88043 26.1286 6.82193L25.4486 6.73419V5.90064C25.741 5.91527 26.0116 5.92989 26.2602 5.94451C26.5088 5.94451 26.772 5.94451 27.0499 5.94451C27.6787 5.94451 28.249 5.92258 28.7608 5.87871C29.2873 5.82021 29.7625 5.73978 30.1866 5.63742V5.90064V11.56H27.7737ZM28.9802 17.1316C28.2929 17.1316 27.6787 17.1389 27.1376 17.1535C26.5965 17.1682 26.0335 17.1828 25.4486 17.1974V16.3419L26.1724 16.2761C26.772 16.2323 27.1888 16.086 27.4228 15.8374C27.6567 15.5888 27.7737 15.1574 27.7737 14.5432V11.56H30.1866V14.5432C30.1866 15.1574 30.3036 15.5888 30.5376 15.8374C30.7716 16.086 31.1884 16.2323 31.7879 16.2761L32.5118 16.3419V17.1974C31.9415 17.1828 31.3785 17.1682 30.8228 17.1535C30.2817 17.1389 29.6675 17.1316 28.9802 17.1316ZM28.9802 3.42193C28.5268 3.42193 28.1393 3.2757 27.8176 2.98322C27.4959 2.67613 27.335 2.29591 27.335 1.84258C27.335 1.38925 27.4959 1.01634 27.8176 0.723869C28.1393 0.416772 28.5268 0.263224 28.9802 0.263224C29.4335 0.263224 29.821 0.416772 30.1428 0.723869C30.4645 1.01634 30.6253 1.38925 30.6253 1.84258C30.6253 2.29591 30.4572 2.67613 30.1208 2.98322C29.7991 3.2757 29.4189 3.42193 28.9802 3.42193ZM38.8402 17.1316C38.1529 17.1316 37.5387 17.1389 36.9976 17.1535C36.4565 17.1682 35.8935 17.1828 35.3086 17.1974V16.3419L36.0324 16.2761C36.632 16.2323 37.0488 16.086 37.2828 15.8374C37.5167 15.5888 37.6337 15.1574 37.6337 14.5432V11.56H40.0466V14.5432C40.0466 15.1574 40.1636 15.5888 40.3976 15.8374C40.6316 16.086 41.0484 16.2323 41.6479 16.2761L42.3718 16.3419V17.1974C41.8015 17.1828 41.2385 17.1682 40.6828 17.1535C40.1417 17.1389 39.5275 17.1316 38.8402 17.1316ZM37.6337 11.56V2.96129C37.6337 2.33247 37.5167 1.89376 37.2828 1.64516C37.0634 1.38193 36.632 1.22107 35.9886 1.16258L35.3086 1.09677V0.241289C35.601 0.270536 35.8716 0.292471 36.1202 0.307095C36.3688 0.307095 36.632 0.307095 36.9099 0.307095C37.5387 0.307095 38.109 0.28516 38.6208 0.241289C39.1473 0.182794 39.6225 0.102364 40.0466 -1.43605e-06V0.241289V11.56H37.6337ZM48.5674 17.1316C47.8801 17.1316 47.2659 17.1389 46.7248 17.1535C46.1837 17.1682 45.6207 17.1828 45.0358 17.1974V16.3419L45.7596 16.2761C46.3592 16.2323 46.776 16.086 47.0099 15.8374C47.2439 15.5888 47.3609 15.1574 47.3609 14.5432V11.56H49.7738V14.5432C49.7738 15.1574 49.8908 15.5888 50.1248 15.8374C50.3588 16.086 50.7755 16.2323 51.3751 16.2761L52.099 16.3419V17.1974C51.5287 17.1828 50.9656 17.1682 50.4099 17.1535C49.8689 17.1389 49.2547 17.1316 48.5674 17.1316ZM47.3609 11.56V2.96129C47.3609 2.33247 47.2439 1.89376 47.0099 1.64516C46.7906 1.38193 46.3592 1.22107 45.7158 1.16258L45.0358 1.09677V0.241289C45.3282 0.270536 45.5988 0.292471 45.8474 0.307095C46.096 0.307095 46.3592 0.307095 46.637 0.307095C47.2659 0.307095 47.8362 0.28516 48.348 0.241289C48.8745 0.182794 49.3497 0.102364 49.7738 -1.43605e-06V0.241289V11.56H47.3609ZM62.1574 11.56V8.59871C62.1574 7.88215 61.96 7.34839 61.5652 6.99742C61.1703 6.63183 60.5781 6.44903 59.7884 6.44903C59.2473 6.44903 58.7867 6.52946 58.4065 6.69032C58.0409 6.85118 57.8581 7.0486 57.8581 7.28258C57.8581 7.42882 57.9093 7.58236 58.0116 7.74322C58.114 7.90408 58.2164 8.07957 58.3187 8.26968C58.4211 8.45978 58.4723 8.66451 58.4723 8.88387C58.4723 9.17634 58.3553 9.41763 58.1213 9.60774C57.8873 9.78322 57.5802 9.87097 57.2 9.87097C56.7613 9.87097 56.4103 9.73935 56.1471 9.47613C55.8839 9.2129 55.7523 8.85462 55.7523 8.40129C55.7523 7.84559 55.9497 7.3557 56.3445 6.93161C56.754 6.50753 57.3097 6.17849 58.0116 5.94451C58.7136 5.69591 59.5179 5.57161 60.4245 5.57161C61.8869 5.57161 62.9398 5.90796 63.5832 6.58064C64.2267 7.23871 64.5484 8.29892 64.5484 9.76129V11.56H62.1574ZM58.5819 17.5045C57.5875 17.5045 56.7979 17.2486 56.2129 16.7368C55.628 16.2249 55.3355 15.5303 55.3355 14.6529C55.3355 13.9656 55.4964 13.4099 55.8181 12.9858C56.1544 12.5617 56.5785 12.2254 57.0903 11.9768C57.6168 11.7282 58.1652 11.5234 58.7355 11.3626C59.3204 11.1871 59.8688 11.0262 60.3807 10.88C60.9071 10.7338 61.3385 10.5583 61.6748 10.3535C62.0112 10.1342 62.1794 9.84172 62.1794 9.47613L62.2671 10.5729C62.1501 10.8508 61.9234 11.0774 61.5871 11.2529C61.2654 11.4284 60.8925 11.5966 60.4684 11.7574C60.0589 11.9183 59.6568 12.1011 59.2619 12.3058C58.8671 12.4959 58.5381 12.7518 58.2748 13.0735C58.0116 13.3953 57.88 13.8194 57.88 14.3458C57.88 14.8869 58.0336 15.311 58.3407 15.6181C58.6478 15.9252 59.0791 16.0787 59.6348 16.0787C60.1613 16.0787 60.6512 15.9398 61.1045 15.6619C61.5725 15.3841 61.9819 14.96 62.3329 14.3897L62.3548 15.311C61.8869 16.0568 61.3385 16.6125 60.7097 16.9781C60.0809 17.329 59.3716 17.5045 58.5819 17.5045ZM64.5484 15.3768C64.5484 15.7277 64.6069 15.9837 64.7239 16.1445C64.8409 16.2908 65.0164 16.3639 65.2503 16.3639C65.4843 16.3639 65.7183 16.3127 65.9523 16.2103C66.1862 16.0933 66.4202 15.9471 66.6542 15.7716L67.049 16.4735C66.6688 16.8099 66.2594 17.0658 65.8207 17.2413C65.3819 17.4168 64.8847 17.5045 64.329 17.5045C63.5979 17.5045 63.0495 17.3437 62.6839 17.0219C62.3329 16.6856 62.1574 16.1665 62.1574 15.4645V11.56H64.5484V15.3768ZM80.7157 17.1316C80.2916 17.1316 79.8602 17.1389 79.4215 17.1535C78.9828 17.1535 78.566 17.1609 78.1712 17.1755C77.791 17.1755 77.4693 17.1828 77.206 17.1974V16.3419L77.9518 16.2761C78.4344 16.2176 78.8 16.1372 79.0486 16.0348C79.2972 15.9325 79.4654 15.757 79.5531 15.5084C79.6555 15.2598 79.7067 14.9088 79.7067 14.4555V4.40903C79.7067 3.94107 79.6555 3.59011 79.5531 3.35613C79.4654 3.10753 79.2972 2.93204 79.0486 2.82968C78.8 2.71269 78.4344 2.63226 77.9518 2.58839L77.206 2.52258V1.6671C77.4693 1.6671 77.791 1.67441 78.1712 1.68903C78.566 1.70365 78.9828 1.71828 79.4215 1.7329C79.8602 1.7329 80.2916 1.7329 80.7157 1.7329H81.0009H84.708C85.7316 1.7329 86.609 1.72559 87.3402 1.71097C88.086 1.69634 88.7222 1.68172 89.2486 1.6671C89.2486 2.38365 89.2632 3.10753 89.2925 3.83871C89.3364 4.55527 89.3948 5.29376 89.468 6.05419H88.5905C88.3127 5.1329 87.991 4.42365 87.6254 3.92645C87.2744 3.41462 86.8211 3.06365 86.2654 2.87355C85.7097 2.68344 84.9931 2.58839 84.1157 2.58839H82.2512V14.4994C82.2512 14.9966 82.2951 15.3768 82.3828 15.64C82.4705 15.8886 82.6314 16.0568 82.8654 16.1445C83.114 16.2323 83.4723 16.2761 83.9402 16.2761H84.9493C85.6073 16.2761 86.1776 16.203 86.6602 16.0568C87.1428 15.9105 87.5596 15.6692 87.9105 15.3329C88.2615 14.9819 88.5759 14.514 88.8538 13.929C89.1462 13.3441 89.4168 12.6129 89.6654 11.7355H90.5428C90.4404 12.6568 90.36 13.5708 90.3015 14.4774C90.243 15.3841 90.2065 16.2908 90.1918 17.1974C89.5776 17.1682 88.8392 17.1535 87.9764 17.1535C87.1136 17.1389 86.0753 17.1316 84.8615 17.1316H81.0009H80.7157ZM81.4835 9.80516V8.97161H86.0241V9.80516H81.4835ZM86.4189 12.6348C86.3604 11.9768 86.2361 11.443 86.046 11.0335C85.8705 10.6095 85.6146 10.3024 85.2783 10.1123C84.9419 9.90753 84.5032 9.80516 83.9622 9.80516V8.97161C84.7372 8.97161 85.3075 8.73763 85.6731 8.26968C86.0387 7.80172 86.28 7.09247 86.397 6.14193H87.2525C87.194 6.97548 87.1647 7.62624 87.1647 8.09419C87.1647 8.54753 87.1647 8.97892 87.1647 9.38839C87.1647 9.68086 87.1647 9.98064 87.1647 10.2877C87.1647 10.5802 87.1721 10.9166 87.1867 11.2968C87.2159 11.6624 87.2452 12.1084 87.2744 12.6348H86.4189ZM98.8939 17.3948L95.3403 8.51097C95.1795 8.1015 95.0259 7.7871 94.8797 7.56774C94.7481 7.33376 94.5872 7.16559 94.3971 7.06322C94.207 6.94624 93.9438 6.87312 93.6074 6.84387L93.0152 6.77806V5.92258C93.3369 5.9372 93.7244 5.95183 94.1778 5.96645C94.6457 5.98107 95.1064 5.98839 95.5597 5.98839H95.6036H95.7132C96.1812 5.98839 96.6565 5.98839 97.139 5.98839C97.6216 5.98839 98.0676 5.98839 98.4771 5.98839C98.9012 5.97376 99.2449 5.95914 99.5081 5.94451V6.8L98.9597 6.84387C98.3747 6.91699 98.0018 7.07785 97.841 7.32645C97.6947 7.57505 97.7459 8.04301 97.9945 8.73032L100.166 14.3239L99.859 14.4555L103.04 5.85677L103.764 6.4271L99.6836 17.3948H98.8939ZM106.045 17.3948L102.601 8.81806L103.04 5.85677H103.917L107.339 14.3897L106.9 14.7845L108.392 10.4632C108.86 9.20559 108.999 8.30624 108.809 7.76516C108.619 7.22408 108.18 6.90236 107.493 6.8L107.164 6.75613L107.185 5.92258C107.624 5.9372 108.078 5.95183 108.545 5.96645C109.028 5.98107 109.481 5.98839 109.905 5.98839C110.388 6.00301 110.841 6.00301 111.265 5.98839C111.69 5.97376 112.084 5.95914 112.45 5.94451L112.428 6.77806L112.077 6.84387C111.682 6.90236 111.346 7.04129 111.068 7.26064C110.79 7.46538 110.527 7.80172 110.278 8.26968C110.03 8.72301 109.745 9.37376 109.423 10.2219L106.856 17.3948H106.045ZM122.104 11.56V8.59871C122.104 7.88215 121.906 7.34839 121.511 6.99742C121.117 6.63183 120.524 6.44903 119.735 6.44903C119.194 6.44903 118.733 6.52946 118.353 6.69032C117.987 6.85118 117.804 7.0486 117.804 7.28258C117.804 7.42882 117.856 7.58236 117.958 7.74322C118.06 7.90408 118.163 8.07957 118.265 8.26968C118.367 8.45978 118.419 8.66451 118.419 8.88387C118.419 9.17634 118.302 9.41763 118.068 9.60774C117.834 9.78322 117.526 9.87097 117.146 9.87097C116.708 9.87097 116.357 9.73935 116.093 9.47613C115.83 9.2129 115.699 8.85462 115.699 8.40129C115.699 7.84559 115.896 7.3557 116.291 6.93161C116.7 6.50753 117.256 6.17849 117.958 5.94451C118.66 5.69591 119.464 5.57161 120.371 5.57161C121.833 5.57161 122.886 5.90796 123.529 6.58064C124.173 7.23871 124.495 8.29892 124.495 9.76129V11.56H122.104ZM118.528 17.5045C117.534 17.5045 116.744 17.2486 116.159 16.7368C115.574 16.2249 115.282 15.5303 115.282 14.6529C115.282 13.9656 115.443 13.4099 115.764 12.9858C116.101 12.5617 116.525 12.2254 117.037 11.9768C117.563 11.7282 118.111 11.5234 118.682 11.3626C119.267 11.1871 119.815 11.0262 120.327 10.88C120.853 10.7338 121.285 10.5583 121.621 10.3535C121.957 10.1342 122.126 9.84172 122.126 9.47613L122.213 10.5729C122.096 10.8508 121.87 11.0774 121.533 11.2529C121.212 11.4284 120.839 11.5966 120.415 11.7574C120.005 11.9183 119.603 12.1011 119.208 12.3058C118.813 12.4959 118.484 12.7518 118.221 13.0735C117.958 13.3953 117.826 13.8194 117.826 14.3458C117.826 14.8869 117.98 15.311 118.287 15.6181C118.594 15.9252 119.025 16.0787 119.581 16.0787C120.108 16.0787 120.597 15.9398 121.051 15.6619C121.519 15.3841 121.928 14.96 122.279 14.3897L122.301 15.311C121.833 16.0568 121.285 16.6125 120.656 16.9781C120.027 17.329 119.318 17.5045 118.528 17.5045ZM124.495 15.3768C124.495 15.7277 124.553 15.9837 124.67 16.1445C124.787 16.2908 124.963 16.3639 125.197 16.3639C125.431 16.3639 125.665 16.3127 125.899 16.2103C126.133 16.0933 126.366 15.9471 126.6 15.7716L126.995 16.4735C126.615 16.8099 126.206 17.0658 125.767 17.2413C125.328 17.4168 124.831 17.5045 124.275 17.5045C123.544 17.5045 122.996 17.3437 122.63 17.0219C122.279 16.6856 122.104 16.1665 122.104 15.4645V11.56H124.495V15.3768Z" fill="#4B4035"/>
                    </svg>`
                }
                </div>
                <span class="review-card__source-name">${review.source.toUpperCase()}</span>
              </div>

              <div class="review-card__stars">
                ${renderStars(review.rating)}
              </div>
            </div>

            <blockquote class="review-card__quote">
              „${review.quote}"
            </blockquote>
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
