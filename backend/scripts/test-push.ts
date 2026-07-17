/**
 * One-off: send a test FCM push to the most recently seen device's user.
 * Usage: npx tsx --env-file=.env scripts/test-push.ts
 */
import { sendToUser } from "../src/services/push.service.js";
import { db } from "../src/db/supabase.js";

async function main() {
  const { data, error } = await db
    .from("push_devices")
    .select("user_id, platform, device_name")
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .single();
  if (error || !data) throw new Error(error?.message ?? "no devices registered");
  console.log(`sending to user ${data.user_id.slice(0, 8)}… (${data.platform} ${data.device_name})`);
  const sent = await sendToUser(data.user_id, {
    title: "🎯 Arise OS — Push Test",
    body: "FCM delivery works. The System is watching.",
    deeplink: "/dashboard",
    tag: "push-test",
  });
  console.log("devices reached:", sent);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FAILED:", e.message);
    process.exit(1);
  });
