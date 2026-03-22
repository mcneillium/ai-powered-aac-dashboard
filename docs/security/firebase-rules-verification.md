# Firebase Realtime Database Rules Verification

**Rules file:** `database.rules.json` (96 lines)
**Test suites:** `__tests__/databaseRules.test.js` (17 tests), `__tests__/firebaseRulesEmulator.test.js` (39 tests)
**Last run:** 2026-03-22 — **56 tests, ALL PASSING**

---

## Deployment

```bash
firebase deploy --only database
```

Or paste contents of `database.rules.json` into Firebase Console → Realtime Database → Rules.

**Status:** Rules file exists and is configured in `firebase.json`. Deployment requires Firebase CLI + authentication.

---

## Design Invariants (all verified by automated tests)

| Invariant | Test evidence |
|-----------|---------------|
| No rule uses `root.child()` for role checks | `databaseRules.test.js`: "user write rules do NOT reference database role field" |
| All admin write rules use `auth.token.role` | `databaseRules.test.js`: "fineTuneMetrics write rules use custom claims" |
| Default deny on unknown paths | `firebaseRulesEmulator.test.js`: "/unknown WRITE → DENIED (even admin)" |
| Role field accepts only `admin` or `caregiver` | `databaseRules.test.js`: "role validation only allows admin or caregiver" |
| Log entries require `action` + `timestamp` | `firebaseRulesEmulator.test.js`: "/userLogs WRITE missing action → DENIED" |

---

## Pass/Fail Matrix

### Unauthenticated (auth = null)

| Path | Op | Result | Tested |
|------|----|--------|--------|
| `/users` | READ | DENIED | yes |
| `/caregivers` | READ | DENIED | yes |
| `/userLogs` | READ | DENIED | yes |
| `/userLogs` | WRITE | DENIED | yes |
| `/fineTuneMetrics` | READ | DENIED | yes |
| `/unknown` | READ | DENIED | yes |
| `/unknown` | WRITE | DENIED | yes |

### Authenticated (no role claim)

| Path | Op | Result | Tested |
|------|----|--------|--------|
| `/users` | READ | ALLOWED | yes |
| `/users/$uid` | WRITE | DENIED | yes |
| `/users/$uid/caregiverId` | WRITE self | ALLOWED | yes |
| `/userLogs` | WRITE valid | ALLOWED | yes |
| `/userLogs` | WRITE invalid | DENIED | yes |
| `/userSync/$self` | WRITE | ALLOWED | yes |
| `/userSync/$other` | WRITE | DENIED | yes |
| `/fineTuneMetrics` | WRITE | DENIED | yes |
| `/caregivers/$id` | WRITE | DENIED | yes |

### Caregiver (role: caregiver)

| Path | Op | Result | Tested |
|------|----|--------|--------|
| `/users` | READ | ALLOWED | yes |
| `/users/$uid` | WRITE | DENIED | yes |
| `/users/$uid/caregiverId` | WRITE self | ALLOWED | yes |
| `/caregivers` | WRITE | DENIED | yes |
| `/userLogs` | WRITE | ALLOWED | yes |
| `/fineTuneMetrics` | WRITE | DENIED | yes |

### Admin (role: admin)

| Path | Op | Result | Tested |
|------|----|--------|--------|
| `/users/$uid` | WRITE | ALLOWED | yes |
| `/users/$uid/role = "caregiver"` | WRITE | ALLOWED | yes |
| `/users/$uid/role = "admin"` | WRITE | ALLOWED | yes |
| `/users/$uid/role = "superadmin"` | WRITE | DENIED | yes |
| `/caregivers/$id` | WRITE | ALLOWED | yes |
| `/fineTuneMetrics` | WRITE | ALLOWED | yes |
| `/userSync/$any` | WRITE | ALLOWED | yes |
| `/unknown` | WRITE | DENIED | yes |

### Validation

| Field | Constraint | Tested |
|-------|-----------|--------|
| `users/$uid/name` | string, 1–200 chars | yes |
| `users/$uid/email` | string, email regex | yes |
| `users/$uid/createdAt` | number | yes |
| `userLogs/$logId/action` | string, ≤500 chars | yes |
| `userLogs/$logId/timestamp` | number, required | yes |
| `fineTuneMetrics/$id/epoch` | number, required | yes |

---

## Live Deploy Verification

After running `firebase deploy --only database --project commai-b98fe`:

### Quick checks (curl)

```bash
DB_URL="https://commai-b98fe-default-rtdb.europe-west1.firebasedatabase.app"

# 1. Unauthenticated read — must be denied
curl -s "$DB_URL/users.json"
# Expected: {"error":"Permission denied"}

# 2. Write to unknown path — must be denied (default-deny catch-all)
curl -s -X PUT -d '"test"' "$DB_URL/doesNotExist.json"
# Expected: {"error":"Permission denied"}

# 3. Authenticated read (replace TOKEN with a valid Firebase ID token)
curl -s "$DB_URL/users.json?auth=TOKEN"
# Expected: JSON object of users (or {} if empty)
```

### Console checks

1. Firebase Console → Realtime Database → **Rules** tab
2. Verify the rules JSON matches `database.rules.json` in this repo exactly
3. Confirm the `$other` catch-all shows `.read: false, .write: false`
4. Confirm `users.$uid.role` has `.validate` restricting to `admin` or `caregiver`

### Role-based write checks

Use the Firebase Console **Data** tab or the REST API with a valid token:

| Action | Expected result |
|--------|----------------|
| Write to `/users/{uid}/name` as admin | Succeeds |
| Write to `/users/{uid}/name` as caregiver | Permission denied |
| Write to `/users/{uid}/role` with value `superadmin` as admin | Validation failed |
| Write to `/fineTuneMetrics/{id}` as caregiver | Permission denied |
| Write to `/userSync/{ownUid}` as caregiver | Succeeds |
| Write to `/userSync/{otherUid}` as caregiver | Permission denied |

---

## Known Limitations

1. **Log read filtering is client-side.** Caregivers can read all logs; scoping to assigned users happens in React. Server-side scoping would need data model restructuring.
2. **Caregiver self-assignment.** A caregiver can set `caregiverId` on any user to their own UID. This is by design for the Connect User flow.
3. **Logs not append-only.** An authenticated user can overwrite existing log entries. For production, add `.write: "!data.exists()"`.
