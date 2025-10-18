import { z } from "zod";
import * as dotenv from "dotenv";
dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET (>=16 chars) is required"),

  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),

  // optional stuff
  CORS_ORIGIN: z.string().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = parsed.data;
