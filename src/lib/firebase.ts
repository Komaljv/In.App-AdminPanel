import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyB2IsITTefdPpa3PW27LMRUIktgmYlArPA",
  authDomain: "inapp-8f8d0.firebaseapp.com",
  projectId: "inapp-8f8d0",
  storageBucket: "inapp-8f8d0.firebasestorage.app",
  messagingSenderId: "749439314854",
  appId: "1:749439314854:web:e5c715f9e937d71b3ffd67",
  measurementId: "G-528GS6VYM0"
};

const app = initializeApp(firebaseConfig);

export const messaging = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  } catch (error) {
    console.error("Firebase messaging not supported", error);
  }
  return null;
};

export const requestFirebaseNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const msg = await messaging();
      if (!msg) return null;
      
      const token = await getToken(msg, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY // Add this to your .env.local
      });
      return token;
    }
  } catch (error) {
    console.error("An error occurred while retrieving token. ", error);
  }
  return null;
};

export const onMessageListener = async () => {
  const msg = await messaging();
  if (!msg) return;
  return new Promise((resolve) => {
    onMessage(msg, (payload) => {
      resolve(payload);
    });
  });
};
