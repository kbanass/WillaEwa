import { Router } from "express";
import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";

const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Zbyt wiele pobrań. Spróbuj za chwilę." },
});

// Only proxy images from our Sanity project — prevents SSRF to arbitrary hosts.
const ALLOWED_PREFIX = "https://cdn.sanity.io/images/csed1mdo/";

router.get("/", limiter, async (req: Request, res: Response) => {
  const url = req.query.url as string | undefined;

  if (!url || !url.startsWith(ALLOWED_PREFIX)) {
    res.status(400).json({ error: "Niedozwolony adres URL" });
    return;
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      res.status(502).json({ error: "Nie udało się pobrać obrazu" });
      return;
    }

    const contentType =
      upstream.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("webp")
      ? "webp"
      : contentType.includes("png")
        ? "png"
        : "jpg";

    res.setHeader("Content-Disposition", `attachment; filename="willa-ewa.${ext}"`);
    res.setHeader("Content-Type", contentType);

    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch {
    res.status(500).json({ error: "Błąd serwera podczas pobierania obrazu" });
  }
});

export default router;
