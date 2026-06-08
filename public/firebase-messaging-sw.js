importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// TODO: Replace with your actual Firebase Web Config from Firebase Console -> Project Settings -> General -> Your apps -> Web app
const firebaseConfig = {
  apiKey: "AIzaSyB2IsITTefdPpa3PW27LMRUIktgmYlArPA",
  authDomain: "inapp-8f8d0.firebaseapp.com",
  projectId: "inapp-8f8d0",
  storageBucket: "inapp-8f8d0.firebasestorage.app",
  messagingSenderId: "749439314854",
  appId: "1:749439314854:web:e5c715f9e937d71b3ffd67",
  measurementId: "G-528GS6VYM0"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
