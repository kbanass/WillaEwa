import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import "dotenv/config";
import helmet from "helmet";

import { startCron } from "./cron.js";
import reviewsRouter from "./routes/reviews.js";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import inquiryRouter from "./routes/inquiry.js";
import staticFilesRouter from "./routes/static.js";

import logger from "./logger.js";

import { fileURLToPath } from "url";
import { db } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(cookieParser());

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "frame-src": ["https://cloud.umami.is"],
      },
    },
  }),
);

app.use("/api/add-review", reviewsRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/inquiry", inquiryRouter);
app.use("/", staticFilesRouter);

app.get("/api/health", (_, res) =>
  res.json({ status: "ok", uptime: process.uptime() }),
);

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
