import { useEffect, useState, useCallback } from 'react';

/**
 * Wraps the browser's native PWA install flow (Chrome/Edge/Android — the
 * `beforeinstallprompt` event). Safari/iOS and Firefox never fire this
 * event at all (there's no programmatic install API there, only the
 * manual "Add to Home Screen" share-sheet action), so on those browsers
 * `canInstall` just stays false and callers should hide the button
 * entirely rather than show a button that can't do anything.
 */
export function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  );

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault(); // stop the browser's own mini-infobar so our button is the one entry point
      setDeferredEvent(e);
    };
    const handleInstalled = () => {
      setDeferredEvent(null);
      setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) return false;
    deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    setDeferredEvent(null); // a captured prompt event can only be used once
    return outcome === 'accepted';
  }, [deferredEvent]);

  return { canInstall: Boolean(deferredEvent) && !installed, installed, promptInstall };
}
