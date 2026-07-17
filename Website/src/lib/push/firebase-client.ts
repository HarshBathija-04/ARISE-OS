"use client";

/**
 * Browser-side Firebase Messaging: lazy init from NEXT_PUBLIC_FIREBASE_*,
 * token acquisition against the deployed service worker, and foreground
 * message subscription. Everything degrades to null when config is absent
 * or the browser lacks Notification/SW support.
 */
import type { FirebaseApp } from "firebase/app";
import type { Messaging, MessagePayload } from "firebase/messaging";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

export function pushConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && VAPID_KEY);
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

let appPromise: Promise<FirebaseApp | null> | null = null;

async function getApp(): Promise<FirebaseApp | null> {
  if (!appPromise) {
    appPromise = (async () => {
      if (!pushConfigured() || !pushSupported()) return null;
      const { initializeApp, getApps } = await import("firebase/app");
      return getApps()[0] ?? initializeApp(firebaseConfig);
    })();
  }
  return appPromise;
}

async function getMessagingInstance(): Promise<Messaging | null> {
  const app = await getApp();
  if (!app) return null;
  const { getMessaging, isSupported } = await import("firebase/messaging");
  if (!(await isSupported())) return null;
  return getMessaging(app);
}

/** Register the SW, hand it the Firebase config, and mint an FCM token. */
export async function obtainPushToken(): Promise<string | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  await navigator.serviceWorker.ready;
  registration.active?.postMessage({ type: "FIREBASE_CONFIG", config: firebaseConfig });

  const { getToken } = await import("firebase/messaging");
  return getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
}

/** Foreground message stream (page focused → we toast instead of the SW). */
export async function onForegroundMessage(
  handler: (payload: MessagePayload) => void,
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  const { onMessage } = await import("firebase/messaging");
  return onMessage(messaging, handler);
}

/** Stable per-browser device id for push_devices upserts. */
export function getDeviceId(): string {
  const KEY = "arise-device-id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
