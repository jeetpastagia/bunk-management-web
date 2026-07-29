import { api } from '../api/client';
import { requestFcmToken, isFcmConfigured } from './firebase';

const STORAGE_KEY = 'bunkmanager_fcm_token';

export function getStoredFcmToken() {
  return localStorage.getItem(STORAGE_KEY);
}

export function clearStoredFcmToken() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Requests notification permission (must be called from a user gesture)
 * and registers the resulting device token with the backend. Returns
 * false quietly if Firebase isn't configured, the browser lacks support,
 * or the user denies permission — this is a soft feature, never blocking.
 */
export async function enablePushNotifications() {
  const token = await requestFcmToken();
  if (!token) return false;
  localStorage.setItem(STORAGE_KEY, token);
  await api.registerFcmToken(token);
  return true;
}

/** Unregisters this device's token from the backend (Settings toggle, or on logout). */
export async function disablePushNotifications() {
  const token = getStoredFcmToken();
  if (token) {
    try {
      await api.removeFcmToken(token);
    } catch {
      // best-effort — token cleanup shouldn't block the calling action
    }
  }
  clearStoredFcmToken();
}

export { isFcmConfigured };
