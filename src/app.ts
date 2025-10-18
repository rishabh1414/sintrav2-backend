// src/app.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import pino from "pino";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/errors";

function normalizeCorsOrigin(value?: string) {
  if (!value || value === "*" || value === "true") return true;
  if (value.includes(",")) {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return value;
}

export function buildApp() {
  const app = express();

  // behind proxy (nginx/elb) to make rate-limit & IPs accurate
  app.set("trust proxy", 1);

  // Logging
  const logger = pino({ level: env.LOG_LEVEL });
  app.use(pinoHttp({ logger }));

  // Security & basics
  app.use(helmet());
  app.use(
    cors({
      origin: normalizeCorsOrigin(env.CORS_ORIGIN),
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Rate limit
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Health
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ ok: true, env: env.NODE_ENV });
  });

  // API (mount all sub-routers)
  app.use("/api", apiRouter);

  // 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  // Central error handler (keep last)
  app.use(errorHandler);

  return app;
}
