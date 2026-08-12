import type { Notification as AppNotification } from "@/lib/types";

export const DEVICE_NOTIFICATIONS_KEY = "hevi-device-notifications";

export function notificationHref(notification: AppNotification) {
  if (notification.group_id && notification.table_id) {
    return `/grupos/${notification.group_id}/tablas/${notification.table_id}`;
  }
  return notification.group_id ? `/grupos/${notification.group_id}` : "/";
}

export function supportsDeviceNotifications() {
  return "serviceWorker" in navigator && "Notification" in window;
}

export function supportsBackgroundPush() {
  return supportsDeviceNotifications() && "PushManager" in window;
}

export async function getServiceWorkerRegistration() {
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return registration;
}

export function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export async function showDeviceNotification(notification: AppNotification) {
  if (
    !supportsDeviceNotifications() ||
    Notification.permission !== "granted" ||
    localStorage.getItem(DEVICE_NOTIFICATIONS_KEY) !== "enabled"
  ) {
    return;
  }

  const registration = await getServiceWorkerRegistration();
  await registration.showNotification(notification.title, {
    body: notification.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: `hevi-${notification.id}`,
    data: { url: notificationHref(notification) }
  });
}
