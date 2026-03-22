# Shared Data Contracts — Dashboard / Mobile / Backend

**Source of truth:** `src/shared/schema.js`
**Enforced by:** `database.rules.json` (server-side)
**Verified by:** `__tests__/schemaContractAlignment.test.js` (10 tests)
**Last validated:** 2026-03-22 — all alignment tests pass

---

## Overview

The CommAI platform has three consumers of the Realtime Database:

1. **Dashboard** (this repo) — admin/caregiver web UI
2. **Mobile app** (separate repo) — AAC user-facing app
3. **Backend pipeline** — ML training, metric writes

All three must agree on the schema below. If you change a field or path, update `src/shared/schema.js`, `database.rules.json`, and this document together.

---

## Database Paths

| Path | Read | Write | Consumers |
|------|------|-------|-----------|
| `/users/{uid}` | Any authenticated | Admin only | Dashboard, Mobile, Backend |
| `/users/{uid}/caregiverId` | Any authenticated | Admin OR self-assign | Dashboard, Mobile |
| `/caregivers/{id}` | Any authenticated | Admin only | Dashboard |
| `/userLogs/{logId}` | Any authenticated | Any authenticated | Dashboard, Mobile |
| `/userSync/{userId}` | Any authenticated | Self OR admin | Mobile, Dashboard |
| `/fineTuneMetrics/{metricId}` | Any authenticated | Admin only | Backend, Dashboard |

---

## Schemas

### `/users/{uid}`

| Field | Type | Required | Constraint | Notes |
|-------|------|----------|------------|-------|
| `name` | string | yes | 1–200 chars | Display name |
| `email` | string | yes | email regex | Account email |
| `role` | string | no | `admin` or `caregiver` | **Set via custom claims only** — never written from client |
| `caregiverId` | string \| null | no | — | UID of assigned caregiver |
| `createdAt` | number | no | epoch ms | Set on account creation |

### `/caregivers/{id}`

| Field | Type | Required | Constraint |
|-------|------|----------|------------|
| `name` | string | yes | 1–200 chars |
| `email` | string | yes | email regex |

### `/userLogs/{logId}`

| Field | Type | Required | Constraint | Notes |
|-------|------|----------|------------|-------|
| `action` | string | yes | max 500 chars | e.g. `button_press`, `phrase_selected` |
| `timestamp` | number | yes | epoch ms | — |
| `targetUserId` | string | no | — | The AAC user the action relates to |
| `carerId` | string | no | — | The caregiver who recorded it |
| `userId` | string | no | — | **Legacy** — prefer `targetUserId` |

**Mobile app guidance:** Always populate `targetUserId` and `carerId`. The `userId` field exists for backward compatibility.

### `/userSync/{userId}`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `lastActivity` | number | no | Epoch ms. Update on each mobile app session. |

### `/fineTuneMetrics/{metricId}`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `epoch` | number | yes | Training epoch number |
| `loss` | number | no | Training loss |
| `accuracy` | number | no | Training accuracy |

---

## Authentication Contract

Roles are stored as Firebase Auth **custom claims** (server-side only):

```json
{ "role": "admin" | "caregiver" }
```

Set via Admin SDK: `admin.auth().setCustomUserClaims(uid, { role: 'admin' })`

The dashboard reads roles from `user.getIdTokenResult().claims.role`. It does **not** read from `/users/{uid}/role` in the database. Database rules enforce this: all admin-gated write rules check `auth.token.role`, never `root.child(...)`.

---

## Cloud Function: `setUserPassword`

| Property | Value |
|----------|-------|
| Method | POST |
| Region | europe-west1 |
| Auth | Bearer token with `role === 'admin'` custom claim |
| Body | `{ "uid": "string", "newPassword": "string" }` |
| Password rules | 8+ chars, uppercase, lowercase, digit |

| Status | Meaning |
|--------|---------|
| 200 | Password updated |
| 400 | Validation error or self-password attempt |
| 401 | Missing/invalid auth token |
| 403 | Non-admin caller |
| 404 | User not found |
| 405 | Wrong HTTP method |
| 500 | Internal error (generic, no details leaked) |

---

## Automated Alignment Verification

`__tests__/schemaContractAlignment.test.js` verifies at CI time that:

- Every path in `DB_PATHS` has a matching top-level node in `database.rules.json`
- Every validated field in the rules has a corresponding entry in the schema
- Max lengths match between schema docs and rules (200 for names, 500 for actions)
- Role enums match

If this test breaks, schema and rules have diverged and must be reconciled.
