const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize the Admin SDK once at the top of your file.
admin.initializeApp();

// Switch to an onCall function (instead of onRequest)
exports.setUserPassword = functions.https.onCall(async (data, context) => {
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
