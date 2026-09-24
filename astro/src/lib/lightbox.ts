import PhotoSwipe from "photoswipe";
import { downloadImage } from "./download";

export interface LightboxItem {
  src: string;
  width: number;
  height: number;
  alt?: string;
  /** Low-quality placeholder shown while `src` loads. */
  msrc?: string;
  /** Larger version, loaded once the user zooms in. */
  zoomSrc?: string;
  caption?: string;
  captionUrl?: string;
}

const DOWNLOAD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><path d="M7 11l5 5l5 -5"/><path d="M12 4l0 12"/></svg>`;

// Sanity CDN images go through our proxy (cross-origin fetch + download
// filename); files served by the site itself are downloaded directly.
function downloadUrl(src: string): string {
  return src.startsWith("/")
    ? src
    : `/api/download-image?url=${encodeURIComponent(src)}`;
}

function downloadName(prefix: string, src: string): string {
  const ext = src.startsWith("/") ? (src.split(".").pop() ?? "jpg") : "jpg";
  return `${prefix}-${Date.now()}.${ext}`;
}

interface LightboxOptions {
  downloadTitle?: string;
  /** Downloaded file name before the timestamp and extension. */
  fileName?: string;
}

let pswp: PhotoSwipe | null = null;

/** Opens the full-screen viewer at `index`, with a download button. */
export function openLightbox(
  items: LightboxItem[],
  index = 0,
  {
    downloadTitle = "Pobierz zdjęcie",
    fileName = "willa-ewa",
  }: LightboxOptions = {},
): void {
  pswp?.destroy();
  const current = new PhotoSwipe({
    dataSource: items,
    index,
    bgOpacity: 1,
    wheelToZoom: true,
    zoom: true,
    close: true,
    counter: true,
    arrowKeys: true,
    preload: [1, 1],
    // top must clear the 60px button bar, or wide/landscape images end
    // up rendered underneath it (buttons overlapping the photo).
    padding: { top: 76, bottom: 16, left: 16, right: 16 },
    imageClickAction: "zoom",
    tapAction: "zoom",
    bgClickAction: "close",
    clickToCloseNonZoomable: false,
    secondaryZoomLevel: (zl) => Math.max(zl.fit * 2, zl.fill),
    maxZoomLevel: (zl) => Math.max(zl.fit * 4, 4),
  });
  pswp = current;
  const currentItem = () => items[current.currIndex];

  current.on("uiRegister", () => {
    current.ui!.registerElement({
      name: "download-button",
      order: 8,
      isButton: true,
      appendTo: "bar",
      html: DOWNLOAD_ICON,
      title: downloadTitle,
      onClick: (_event, buttonEl) => {
        const item = currentItem();
        if (item) {
          downloadImage(
            downloadUrl(item.src),
            downloadName(fileName, item.src),
            buttonEl,
          );
        }
      },
    });

    if (!items.some((item) => item.caption)) return;
    // Caption positioned via CSS (bottom-anchored, see photoswipe.css)
    // rather than measured against the image — the pattern from the
    // PhotoSwipe docs (https://photoswipe.com/caption/), independent of
    // the image's layout timing.
    current.ui!.registerElement({
      name: "gallery-caption",
      order: 9,
      isButton: false,
      appendTo: "root",
      onInit(el) {
        current.on("change", () => {
          const item = currentItem();
          if (!item?.caption) {
            el.style.display = "none";
            return;
          }
          el.innerHTML = item.captionUrl
            ? `<a href="${item.captionUrl}" target="_blank" rel="noopener noreferrer">${item.caption}</a>`
            : item.caption;
          el.style.display = "";
          // Restart the reveal animation on every slide change.
          el.style.animation = "none";
          void el.offsetWidth;
          el.style.animation = "pswp-caption-reveal 0.6s ease forwards";
        });
      },
    });
  });

  // Swap in the larger image the first time a slide is zoomed in.
  const zoomLoaded = new Set<number>();
  current.on("zoomPanUpdate", ({ slide }) => {
    const item = items[slide.index];
    if (!item?.zoomSrc || zoomLoaded.has(slide.index)) return;
    const initialZoom = slide.zoomLevels?.initial ?? 1;
    if (slide.currZoomLevel <= initialZoom * 1.2) return;
    zoomLoaded.add(slide.index);
    const hi = new Image();
    hi.onload = () => {
      const imgEl = slide.content.element as HTMLImageElement | null;
      if (imgEl?.tagName === "IMG" && imgEl.src !== item.zoomSrc)
        imgEl.src = item.zoomSrc!;
    };
    hi.src = item.zoomSrc;
  });

  current.on("destroy", () => {
    if (pswp === current) pswp = null;
  });
  current.init();
}
