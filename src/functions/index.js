const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize the Admin SDK
admin.initializeApp();

// Existing function for setting user password via HTTPS callable
exports.setUserPassword = functions.https.onCall(async (data, context) => {
  // Check that the caller is authenticated and is an admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to set passwords.'
    );
  }
  if (context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can set user passwords.'
    );
  }

  const { uid, newPassword } = data;

  // Validate input
  if (!uid || !newPassword) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing uid or newPassword'
    );
  }

  try {
    // Attempt to update the user’s password
    await admin.auth().updateUser(uid, { password: newPassword });
    return { message: 'Password updated successfully!' };
  } catch (error) {
    console.error('Error updating password:', error);
    // Throw an HttpsError so that the client sees a proper error
    throw new functions.https.HttpsError('internal', error.message);
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
    // Write the user data to the "users" node, keyed by uid
    await admin.database().ref(`users/${uid}`).set(userData);
    console.log(`User ${uid} added to realtime database.`);
  } catch (error) {
    console.error('Error syncing user to realtime database:', error);
  }
});
