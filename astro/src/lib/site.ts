// Business details used across the site. Phone numbers here are fallbacks —
// the ones edited in Sanity (siteSettings) take precedence.
export const SITE = {
  name: "Willa Ewa",
  url: "https://willaewanadmorzem.pl",
  ogImage: "https://willaewanadmorzem.pl/favicon/og-image.png",
  phone: "+48 508 273 502",
  phone2: "+48 511 611 064",
  address: {
    street: "ul. Szałwiowa 1",
    postalCode: "82-120",
    city: "Krynica Morska",
  },
  geo: { latitude: 54.371607, longitude: 19.4174926 },
  googleMapsUrl: "https://www.google.com/maps?cid=16206240161214872810",
} as const;

export function telHref(phone: string): string {
  return `tel:${phone.replace(/\s/g, "")}`;
}
