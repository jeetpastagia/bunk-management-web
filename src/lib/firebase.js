import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

function isConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && VAPID_KEY);
}

let appInstance = null;
function getFirebaseApp() {
  if (!appInstance) {
    appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return appInstance;
}

/**
 * Requests notification permission and returns an FCM device token, or
 * null if Firebase isn't configured, the browser doesn't support push, or
 * the user denies permission. Must be called from a user gesture (e.g. a
 * button click) — some browsers silently ignore permission requests
 * otherwise.
 */
export async function requestFcmToken() {
  if (!isConfigured()) return null;
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (!(await isSupported().catch(() => false))) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const configParams = new URLSearchParams(
    Object.fromEntries(Object.entries(firebaseConfig).filter(([, v]) => Boolean(v)))
  );
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${configParams.toString()}`);

  const messaging = getMessaging(getFirebaseApp());
  try {
    return await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[fcm] failed to get device token', err);
    return null;
  }
}

/** Foreground push messages (app open in an active tab); background ones are handled by the service worker. */
export function onForegroundMessage(callback) {
  if (!isConfigured()) return () => {};
  const messaging = getMessaging(getFirebaseApp());
  return onMessage(messaging, callback);
}

export { isConfigured as isFcmConfigured };
