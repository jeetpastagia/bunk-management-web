/* eslint-disable no-undef */
// Firebase Cloud Messaging background handler. Vite serves everything in
// public/ untouched at the site root, which is where FCM requires this
// file to live. It can't read import.meta.env (this isn't bundled), so the
// config is passed as query params on registration — see
// src/lib/firebase.js's requestFcmToken(), which is the only place this
// file gets registered from.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification || {};
    self.registration.showNotification(title || 'Bunk Manager', {
      body: body || '',
      icon: '/favicon.svg',
      data: payload.data || {},
    });
  });
}
