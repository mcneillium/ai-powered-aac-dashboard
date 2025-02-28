// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// from your Firebase console > Project settings
const firebaseConfig = {
  apiKey: 'AIzaSyBZS_Bfl7Bj4axlFt8Pg3HebYzAbrqBDQs',
  authDomain: 'commai-b98fe.firebaseapp.com',
  databaseURL: 'https://commai-b98fe.firebaseio.com',
  projectId: 'commai-b98fe',
  storageBucket: 'commai-b98fe.appspot.com',
  messagingSenderId: '...',
  appId: '...'
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
