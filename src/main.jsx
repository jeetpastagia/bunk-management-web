import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Imported first and for its side effect only: this attaches the
// beforeinstallprompt listener the instant the bundle starts executing,
// before React (and the auth check gating the button that uses it) even
// starts — see installPromptCapture.js for why that ordering matters.
import './lib/installPromptCapture.js'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registering this unconditionally (not just when push notifications are
// enabled) is what makes Chrome/Edge/Android offer the install/"Add to
// Home Screen" prompt for the site.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
