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

## Known Limitations

1. **Log read filtering is client-side.** Caregivers can read all logs; scoping to assigned users happens in React. Server-side scoping would need data model restructuring.
2. **Caregiver self-assignment.** A caregiver can set `caregiverId` on any user to their own UID. This is by design for the Connect User flow.
3. **Logs not append-only.** An authenticated user can overwrite existing log entries. For production, add `.write: "!data.exists()"`.
