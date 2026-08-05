const admin = require("firebase-admin");
const path = require("path");

let isInitialized = false;

try {
  let credential;

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), 
    });
    console.log("Firebase initialized using .env variables.");
  } else {
    const serviceAccountPath = path.resolve(__dirname, "../config/firebase-service-account.json");
    const serviceAccount = require(serviceAccountPath);
    credential = admin.credential.cert(serviceAccount);
    console.log("Firebase initialized using local config file.");
  }

  admin.initializeApp({
    credential: credential,
  });
  
  isInitialized = true;
  console.log("Firebase Admin Initialized successfully.");
} catch (error) {
  console.error("Failed to initialize Firebase Admin. Please check credentials or config file.", error.message);
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
