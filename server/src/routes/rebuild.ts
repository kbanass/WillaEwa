import { Router } from "express";
import type { Request, Response } from "express";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import logger from "../logger.js";

const router = Router();

const rebuildLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: { error: "Zbyt wiele rebuil­dów. Poczekaj 5 minut." },
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Serwer jest w server/dist/server/src/routes/, projekt jest 5 poziomów wyżej
const PROJECT_ROOT = path.resolve(__dirname, "../../../../../");
const ASTRO_DIR = path.join(PROJECT_ROOT, "astro");

let isBuilding = false;

function triggerRebuild(): void {
  if (isBuilding) {
    logger.info("[rebuild] Build already in progress, skipping");
    return;
  }
  isBuilding = true;
  logger.info("[rebuild] Starting Astro build...");

  execFile("npm", ["run", "build"], { cwd: ASTRO_DIR, timeout: 120_000, shell: true }, (err, stdout, stderr) => {
    isBuilding = false;
    if (err) {
      logger.error(`[rebuild] Build failed: ${err.message}`);
      if (stderr) logger.error(`[rebuild] stderr: ${stderr.slice(0, 500)}`);
      return;
    }
    logger.info("[rebuild] Build completed successfully");
  });
}

router.post("/", rebuildLimiter, (req: Request, res: Response) => {
  const secret = process.env.REBUILD_SECRET;

  if (secret) {
    const provided = req.headers["x-rebuild-secret"];
    if (provided !== secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  res.status(202).json({ message: "Rebuild started" });
  triggerRebuild();
});

export { triggerRebuild };
export default router;
