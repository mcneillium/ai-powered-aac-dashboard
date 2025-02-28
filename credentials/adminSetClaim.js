// credentials/adminSetClaim.js
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json')),
  databaseURL: 'https://commai-b98fe-default-rtdb.europe-west1.firebasedatabase.app'
});

const uid = 'a1f3Yen9RVPJ0P35sOkaMmzgml12';

admin
  .auth()
  .setCustomUserClaims(uid, { role: 'admin' })
  .then(() => {
    console.log(`Custom claim 'admin' set for user ${uid}`);
  })
  .catch((error) => {
    console.error('Error setting custom claims:', error);
  });
