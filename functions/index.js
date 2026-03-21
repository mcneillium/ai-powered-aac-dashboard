const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

// Allowed origins - restrict in production
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://commai-b98fe.web.app",
  "https://commai-b98fe.firebaseapp.com",
];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Max-Age", "3600");
}

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Returns the decoded token or null.
 */
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    logger.warn("Invalid auth token:", err.message);
    return null;
  }
}

/**
 * Validates password meets minimum requirements server-side.
 */
function validatePassword(password) {
  if (typeof password !== "string") return "Password must be a string";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/\d/.test(password)) return "Password must contain a number";
  return null;
}

exports.setUserPassword = onRequest(
  { region: "europe-west1" },
  async (req, res) => {
    setCorsHeaders(req, res);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // Verify authentication
    const decodedToken = await verifyAuth(req);
    if (!decodedToken) {
      return res.status(401).json({ error: "Unauthorized: valid auth token required" });
    }

    // Verify admin role
    if (decodedToken.role !== "admin") {
      logger.warn(`Non-admin user ${decodedToken.uid} attempted password change`);
      return res.status(403).json({ error: "Forbidden: admin role required" });
    }

    const { uid, newPassword } = req.body;

    if (!uid || typeof uid !== "string") {
      return res.status(400).json({ error: "Missing or invalid uid" });
    }
    if (!newPassword) {
      return res.status(400).json({ error: "Missing newPassword" });
    }

    // Server-side password validation
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    // Prevent setting password on own account via this endpoint
    if (uid === decodedToken.uid) {
      return res.status(400).json({ error: "Cannot set your own password via this endpoint" });
    }

    try {
      await admin.auth().updateUser(uid, { password: newPassword });
      logger.info(`Password updated for user ${uid} by admin ${decodedToken.uid}`);
      res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) {
      logger.error("Error updating password:", error);
      if (error.code === "auth/user-not-found") {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(500).json({ error: "Internal error updating password" });
    }
  },
);
