import { getToken, onMessage } from "firebase/messaging";
import { messaging, db } from "../lib/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

// You need a VAPID key from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
// Since we don't have it, we'll leave it empty, but getToken might fail without it.
// If it fails, we'll catch the error.
const VAPID_KEY = (import.meta as any).env.VITE_FIREBASE_VAPID_KEY || "";

export const notificationService = {
  async requestPermissionAndGetToken(userId: string) {
    if (!messaging) {
      console.warn("Messaging is not supported in this browser.");
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        if ((import.meta as any).env?.DEV) console.log("Notification permission granted.");
        
        // Get FCM token
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        
        if (token) {
          if ((import.meta as any).env?.DEV) console.log("FCM Token obtained:", token);
          // Save token to user profile
          await this.saveTokenToUser(userId, token);
          return token;
        } else {
          console.warn("No registration token available. Request permission to generate one.");
          return null;
        }
      } else {
        if ((import.meta as any).env?.DEV) console.log("Notification permission not granted.");
        return null;
      }
    } catch (error) {
      console.error("An error occurred while retrieving token. ", error);
      return null;
    }
  },

  async saveTokenToUser(userId: string, token: string) {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token)
      });
      if ((import.meta as any).env?.DEV) console.log("Token saved to user profile.");
    } catch (error) {
      console.error("Error saving token to user:", error);
    }
  },

  onMessageListener() {
    if (!messaging) return new Promise((resolve) => resolve(null));
    return new Promise((resolve) => {
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    });
  },

  async sendNotification(title: string, body: string, tokens: string[], data?: any) {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body,
          tokens,
          data
        }),
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error calling notification API:", error);
      return { success: false, error };
    }
  }
};
