import express from "express";
import { corsOrigins } from "./config.js";
import { requireUser } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

import { accountRoutes } from "./routes/account.routes.js";
import { dashboardRoutes } from "./routes/dashboard.routes.js";
import { profileRoutes } from "./routes/profile.routes.js";
import { questsRoutes } from "./routes/quests.routes.js";
import { focusRoutes } from "./routes/focus.routes.js";
import { timetableRoutes } from "./routes/timetable.routes.js";
import { habitsRoutes } from "./routes/habits.routes.js";
import { streaksRoutes } from "./routes/streaks.routes.js";
import { rewardsRoutes } from "./routes/rewards.routes.js";
import { bossesRoutes } from "./routes/bosses.routes.js";
import { miscRoutes } from "./routes/misc.routes.js";
import { analyticsRoutes } from "./routes/analytics.routes.js";
import { internalRoutes } from "./routes/internal.routes.js";
import { devicesRoutes } from "./routes/devices.routes.js";
import { alarmsRoutes } from "./routes/alarms.routes.js";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // CORS — the web app calls this API server-side AND the browser subscribes
  // to Supabase directly, but keep permissive-enough CORS for client fetches.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (corsOrigins.includes(origin) || corsOrigins.includes("*"))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Internal (cron trigger) — secret-header auth, not user auth.
  app.use("/v1/internal", internalRoutes);

  // Everything else requires a Supabase Auth bearer token.
  const v1 = express.Router();
  v1.use(requireUser);
  v1.use("/account", accountRoutes);
  v1.use("/dashboard", dashboardRoutes);
  v1.use("/", profileRoutes); // /profile, /attributes, /settings
  v1.use("/", questsRoutes); // /quests, /main-quests
  v1.use("/focus", focusRoutes);
  v1.use("/timetable", timetableRoutes);
  v1.use("/", habitsRoutes); // /habits, /urges, /recovery
  v1.use("/streaks", streaksRoutes);
  v1.use("/rewards", rewardsRoutes);
  v1.use("/bosses", bossesRoutes);
  v1.use("/", miscRoutes); // /achievements, /titles, /skills, /notifications, /activity
  v1.use("/analytics", analyticsRoutes);
  v1.use("/devices", devicesRoutes);
  v1.use("/alarms", alarmsRoutes);
  app.use("/v1", v1);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
