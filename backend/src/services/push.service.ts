/**
 * FCM push delivery via firebase-admin. Initialized lazily from
 * FIREBASE_SERVICE_ACCOUNT_JSON; every send silently no-ops when
 * PUSH_ENABLED=false or credentials are missing, so the rest of the
 * system (scheduler, daily reset, inbox notifications) runs unchanged
 * without a Firebase project.
 */
import { config } from "../config.js";
import { db } from "../db/supabase.js";
import type { PushDeviceRow, PushPlatform } from "../db/tables.js";
import type { NotificationAction } from "../engine/content/notification-templates.js";

// firebase-admin is imported dynamically so the (heavy) SDK never loads
// when push is disabled — keeps cold starts and tests fast.
type Messaging = import("firebase-admin/messaging").Messaging;
let messagingPromise: Promise<Messaging | null> | null = null;

function getMessaging(): Promise<Messaging | null> {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      if (!config.PUSH_ENABLED || !config.FIREBASE_SERVICE_ACCOUNT_JSON) return null;
      try {
        const { initializeApp, cert, getApps } = await import("firebase-admin/app");
        const { getMessaging } = await import("firebase-admin/messaging");
        const app =
          getApps()[0] ??
          initializeApp({ credential: cert(JSON.parse(config.FIREBASE_SERVICE_ACCOUNT_JSON)) });
        return getMessaging(app);
      } catch (e) {
        console.error("push: firebase-admin init failed, push disabled", e);
        return null;
      }
    })();
  }
  return messagingPromise;
}

export interface PushMessage {
  title: string;
  body: string;
  /** Client navigation target, delivered as data.deeplink */
  deeplink?: string;
  /** Inbox notification id for click tracking */
  notificationId?: string;
  /** scheduled_notifications id for click tracking */
  scheduledId?: string;
  /** Action buttons (web SW renders these; Android renders from data) */
  actions?: readonly NotificationAction[];
  /** Collapse key so a newer push replaces an older one */
  tag?: string;
  data?: Record<string, string>;
}

async function devicesFor(userId: string, platforms?: PushPlatform[]): Promise<PushDeviceRow[]> {
  let q = db.from("push_devices").select("*").eq("user_id", userId);
  if (platforms && platforms.length > 0) q = q.in("platform", platforms);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as PushDeviceRow[];
}

async function pruneToken(token: string) {
  await db.from("push_devices").delete().eq("fcm_token", token);
}

async function logEvent(
  userId: string,
  device: PushDeviceRow,
  event: "SENT" | "FAILED",
  msg: PushMessage,
  error?: string,
) {
  const { error: insErr } = await db.from("notification_events").insert({
    user_id: userId,
    notification_id: msg.notificationId ?? null,
    scheduled_id: msg.scheduledId ?? null,
    event,
    platform: device.platform,
    device_id: device.device_id,
    meta: error ? { error } : {},
  });
  if (insErr) console.error("push: failed to log notification_event", insErr.message);
}

/**
 * Display push to every registered device of a user (notification + data
 * hybrid: data carries deeplink/ids/actions so clicks can be tracked and
 * routed). Returns the number of devices successfully reached.
 */
export async function sendToUser(
  userId: string,
  msg: PushMessage,
  opts?: { platforms?: PushPlatform[] },
): Promise<number> {
  const messaging = await getMessaging();
  if (!messaging) return 0;
  const devices = await devicesFor(userId, opts?.platforms);
  if (devices.length === 0) return 0;

  const data: Record<string, string> = {
    ...(msg.data ?? {}),
    ...(msg.deeplink ? { deeplink: msg.deeplink } : {}),
    ...(msg.notificationId ? { notificationId: msg.notificationId } : {}),
    ...(msg.scheduledId ? { scheduledId: msg.scheduledId } : {}),
    ...(msg.actions ? { actions: JSON.stringify(msg.actions) } : {}),
    title: msg.title,
    body: msg.body,
  };

  const res = await messaging.sendEachForMulticast({
    tokens: devices.map((d) => d.fcm_token),
    notification: { title: msg.title, body: msg.body },
    data,
    android: {
      priority: "high",
      ...(msg.tag ? { collapseKey: msg.tag } : {}),
      notification: { channelId: "arise_general", ...(msg.tag ? { tag: msg.tag } : {}) },
    },
    webpush: {
      headers: { Urgency: "high", ...(msg.tag ? { Topic: msg.tag } : {}) },
    },
  });

  let sent = 0;
  await Promise.all(
    res.responses.map(async (r, i) => {
      const device = devices[i];
      if (!device) return;
      if (r.success) {
        sent += 1;
        await logEvent(userId, device, "SENT", msg);
      } else {
        const code = r.error?.code ?? "unknown";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          await pruneToken(device.fcm_token);
        }
        await logEvent(userId, device, "FAILED", msg, code);
      }
    }),
  );
  return sent;
}

/**
 * Data-ONLY high-priority message (no notification payload) — used for
 * silent device resync signals; Android's background handler runs without
 * showing anything to the user.
 */
export async function sendDataToUser(userId: string, data: Record<string, string>): Promise<number> {
  const messaging = await getMessaging();
  if (!messaging) return 0;
  const devices = await devicesFor(userId);
  if (devices.length === 0) return 0;
  const res = await messaging.sendEachForMulticast({
    tokens: devices.map((d) => d.fcm_token),
    data,
    android: { priority: "high" },
    webpush: { headers: { Urgency: "high" } },
  });
  await Promise.all(
    res.responses.map(async (r, i) => {
      const device = devices[i];
      if (!r.success && device) {
        const code = r.error?.code ?? "";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          await pruneToken(device.fcm_token);
        }
      }
    }),
  );
  return res.successCount;
}

/** Test seam: reset the lazy messaging singleton. */
export function _resetPushForTests() {
  messagingPromise = null;
}
