// src/app.ts
import express, { Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import pino from "pino";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/errors";

/**
 * Parse comma-separated env var to a clean string[].
 */
function parseList(v?: string): string[] {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildApp() {
  const app = express();

  // If behind a proxy (nginx/ELB) this helps rate-limit & IPs
  app.set("trust proxy", 1);

  // Logger
  const logger = pino({ level: env.LOG_LEVEL || "info" });
  app.use(pinoHttp({ logger }));

  // Security
  app.use(helmet());

  // --- CORS config ----------------------------------------------------
  // 1) Static allow-list from env (comma separated)
  const allowedOrigins = parseList(env.ALLOWED_ORIGINS);

  // 2) Optional host regexes (e.g., allow any *.modal.host)
  const allowHostRegexes = [
    /\.modal\.host$/i, // e.g. https://...modal.host
  ];

  const corsOptions: CorsOptions = {
    origin: (origin, cb) => {
      // no Origin = non-browser or same-origin; allow it
      if (!origin) return cb(null, true);

      try {
        const url = new URL(origin);
        const host = url.host;

        // Exact match list
        if (allowedOrigins.includes(origin)) return cb(null, true);

        // Regex host matches
        if (allowHostRegexes.some((re) => re.test(host))) return cb(null, true);

        return cb(new Error(`Not allowed by CORS: ${origin}`));
      } catch {
        // If origin isn't a valid URL, be strict and block
        return cb(new Error(`Invalid Origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "X-User-Role",
      "X-Workspace-Id",
    ],
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  // Ensure preflights are handled for all routes
  app.options(/.*/, cors(corsOptions));
  // --------------------------------------------------------------------

  // Body/cookies
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

  // API
  app.use("/api", apiRouter);

  // 404
  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  // Errors (keep last)
  app.use(errorHandler);

  return app;
}
