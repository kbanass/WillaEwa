function isDesktopDevice(): boolean {
  return !("ontouchstart" in window) && navigator.maxTouchPoints === 0;
}

function triggerAnchorDownload(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Fetches the image, then either hands it to the native share sheet (mobile —
 * this is what lets iOS Safari save straight to Photos instead of Files) or
 * triggers a direct download (always the case on desktop).
 */
export async function downloadImage(
  fetchUrl: string,
  filename: string,
  buttonEl: HTMLElement,
): Promise<void> {
  if (buttonEl.classList.contains("is-loading")) return;
  buttonEl.classList.add("is-loading");
  try {
    const response = await fetch(fetchUrl);
    const blob = await response.blob();
    const file = new File([blob], filename, {
      type: blob.type || "image/jpeg",
    });

    if (!isDesktopDevice() && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    const objectUrl = URL.createObjectURL(blob);
    triggerAnchorDownload(objectUrl, filename);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  } catch {
    triggerAnchorDownload(fetchUrl, filename);
  } finally {
    buttonEl.classList.remove("is-loading");
  }
}
