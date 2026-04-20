const admin = require('firebase-admin');
const path = require('path');
const { firebaseProjectId, firebaseClientEmail, firebaseStorageBucket } = require('./env');

let bucket = null;
let initialized = false;

const tryInitFirebase = () => {
  if (initialized) return;
  initialized = true;

  try {
    let credential;

    // Option 1: Use the service account JSON file sitting in the project root
    const serviceAccountPath = path.resolve(__dirname, '../../renderlabsai-firebase-adminsdk-fbsvc-cf8442c2e8.json');
    try {
      const serviceAccount = require(serviceAccountPath);
      credential = admin.credential.cert(serviceAccount);
      console.log('Firebase Admin SDK: using service account JSON file.');
    } catch (_) {
      // If the JSON file isn't there, fall back to env var fields
      const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
      const privateKey = rawKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');

      if (!firebaseProjectId || !firebaseClientEmail || !privateKey) {
        console.warn('Firebase Admin SDK: credentials missing. Storage uploads will not work.');
        return;
      }

      credential = admin.credential.cert({
        projectId: firebaseProjectId,
        clientEmail: firebaseClientEmail,
        privateKey,
      });
      console.log('Firebase Admin SDK: using env var credentials.');
    }

    admin.initializeApp({
      credential,
      storageBucket: firebaseStorageBucket || process.env.FIREBASE_STORAGE_BUCKET,
    });

    bucket = admin.storage().bucket();
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
  }
};

tryInitFirebase();

module.exports = {
  admin,
  get bucket() { return bucket; },
};
