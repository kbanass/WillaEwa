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
  fullUrl: string | null;
  visibility: HeroVisibility;
};

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
    const fullUrl: string | null =
      origWidth > 1200
        ? urlFor(img.image)
            .width(Math.min(origWidth, 4500))
            .quality(80)
            .auto("format")
            .url()
        : null;
    const visibility: HeroVisibility =
      img.mobileOnly && !img.desktopOnly
        ? "mobile"
        : img.desktopOnly && !img.mobileOnly
          ? "desktop"
          : "all";
    return [
      { key: img._key, lqip: img.lqip ?? "", smallUrl, midUrl, fullUrl, visibility },
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
