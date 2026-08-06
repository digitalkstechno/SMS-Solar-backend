const { initializeApp, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const path = require("path");

let isInitialized = false;
let app;

try {
  let credential;

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    credential = cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), 
    });
    console.log("Firebase initialized using .env variables.");
  } else {
    const serviceAccountPath = path.resolve(__dirname, "../config/firebase-service-account.json");
    const serviceAccount = require(serviceAccountPath);
    credential = cert(serviceAccount);
    console.log("Firebase initialized using local config file.");
  }

  app = initializeApp({
    credential: credential,
  });
  
  isInitialized = true;
  console.log("Firebase Admin Initialized successfully.");
} catch (error) {
  console.error("Failed to initialize Firebase Admin. Please check credentials or config file.", error.message);
}

const sendPushNotification = async (token, title, body, data = {}) => {
  if (!isInitialized) {
    console.warn("[FCM WARNING] Firebase Admin is not initialized. Skipping push notification.");
    return;
  }

  if (!token) {
    console.warn("[FCM WARNING] No FCM token provided. Skipping push notification.");
    return;
  }

  // Ensure title and body are also included in data payload for Flutter background handler compatibility
  const stringData = {
    title: String(title || ''),
    body: String(body || ''),
    message: String(title || ''),
    content: String(body || ''),
  };

  if (data && typeof data === 'object') {
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && data[key] !== null) {
        stringData[key] = String(data[key]);
      }
    });
  }

  console.log(`[FCM DEBUG] Target Token: ${token}`);
  console.log(`[FCM DEBUG] Title: "${title}" | Body: "${body}"`);
  console.log(`[FCM DEBUG] Data Payload:`, stringData);

  const message = {
    notification: {
      title,
      body,
    },
    data: stringData,
    token,
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "high_importance_channel",
        priority: "high",
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
          contentAvailable: true,
        },
      },
    },
  };

  try {
    const response = await getMessaging(app).send(message);
    console.log(`[FCM SUCCESS] Push notification sent successfully! Response ID: ${response}`);
    return response;
  } catch (error) {
    console.error(`[FCM ERROR] Failed to send push notification to token (${token}):`, error.message || error);
    if (
      error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered' ||
      (error.message && error.message.includes('not a valid FCM registration token'))
    ) {
      console.warn(`[FCM WARNING] Token "${token}" is invalid or expired. The mobile app needs to re-register its FCM token via POST /v1/api/notification/update-fcm-token.`);
    }
  }
};

const sendPushNotificationToUser = async (userId, title, body, data = {}) => {
  if (!userId) return;
  try {
    const STAFF = require("../model/staff");
    const USER = require("../model/user");

    let person = await STAFF.findById(userId).select("fcmToken fullName email");
    if (!person) {
      person = await USER.findById(userId).select("fcmToken fullName email");
    }

    if (person && person.fcmToken) {
      console.log(`Sending FCM push notification to user ${person.fullName || userId} (token: ${person.fcmToken})`);
      return await sendPushNotification(person.fcmToken, title, body, data);
    } else {
      console.log(`No FCM token found for recipient user: ${userId}`);
    }
  } catch (err) {
    console.error("Error in sendPushNotificationToUser:", err.message || err);
  }
};

const sendPushNotificationToUsers = async (userIds, title, body, data = {}) => {
  if (!Array.isArray(userIds) || userIds.length === 0) return;

  // Filter out duplicates and invalid IDs
  const uniqueUserIds = [...new Set(userIds.map((id) => String(id || '')).filter(Boolean))];

  for (const userId of uniqueUserIds) {
    await sendPushNotificationToUser(userId, title, body, data);
  }
};

module.exports = {
  sendPushNotification,
  sendPushNotificationToUser,
  sendPushNotificationToUsers,
};
