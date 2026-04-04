// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBZS_Bfl7Bj4axlFt8Pg3HebYzAbrqBDQs',
  authDomain: 'commai-b98fe.firebaseapp.com',
  // Updated databaseURL:
  databaseURL: 'https://commai-b98fe-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'commai-b98fe',
  storageBucket: 'commai-b98fe.appspot.com',
  messagingSenderId: '419619126158',
  appId: '1:419619126158:web:202d9bdfbab0878fbdc2df'
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
