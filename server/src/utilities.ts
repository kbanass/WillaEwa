export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
export function getInitials(author: string): string {
  return author
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toLowerCase();
}
