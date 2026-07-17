import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  CRON_ENABLED: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  INTERNAL_CRON_SECRET: z.string().default(""),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  PUSH_ENABLED: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  // Service-account JSON (stringified) for firebase-admin. Push silently
  // no-ops when absent so the system runs without Firebase credentials.
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().default(""),
  // Public URL of the deployed backend (e.g. https://arise-os.onrender.com).
  // Used by the health-ping cron to keep the service alive.
  BACKEND_URL: z.string().default(""),
});

export const config = envSchema.parse(process.env);

export const corsOrigins = config.CORS_ORIGINS.split(",").map((s) => s.trim());
