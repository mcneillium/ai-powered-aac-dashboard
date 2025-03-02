/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall}=require("firebase-functions/v2/https");
 * const {onDocumentWritten}=require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest}=require("firebase-functions/v2/https");
const logger=require("firebase-functions/logger");
const admin=require("firebase-admin");
const cors=require("cors")({origin: true});

admin.initializeApp();

exports.setUserPassword=onRequest((req, res)=>{
  cors(req, res, ()=>{
    // Only allow POST requests
    if (req.method!=="POST") {
      return res.status(405).send("Method Not Allowed");
    }
    const {uid, newPassword}=req.body;
    if (!uid || !newPassword) {
      return res.status(400).json({error: "Missing uid or newPassword"});
    }
    // Update the user's password using the Admin SDK
    admin
        .auth()
        .updateUser(uid, {password: newPassword})
        .then((userRecord)=>{
          res.status(200).json({message: "Password updated successfully!"});
        })
        .catch((error)=>{
          logger.error("Error updating password:", error);
          res.status(500).json({error: error.message});
        });
  });
});
