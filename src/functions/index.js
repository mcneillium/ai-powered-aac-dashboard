const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize the Admin SDK
admin.initializeApp();

exports.setUserPassword = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      ‘unauthenticated’,
      ‘Must be logged in to change passwords’
    );
  }

  const callerSnap = await admin.database().ref(`users/${context.auth.uid}/role`).once(‘value’);
  if (callerSnap.val() !== ‘admin’) {
    throw new functions.https.HttpsError(
      ‘permission-denied’,
      ‘Only admins can change user passwords’
    );
  }

  const { uid, newPassword } = data;
  if (!uid || !newPassword) {
    throw new functions.https.HttpsError(
      ‘invalid-argument’,
      ‘Missing uid or newPassword’
    );
  }

  try {
    await admin.auth().updateUser(uid, { password: newPassword });
    return { message: ‘Password updated successfully!’ };
  } catch (error) {
    throw new functions.https.HttpsError(‘internal’, error.message);
  }
});

// New function: Sync a newly created Authentication user to the Realtime Database
exports.syncUserToRealtimeDatabase = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName } = user;
  // Use displayName if available, otherwise use the part of the email before '@'
  const name = displayName ? displayName : email.split('@')[0];
  
  const userData = {
    name,
    email,
    createdAt: admin.database.ServerValue.TIMESTAMP
  };

  try {
    await admin.database().ref(`users/${uid}`).set(userData);
  } catch (error) {
    functions.logger.error('Error syncing user to realtime database:', error);
  }
});
