// Cloud Functions for the caregiver/admin dashboard.
//
// SECURITY: setUserPassword can change ANY user's password via the Admin
// SDK, so it must only ever be callable by an authenticated administrator.
// Admins are identified by the `role: "admin"` custom claim
// (set via a one-off Admin SDK script) with a fallback to the
// users/{uid}/role database value.

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Whether the calling identity is an administrator.
 * @param {object} auth The callable request auth context.
 * @return {Promise<boolean>} True when the caller has the admin role.
 */
async function isAdmin(auth) {
  if (!auth) return false;
  if (auth.token && auth.token.role === "admin") return true;
  try {
    const snap = await admin.database()
        .ref(`users/${auth.uid}/role`).once("value");
    return snap.val() === "admin";
  } catch (err) {
    logger.error("Admin role lookup failed:", err);
    return false;
  }
}

exports.setUserPassword = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  if (!(await isAdmin(request.auth))) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  const {uid, newPassword} = request.data || {};
  if (typeof uid !== "string" || uid.length === 0 || uid.length > 128) {
    throw new HttpsError("invalid-argument", "Invalid uid.");
  }
  if (typeof newPassword !== "string" || newPassword.length < 8 ||
      newPassword.length > 256) {
    throw new HttpsError(
        "invalid-argument",
        "Password must be between 8 and 256 characters.",
    );
  }

  try {
    await admin.auth().updateUser(uid, {password: newPassword});
    logger.info(`Password updated for user by admin ${request.auth.uid}`);
    return {message: "Password updated successfully!"};
  } catch (error) {
    logger.error("Error updating password:", error);
    // Never echo raw Admin SDK errors to the client.
    throw new HttpsError("internal", "Could not update password.");
  }
});
