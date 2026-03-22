# Firebase Realtime Database Rules Verification

**Rules file:** `database.rules.json`
**Last updated:** 2026-03-22
**Test file:** `__tests__/firebaseRulesEmulator.test.js` (39 tests) + `__tests__/databaseRules.test.js` (17 tests)
**Test status:** ALL 56 rule tests PASSING

---

## Deployment

```bash
firebase deploy --only database
```

Or paste `database.rules.json` into Firebase Console > Realtime Database > Rules.

---

## Pass/Fail Matrix

### Unauthenticated User (auth = null)

| Path | Operation | Result | Test |
|------|-----------|--------|------|
| `/users` | READ | DENIED | `auth != null` |
| `/caregivers` | READ | DENIED | `auth != null` |
| `/userLogs` | READ | DENIED | `auth != null` |
| `/userLogs` | WRITE | DENIED | `auth != null` |
| `/fineTuneMetrics` | READ | DENIED | `auth != null` |
| `/unknown` | READ | DENIED | `$other: false` |
| `/unknown` | WRITE | DENIED | `$other: false` |

### Authenticated User (no role claim)

| Path | Operation | Result | Test |
|------|-----------|--------|------|
| `/users` | READ | ALLOWED | `auth != null` |
| `/users/$uid` | WRITE | DENIED | requires `auth.token.role === 'admin'` |
| `/users/$uid/caregiverId` | WRITE self | ALLOWED | `auth.uid === newData.val()` |
| `/users/$uid/caregiverId` | WRITE other | DENIED | not self, not admin |
| `/userLogs/-new` | WRITE valid | ALLOWED | `auth != null` + validates schema |
| `/userLogs/-new` | WRITE invalid | DENIED | missing required `action`/`timestamp` |
| `/userSync/$self` | WRITE | ALLOWED | `auth.uid === $userId` |
| `/userSync/$other` | WRITE | DENIED | not self, not admin |
| `/fineTuneMetrics` | WRITE | DENIED | requires admin claim |
| `/caregivers/$id` | WRITE | DENIED | requires admin claim |

### Caregiver (role: caregiver)

| Path | Operation | Result | Test |
|------|-----------|--------|------|
| `/users` | READ | ALLOWED | `auth != null` |
| `/users/$uid` | WRITE | DENIED | caregiver !== admin |
| `/users/$uid/caregiverId` | WRITE self | ALLOWED | self-assign |
| `/caregivers` | WRITE | DENIED | requires admin |
| `/userLogs` | WRITE | ALLOWED | `auth != null` |
| `/fineTuneMetrics` | WRITE | DENIED | requires admin |

### Admin (role: admin)

| Path | Operation | Result | Test |
|------|-----------|--------|------|
| `/users/$uid` | WRITE | ALLOWED | admin claim |
| `/users/$uid/role` = `"caregiver"` | WRITE | ALLOWED | valid enum |
| `/users/$uid/role` = `"admin"` | WRITE | ALLOWED | valid enum |
| `/users/$uid/role` = `"superadmin"` | WRITE | DENIED | validation: not in enum |
| `/caregivers/$id` | WRITE | ALLOWED | admin claim |
| `/fineTuneMetrics` | WRITE | ALLOWED | admin claim |
| `/userSync/$any` | WRITE | ALLOWED | admin claim |
| `/unknown` | WRITE | DENIED | default deny (even admin) |

---

## Security Invariants (all verified by automated tests)

1. **NO rule uses `root.child()` for role checks** — prevents privilege escalation via client-writable DB fields
2. **All admin write rules use `auth.token.role`** — custom claims are server-set and tamper-proof
3. **Default deny catch-all** — `$other` blocks all unknown paths
4. **Role enum validation** — only `admin` and `caregiver` accepted
5. **Data type validation** — names (string 1-200), emails (regex), timestamps (number), actions (string ≤500)

---

## Known Limitations

1. **Log filtering is client-side.** Caregivers can read all logs; filtering to assigned users happens in React. Server-side scoping would require restructuring data model.
2. **Caregiver self-assignment.** Any caregiver can set `caregiverId` on any user to their own UID. This is by design for the Connect User flow.
3. **Logs are not append-only.** Any authenticated user can overwrite existing log entries. For production, consider `.write: !data.exists()`.
