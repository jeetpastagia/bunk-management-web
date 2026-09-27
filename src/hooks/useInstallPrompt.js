import { useEffect, useState, useCallback } from 'react';
import { getCapturedInstallEvent, isInstalled, clearCapturedInstallEvent, onInstallEventChange } from '../lib/installPromptCapture';

/**
 * Wraps the browser's native PWA install flow. The actual
 * beforeinstallprompt listener lives in lib/installPromptCapture.js,
 * attached the instant the JS bundle starts running — by the time this
 * component-level hook mounts (behind the login check), the event may
 * already have fired and been captured, which is exactly the common case
 * this needs to handle correctly.
 *
 * Safari/iOS and Firefox never fire beforeinstallprompt at all (there's no
 * programmatic install API there, only the manual "Add to Home Screen"
 * share-sheet action), so on those browsers canInstall just stays false
 * and callers should hide the button entirely rather than show one that
 * can't do anything.
 */
export function useInstallPrompt() {
  const [hasEvent, setHasEvent] = useState(() => Boolean(getCapturedInstallEvent()));
  const [installed, setInstalled] = useState(isInstalled);

  useEffect(() => {
    return onInstallEventChange(() => {
      setHasEvent(Boolean(getCapturedInstallEvent()));
      setInstalled(isInstalled());
    });
  }, []);

  const promptInstall = useCallback(async () => {
    const event = getCapturedInstallEvent();
    if (!event) return false;
    event.prompt();
    const { outcome } = await event.userChoice;
    clearCapturedInstallEvent(); // a captured prompt event can only be used once
    setHasEvent(false);
    return outcome === 'accepted';
  }, []);

  return { canInstall: hasEvent && !installed, installed, promptInstall };
}
