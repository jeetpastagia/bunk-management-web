import { useEffect, useRef, useState } from 'react';
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
 * Renders Google's own "Sign in with Google" button. On success, Google
 * hands us a signed ID token (never a plain email we'd have to trust
 * blindly) — that gets sent straight to our backend, which verifies it
 * against Google's public keys before creating/linking an account.
 * Quietly renders nothing if VITE_GOOGLE_CLIENT_ID isn't configured.
 */
export default function GoogleSignInButton({ staySignedIn = true, onError }) {
  const { loginWithGoogle } = useAuth();
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async (response) => {
            try {
              await loginWithGoogle(response.credential, staySignedIn);
              window.location.href = '/';
            } catch (err) {
              onError?.(err.message || 'Google sign-in failed');
            }
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: 320,
          shape: 'pill',
        });
        setReady(true);
      })
      .catch(() => onError?.('Could not load Google Sign-In'));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staySignedIn]);

  if (!CLIENT_ID) return null;

  return <div ref={containerRef} className={ready ? 'flex justify-center' : 'hidden'} />;
}
