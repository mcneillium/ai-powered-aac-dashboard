// setAdmin.js
const admin = require("firebase-admin");

// Replace this with the path to your Firebase service account key JSON
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// The UID of the user you want to make admin
const uid = "a1f3Yen9RVPJ0P35sOkaMmzgml12";

admin.auth().setCustomUserClaims(uid, { role: "admin" })
  .then(() => {
    console.log(`✅ Admin role granted to user ${uid}`);
  })
  .catch((error) => {
    console.error("❌ Error setting admin role:", error);
  });
