"use client";

import { useEffect } from "react";
import { requestFirebaseNotificationPermission, onMessageListener } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { apiCall } from "@/lib/api";

export default function PushNotificationHandler() {
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!user) return;

    const setupNotifications = async () => {
      try {
        const token = await requestFirebaseNotificationPermission();
        if (token) {
          // Send token to backend
          await apiCall("/api/users/fcm-token", {
            method: "POST",
            body: JSON.stringify({ fcmToken: token }),
          }, user.token);
          console.log("FCM Token registered with backend.");
        }
      } catch (error) {
        console.error("Failed to setup push notifications", error);
      }
    };

    setupNotifications();

    // Listen for foreground messages
    const listenToMessages = async () => {
      try {
        while (true) {
          const payload: any = await onMessageListener();
          if (payload && payload.notification) {
            showToast(
              `${payload.notification.title}: ${payload.notification.body}`,
              "success"
            );
          }
        }
      } catch (error) {
        console.error("Error listening to foreground messages:", error);
      }
    };

    listenToMessages();

  }, [user, showToast]);

  return null;
}
