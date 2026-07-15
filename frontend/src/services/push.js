import { pushApi } from './api.js';

// Web Push client helpers. The permission prompt fires only from the explicit
// toggle in Impostazioni (no cold prompts).

const b64ToU8 = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
};

export const pushSupported = () =>
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  !!import.meta.env.VITE_VAPID_PUBLIC_KEY;

export async function getPushSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function enablePush() {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permesso notifiche negato dal browser');
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64ToU8(import.meta.env.VITE_VAPID_PUBLIC_KEY),
  });
  await pushApi.subscribe(sub.toJSON());
  return sub;
}

export async function disablePush() {
  const sub = await getPushSubscription();
  if (!sub) return;
  await pushApi.unsubscribe(sub.endpoint).catch(() => {});
  await sub.unsubscribe();
}
