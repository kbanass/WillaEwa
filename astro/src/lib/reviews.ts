// Shared by the public reviews section (Reviews.astro, rendered at build
// time) and the admin panel (panel.astro, rendered in the browser from
// HTML strings) — both show the same review card.

export type ReviewSource = "google" | "page";
export type ReviewStatus = "pending" | "accepted" | "deleted";

/** Quotes longer than this are collapsed behind "Czytaj więcej". */
export const LONG_QUOTE_LENGTH = 450;

export function getInitials(author: string): string {
  return author
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toLowerCase();
}

/** Review times are Unix timestamps in seconds. */
export function formatReviewDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Five stars for a 0–5 rating, rounded down to the nearest half. */
export function starsHtml(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    '<div class="star star--filled"></div>'.repeat(full) +
    (half ? '<div class="star star--half"></div>' : "") +
    '<div class="star"></div>'.repeat(empty)
  );
}

export const SOURCE_LABEL: Record<ReviewSource, string> = {
  google: "Google",
  page: "Strona",
};

export const SOURCE_ICON: Record<ReviewSource, string> = {
  google: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 2a9.96 9.96 0 0 1 6.29 2.226a1 1 0 0 1 .04 1.52l-1.51 1.362a1 1 0 0 1 -1.265 .06a6 6 0 1 0 2.103 6.836l.001 -.004h-3.66a1 1 0 0 1 -.992 -.883l-.007 -.117v-2a1 1 0 0 1 1 -1h6.945a1 1 0 0 1 .994 .89c.04 .367 .061 .737 .061 1.11c0 5.523 -4.477 10 -10 10s-10 -4.477 -10 -10s4.477 -10 10 -10z"/></svg>`,
  page: `<img src="/favicon/favicon.svg" width="24" height="24" alt="Willa Ewa" />`,
};

const icon = (paths: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/>${paths}</svg>`;

export const STATUS_ICON: Record<ReviewStatus | "all", string> = {
  pending: icon(
    '<path d="M8 8a3.5 3 0 0 1 3.5 -3h1a3.5 3 0 0 1 3.5 3a3 3 0 0 1 -2 3a3 4 0 0 0 -2 4"/><path d="M12 19l0 .01"/>',
  ),
  accepted: icon(
    '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M9 12l2 2l4 -4"/>',
  ),
  deleted: icon(
    '<path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/>',
  ),
  all: icon(
    '<path d="M4 3h16"/><path d="M4 9h16"/><path d="M4 15h16"/><path d="M4 21h16"/>',
  ),
};
