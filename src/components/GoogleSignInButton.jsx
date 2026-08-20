import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

let scriptPromise = null;
function loadGoogleScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * A "Continue with Google" button styled to match this app's dark glass
 * theme — Google's own rendered button is an iframe (can't be restyled,
 * and can't be triggered by a synthetic click on a cross-origin element),
 * so our button instead triggers Google's One Tap prompt
 * (google.accounts.id.prompt()) directly. If One Tap can't show for some
 * reason (browser policy, user dismissed it recently, third-party cookies
 * blocked), we fall back to rendering Google's real button so sign-in is
 * never a dead end — just temporarily in Google's own visual style.
 *
 * `use_fedcm_for_prompt: true` is Google's current recommended config for
 * One Tap: without it, Chrome's third-party-cookie phase-out makes the
 * prompt silently fail to display (isNotDisplayed()) far more often,
 * which is what made the account chooser feel broken/inconsistent and
 * pushed users into typing their email manually elsewhere on the page.
 * FedCM's chooser also natively lists every Google account signed into
 * the browser, which is the actual account-selection UI being asked for.
 */
export default function GoogleSignInButton({ staySignedIn = true, onError }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const fallbackRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  // Read via refs inside the GIS callback instead of re-running
  // initialize() on every staySignedIn toggle — re-initializing GIS
  // mid-session is what made the prompt's display/cooldown state
  // inconsistent (another contributor to "sometimes I have to type the
  // email manually" instead of seeing the chooser).
  const staySignedInRef = useRef(staySignedIn);
  staySignedInRef.current = staySignedIn;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          use_fedcm_for_prompt: true,
          auto_select: false,
          callback: async (response) => {
            try {
              const user = await loginWithGoogle(response.credential, staySignedInRef.current);
              navigate(user.setupCompleted ? '/' : '/setup');
            } catch (err) {
              onErrorRef.current?.(err.message || 'Google sign-in failed');
            }
          },
        });
        setReady(true);
      })
      .catch(() => onErrorRef.current?.('Could not load Google Sign-In'));

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, navigate]);

  useEffect(() => {
    if (showFallback && fallbackRef.current && window.google?.accounts?.id) {
      window.google.accounts.id.renderButton(fallbackRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: 320,
        shape: 'pill',
      });
    }
  }, [showFallback]);

  if (!CLIENT_ID) return null;

  if (showFallback) {
    return <div ref={fallbackRef} className="flex justify-center" />;
  }

  const handleClick = () => {
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        setShowFallback(true);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!ready}
      className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm bg-[var(--tint-5)] hover:bg-[var(--tint-10)] text-[var(--color-text)] border border-[var(--color-border)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
    >
      <GoogleGIcon className="w-4.5 h-4.5 shrink-0" />
      {ready ? 'Continue with Google' : 'Loading…'}
    </button>
  );
}

function GoogleGIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.48a5.54 5.54 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.58-5.17 3.58-8.83Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.27a12 12 0 0 0 0 10.76l4-3.11Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}
