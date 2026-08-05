const admin = require("firebase-admin");
const path = require("path");

let isInitialized = false;

try {
  const serviceAccountPath = path.resolve(__dirname, "../config/firebase-service-account.json");
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  isInitialized = true;
  console.log("Firebase Admin Initialized successfully.");
} catch (error) {
  console.error("Failed to initialize Firebase Admin. Please check config/firebase-service-account.json", error.message);
}

const sendPushNotification = async (token, title, body, data = {}) => {
  if (!isInitialized) {
    console.warn("FCM is not initialized. Skipping push notification.");
    return;
  }

  if (!token) {
    console.warn("No FCM token provided. Skipping push notification.");
    return;
  }

  const message = {
    notification: {
      title,
      body,
    },
    data,
    token,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Successfully sent push notification:", response);
    return response;
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};

module.exports = {
  sendPushNotification,
};
