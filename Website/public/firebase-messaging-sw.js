/**
 * Firebase Cloud Messaging service worker — handles background pushes when
 * no Arise//OS tab is focused. Uses the compat SDK (the only API surface
 * available via importScripts).
 *
 * Auth note: the SW holds no Supabase token, so interaction analytics ride
 * URL params (?nid=&naction=) into the authed app, which logs them via
 * POST /v1/notifications/events after load.
 */
/* global self, clients, firebase */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

// Populated at runtime by the page via postMessage (config lives in env vars,
// not in this static file). Falls back to self.__FIREBASE_CONFIG if replaced
// at deploy time.
let messaging = null;

function init(config) {
  if (messaging || !config || !config.apiKey) return;
  firebase.initializeApp(config);
  messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = data.title || (payload.notification && payload.notification.title) || "Arise//OS";
    const body = data.body || (payload.notification && payload.notification.body) || "";
    let actions = [];
    try {
      actions = (JSON.parse(data.actions || "[]") || [])
        .slice(0, 3)
        .map((a) => ({ action: a.id, title: a.title }));
    } catch (_) {
      /* malformed actions payload — show without buttons */
    }
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || undefined,
      data,
      actions,
    });
  });
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_CONFIG") init(event.data.config);
});
if (self.__FIREBASE_CONFIG) init(self.__FIREBASE_CONFIG);

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action || "open";
  if (action === "dismiss") return;

  // Resolve the deeplink: explicit per-action target, else the push's.
  let deeplink = data.deeplink || "/dashboard";
  try {
    const actions = JSON.parse(data.actions || "[]") || [];
    const hit = actions.find((a) => a.id === action);
    if (hit && hit.deeplink) deeplink = hit.deeplink;
  } catch (_) {
    /* keep default deeplink */
  }

  const url = new URL(deeplink, self.location.origin);
  if (data.notificationId) url.searchParams.set("nid", data.notificationId);
  if (data.scheduledId) url.searchParams.set("nsid", data.scheduledId);
  url.searchParams.set("naction", action);

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url.pathname + url.search);
          return client.focus();
        }
      }
      return clients.openWindow(url.toString());
    }),
  );
});
