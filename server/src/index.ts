import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import "dotenv/config";
import helmet from "helmet";

import { startCron } from "./cron.js";
import reviewsRouter from "./routes/reviews.js";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";

import logger from "./logger.js";

import { fileURLToPath } from "url";
import { db } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In production the compiled file lives at server/dist/server/src/index.js,
// so __dirname is 4 levels deep. CLIENT_DIR overrides this for production.
const CLIENT_DIR =
  process.env.CLIENT_DIR ?? path.join(__dirname, "../../client");

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(cookieParser());

app.set("trust proxy", 1);

app.use(helmet());

app.use(express.static(CLIENT_DIR));

app.get("/admin", (req, res) => {
  const token = req.cookies?.token;

  if (!token) {
    res.redirect("/login");
    return;
  }

  res.sendFile(path.join(CLIENT_DIR, "admin/index.html"));
});

app.use("/api/add-review", reviewsRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

startCron();

const server = app.listen(PORT, () => {
  logger.info(`[server] Server started at port: ${PORT}`);
});

process.on("SIGTERM", () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
