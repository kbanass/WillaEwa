import { urlFor } from "./sanity";
import type { HeroImagesQueryResult } from "../sanity.types";

// Must match the 780px breakpoint in Hero.astro's <style>.
export const HERO_MOBILE_MEDIA = "(max-width: 779.98px)";
export const HERO_DESKTOP_MEDIA = "(min-width: 780px)";

export type HeroVisibility = "all" | "mobile" | "desktop";

export type HeroSlide = {
  key: string;
  lqip: string;
  smallUrl: string;
  midUrl: string;
  /** Sizes above the 1200 px mid image, as a srcset; null for small originals. */
  fullSrcset: string | null;
  /** width / height of the original, to size the image for object-fit: cover */
  aspect: number;
  visibility: HeroVisibility;
};

// Full-resolution candidates; the browser picks the one that fits the screen.
const FULL_WIDTHS = [1600, 2400, 3200, 4500];

export function buildHeroSlides(hero: HeroImagesQueryResult): HeroSlide[] {
  return (hero?.images ?? []).flatMap((img): HeroSlide[] => {
    if (!img.image) return [];
    const origWidth: number = img.width ?? 1920;
    const smallUrl: string = urlFor(img.image)
      .width(800)
      .quality(75)
      .auto("format")
      .url();
    const midUrl: string = urlFor(img.image)
      .width(1200)
      .quality(75)
      .auto("format")
      .url();
    const fullWidths = [
      ...FULL_WIDTHS.filter((w) => w < origWidth),
      Math.min(origWidth, FULL_WIDTHS.at(-1)!),
    ].filter((w, i, all) => w > 1200 && all.indexOf(w) === i);
    const fullSrcset: string | null = fullWidths.length
      ? fullWidths
          .map(
            (w) =>
              `${urlFor(img.image!).width(w).quality(80).auto("format").url()} ${w}w`,
          )
          .join(", ")
      : null;
    const visibility: HeroVisibility =
      img.mobileOnly && !img.desktopOnly
        ? "mobile"
        : img.desktopOnly && !img.mobileOnly
          ? "desktop"
          : "all";
    return [
      {
        key: img._key,
        lqip: img.lqip ?? "",
        smallUrl,
        midUrl,
        fullSrcset,
        aspect: origWidth / (img.height ?? origWidth / 1.5),
        visibility,
      },
    ];
  });
}

export function heroSrcset(slide: HeroSlide): string {
  return `${slide.smallUrl} 800w, ${slide.midUrl} 1200w`;
}

// Index of the slide shown first on each device (-1 when none is visible there).
export function firstHeroSlides(slides: HeroSlide[]): {
  mobile: number;
  desktop: number;
} {
  return {
    mobile: slides.findIndex((s) => s.visibility !== "desktop"),
    desktop: slides.findIndex((s) => s.visibility !== "mobile"),
  };
}
