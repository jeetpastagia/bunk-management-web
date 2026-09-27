// Captures `beforeinstallprompt` at module-evaluation time — i.e. as soon
// as this file is first imported, which happens while main.jsx is still
// executing, well before React even starts rendering. This matters because
// the install button only mounts once the user is confirmed logged in
// (AppShell renders behind an auth check that needs a network round-trip
// first), and Chrome can fire beforeinstallprompt within the first second
// of page load — long before that. Listening inside the component's own
// useEffect, as a first pass at this feature did, missed the event
// entirely on exactly that common path (the button just never appeared,
// even in a browser that would otherwise have offered to install).
let capturedEvent = null;
let installed = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);
const listeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // suppress the browser's own mini-infobar so our button is the only entry point
    capturedEvent = e;
    listeners.forEach((cb) => cb());
  });
  window.addEventListener('appinstalled', () => {
    capturedEvent = null;
    installed = true;
    listeners.forEach((cb) => cb());
  });
}

export function getCapturedInstallEvent() {
  return capturedEvent;
}
export function isInstalled() {
  return installed;
}
export function clearCapturedInstallEvent() {
  capturedEvent = null;
}
export function onInstallEventChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
