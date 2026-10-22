const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "./serviceAccountKey.json";

try {
    // Check if service account file exists or check if GOOGLE_APPLICATION_CREDENTIALS is set
    // This is a placeholder initialization. User needs to provide the serviceAccountKey.json
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "serviceAccountKey.json";
    const resolvedPath = path.resolve(__dirname, keyPath);

    const serviceAccount = require(resolvedPath);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin Initialized Successfully");
} catch (error) {
    console.error("Firebase Admin Initialization Failed: ", error.message);
    console.error("Attempted to load key from:", path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "serviceAccountKey.json"));
    console.error("Please provide a valid serviceAccountKey.json in backend/config or set FIREBASE_SERVICE_ACCOUNT_KEY env variable.");
}

module.exports = admin;
