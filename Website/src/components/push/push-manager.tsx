"use client";

/**
 * Client-side push orchestration, mounted once in the (app) layout:
 *  - if push was previously enabled (localStorage flag) and permission is
 *    granted, silently refresh the FCM token registration on load
 *  - surface foreground messages as an in-app toast (the SW only handles
 *    background pushes)
 *  - log OPENED / ACTION analytics when a notification click lands the user
 *    here with ?nid= / ?naction= params (the SW can't call the API itself)
 *
 * Permission is NEVER requested on page load — only from the settings
 * toggle, via the exported enableWebPush().
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import {
  getDeviceId,
  obtainPushToken,
  onForegroundMessage,
  pushConfigured,
  pushSupported,
} from "@/lib/push/firebase-client";
import {
  logNotificationEventAction,
  registerDeviceAction,
  skipRemainingQuestsAction,
} from "@/app/actions";

const ENABLED_KEY = "arise-push-enabled";

/** Settings-toggle entry point: request permission + register the device. */
export async function enableWebPush(): Promise<"granted" | "denied" | "unsupported"> {
  if (!pushSupported() || !pushConfigured()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const token = await obtainPushToken();
  if (!token) return "unsupported";
  await registerDeviceAction({
    fcmToken: token,
    deviceId: getDeviceId(),
    deviceName: navigator.userAgent.slice(0, 180),
  });
  localStorage.setItem(ENABLED_KEY, "true");
  return "granted";
}

export function disableWebPush() {
  localStorage.setItem(ENABLED_KEY, "false");
}

interface Toast {
  title: string;
  body: string;
  deeplink?: string;
}

export function PushManager() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<Toast | null>(null);
  const trackedClick = useRef(false);

  // Silent token refresh for already-enabled browsers.
  useEffect(() => {
    if (!pushSupported() || !pushConfigured()) return;
    if (localStorage.getItem(ENABLED_KEY) !== "true") return;
    if (Notification.permission !== "granted") return;
    obtainPushToken()
      .then((token) => {
        if (token) {
          return registerDeviceAction({
            fcmToken: token,
            deviceId: getDeviceId(),
            deviceName: navigator.userAgent.slice(0, 180),
          });
        }
      })
      .catch(() => {});
  }, []);

  // Foreground messages → in-app toast.
  useEffect(() => {
    let unsub: (() => void) | undefined;
    onForegroundMessage((payload) => {
      const d = payload.data ?? {};
      setToast({
        title: d.title ?? payload.notification?.title ?? "Arise//OS",
        body: d.body ?? payload.notification?.body ?? "",
        deeplink: d.deeplink,
      });
      if (d.notificationId) {
        logNotificationEventAction({
          notificationId: d.notificationId,
          event: "DELIVERED",
          deviceId: getDeviceId(),
        }).catch(() => {});
      }
    }).then((u) => {
      unsub = u;
    });
    return () => unsub?.();
  }, []);

  // Notification-click analytics (?nid= & ?naction= from the SW).
  useEffect(() => {
    if (trackedClick.current) return;
    const nid = searchParams.get("nid");
    const nsid = searchParams.get("nsid");
    const naction = searchParams.get("naction");
    if (!nid && !nsid) return;
    trackedClick.current = true;

    const finish = () => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("nid");
      params.delete("nsid");
      params.delete("naction");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    };

    const log = logNotificationEventAction({
      notificationId: nid ?? undefined,
      scheduledId: nsid ?? undefined,
      event: naction && naction !== "open" ? "ACTION" : "OPENED",
      action: naction ?? undefined,
      deviceId: getDeviceId(),
    });
    const extra =
      naction === "skip_remaining" ? skipRemainingQuestsAction() : Promise.resolve(null);
    Promise.allSettled([log, extra]).then(finish);
  }, [searchParams, pathname, router]);

  if (!toast) return null;
  return (
    <div className="fixed left-1/2 top-4 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-arc-violet/40 bg-black/85 p-4 shadow-glow-violet backdrop-blur-xl">
      <button
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 text-white/40 hover:text-white"
        onClick={() => setToast(null)}
      >
        <X className="h-4 w-4" />
      </button>
      <button
        className="block w-full text-left"
        onClick={() => {
          const target = toast.deeplink;
          setToast(null);
          if (target) router.push(target);
        }}
      >
        <p className="text-sm font-semibold text-white">{toast.title}</p>
        <p className="mt-1 text-xs text-white/70">{toast.body}</p>
      </button>
    </div>
  );
}
