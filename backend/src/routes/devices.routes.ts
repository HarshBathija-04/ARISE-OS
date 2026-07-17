import { Router } from "express";
import { z } from "zod";
import { db } from "../db/supabase.js";

export const devicesRoutes = Router();

const registerSchema = z.object({
  platform: z.enum(["ANDROID", "WEB"]),
  fcmToken: z.string().min(1).max(4096),
  deviceId: z.string().min(1).max(128),
  deviceName: z.string().max(200).optional(),
  appVersion: z.string().max(50).optional(),
});

// Register (or refresh) a device's FCM token. Upserts on (user_id, device_id)
// so token rotation updates in place; also steals a token from another row if
// FCM handed it to a reinstalled device.
devicesRoutes.post("/", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    // A token is globally unique — drop any stale row holding it first.
    await db
      .from("push_devices")
      .delete()
      .eq("fcm_token", input.fcmToken)
      .neq("device_id", input.deviceId);
    const { error } = await db.from("push_devices").upsert(
      {
        user_id: req.userId,
        platform: input.platform,
        fcm_token: input.fcmToken,
        device_id: input.deviceId,
        device_name: input.deviceName ?? "",
        app_version: input.appVersion ?? "",
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,device_id" },
    );
    if (error) throw new Error(error.message);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

devicesRoutes.delete("/:deviceId", async (req, res, next) => {
  try {
    const { error } = await db
      .from("push_devices")
      .delete()
      .eq("user_id", req.userId)
      .eq("device_id", req.params.deviceId);
    if (error) throw new Error(error.message);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
