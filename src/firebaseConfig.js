// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Firebase config values should be set via environment variables.
// Create a .env file in the project root with these values:
//   REACT_APP_FIREBASE_API_KEY=...
//   REACT_APP_FIREBASE_AUTH_DOMAIN=...
//   REACT_APP_FIREBASE_DATABASE_URL=...
//   REACT_APP_FIREBASE_PROJECT_ID=...
//   REACT_APP_FIREBASE_STORAGE_BUCKET=...
//   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
//   REACT_APP_FIREBASE_APP_ID=...
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyBZS_Bfl7Bj4axlFt8Pg3HebYzAbrqBDQs',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'commai-b98fe.firebaseapp.com',
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || 'https://commai-b98fe-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'commai-b98fe',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'commai-b98fe.appspot.com',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '...',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '...'
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
