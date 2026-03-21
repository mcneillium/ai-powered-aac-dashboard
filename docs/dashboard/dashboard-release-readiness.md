# Dashboard Release Readiness

**Date:** 2026-03-21
**Status:** CONDITIONALLY READY (pending credential rotation)

---

## Shared Data Contracts (Dashboard <-> Mobile App)

### User Profile (`/users/{uid}`)

```json
{
  "name": "string (required, 1-200 chars)",
  "email": "string (required, valid email format)",
  "role": "string (enum: 'admin' | 'caregiver') - SET VIA CUSTOM CLAIMS ONLY",
  "caregiverId": "string | null (UID of assigned caregiver)",
  "createdAt": "number (epoch ms)"
}
```

**Write permissions:**
- `role`: Admin custom claim holders only (via Firebase Admin SDK)
- `caregiverId`: Admin or the caregiver being assigned (self-assign)
- Other fields: Admin only

**Read permissions:** Any authenticated user

### Caregiver Profile (`/caregivers/{id}`)

```json
{
  "name": "string (required, 1-200 chars)",
  "email": "string (required, valid email format)"
}
```

**Write permissions:** Admin only
**Read permissions:** Any authenticated user

### Activity Log (`/userLogs/{logId}`)

```json
{
  "action": "string (required, max 500 chars) - e.g. 'button_press', 'phrase_selected'",
  "timestamp": "number (required, epoch ms)",
  "targetUserId": "string (the AAC user the action relates to)",
  "carerId": "string (the caregiver who performed/recorded the action)",
  "userId": "string (legacy field, prefer targetUserId)"
}
```

**Write permissions:** Any authenticated user
**Read permissions:** Any authenticated user (filtered client-side by role)

**Note for mobile app:** Always populate both `targetUserId` and `carerId`. The `userId` field is maintained for backward compatibility but `targetUserId` is canonical.

### User Sync Status (`/userSync/{userId}`)

```json
{
  "lastActivity": "number (epoch ms)"
}
```

**Write permissions:** The user themselves or admin
**Read permissions:** Any authenticated user

**Note for mobile app:** Update this on each app session to show sync status in the dashboard.

### Fine-Tune Metrics (`/fineTuneMetrics/{metricId}`)

```json
{
  "epoch": "number (required)",
  "loss": "number",
  "accuracy": "number"
}
```

**Write permissions:** Admin only (typically written by backend training pipeline)
**Read permissions:** Any authenticated user

---

## Authentication Contract

### Firebase Custom Claims

Roles are set as Firebase Auth custom claims (server-side only):

```json
{
  "role": "admin" | "caregiver"
}
```

Set via Firebase Admin SDK:
```javascript
admin.auth().setCustomUserClaims(uid, { role: 'admin' });
```

The dashboard reads roles exclusively from `user.getIdTokenResult().claims.role`. It does NOT read roles from the Realtime Database (to prevent client-side role elevation).

### Cloud Function: `setUserPassword`

- **URL:** `https://europe-west1-{PROJECT_ID}.cloudfunctions.net/setUserPassword`
- **Method:** POST
- **Auth:** Bearer token (Firebase ID token with admin custom claim)
- **Body:** `{ "uid": "string", "newPassword": "string" }`
- **Responses:**
  - `200`: `{ "message": "Password updated successfully!" }`
  - `400`: Validation error
  - `401`: Missing/invalid auth token
  - `403`: Non-admin user
  - `404`: User not found
  - `405`: Wrong HTTP method
  - `500`: Internal error

---

## Settings / Preferences Contract

Currently no shared settings/preferences node exists. If the mobile app needs to sync user preferences:

**Proposed schema (`/userPreferences/{userId}`):**
```json
{
  "language": "string (BCP 47 tag, e.g. 'en-GB')",
  "voiceSpeed": "number (0.5-2.0)",
  "fontSize": "string ('small' | 'medium' | 'large')",
  "updatedAt": "number (epoch ms)"
}
```

This should be discussed with the mobile team before implementation.

---

## AI Telemetry / Suggestion Learning Contract

**Proposed schema (`/aiTelemetry/{userId}/{entryId}`):**
```json
{
  "suggestedPhrase": "string",
  "accepted": "boolean",
  "context": "string (previous phrase or category)",
  "timestamp": "number (epoch ms)"
}
```

The dashboard's FineTuneMetrics page displays aggregated training results. Individual telemetry is written by the mobile app and consumed by the backend training pipeline.

**Note:** TensorFlow.js packages are included in the client but no ML inference code exists in the dashboard yet. These packages should be removed from the client bundle until needed, or used for client-side model inference if planned.

---

## Release Blockers

| Item | Owner | Status |
|------|-------|--------|
| Rotate compromised service account keys | Ops/Admin | BLOCKED |
| Restrict API key in GCP Console | Ops/Admin | BLOCKED |
| Deploy database security rules | Ops/Admin | READY |
| Deploy updated Cloud Functions | Ops/Admin | READY |

## Non-Blocking Recommendations

| Item | Priority |
|------|----------|
| Set up CI/CD (GitHub Actions) | HIGH |
| Add Firebase App Check | MEDIUM |
| Add E2E tests (Cypress/Playwright) | MEDIUM |
| Remove unused TensorFlow.js packages | LOW |
| Consider invite-only signup flow | LOW |
| Add CSP headers via Firebase Hosting | LOW |
