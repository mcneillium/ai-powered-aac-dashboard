# Firebase Realtime Database Rules Verification

**Rules file:** `database.rules.json`
**Last updated:** 2026-03-21
**Deployment command:** `firebase deploy --only database`
**Manual alternative:** Paste into Firebase Console > Realtime Database > Rules

---

## Deployment Status

- [ ] Rules deployed to Firebase project
- [ ] Rules verified in Firebase Console Rules Playground
- [ ] All test scenarios below pass

**Deploy instructions:**
```bash
# Ensure Firebase CLI is installed and authenticated
npm install -g firebase-tools
firebase login

# Deploy database rules only
firebase deploy --only database

# Verify in console
firebase database:get /  # should require auth
```

---

## Design Principles

1. **Custom claims only.** All write authorization uses `auth.token.role`, never `root.child(...)` database reads. This prevents privilege escalation via client-writable database fields.
2. **Default deny.** The `$other` catch-all rule denies read/write to any path not explicitly listed.
3. **Read: authenticated only.** All data nodes require `auth != null` for reads. No anonymous access.
4. **Write: least privilege.** Each node has the most restrictive write rule that allows the application to function.

---

## Test Scenarios

### Scenario 1: Unauthenticated User (auth = null)

| Path | Operation | Expected | Rule |
|------|-----------|----------|------|
| `/users` | READ | DENIED | `.read: auth != null` |
| `/users/uid123` | READ | DENIED | `.read: auth != null` |
| `/users/uid123/name` | WRITE | DENIED | `.write: auth != null && ...` |
| `/caregivers` | READ | DENIED | `.read: auth != null` |
| `/userLogs` | READ | DENIED | `.read: auth != null` |
| `/userLogs` | WRITE | DENIED | `.write: auth != null` |
| `/userSync/uid123` | READ | DENIED | `.read: auth != null` |
| `/fineTuneMetrics` | READ | DENIED | `.read: auth != null` |
| `/secretPath` | READ | DENIED | `$other: .read: false` |
| `/secretPath` | WRITE | DENIED | `$other: .write: false` |

**Verification method:** Firebase Console Rules Playground > simulate with "Unauthenticated"

---

### Scenario 2: Authenticated User (no role claim)

Auth token: `{ uid: "user-norole", token: { } }`

| Path | Operation | Expected | Reason |
|------|-----------|----------|--------|
| `/users` | READ | ALLOWED | `auth != null` satisfied |
| `/users/uid123` | WRITE `{name:"Test"}` | DENIED | `auth.token.role === 'admin'` fails (no role) |
| `/users/uid123/role` | WRITE `"admin"` | DENIED | Parent write rule fails |
| `/users/uid123/caregiverId` | WRITE `"user-norole"` | ALLOWED | Self-assign: `auth.uid === newData.val()` |
| `/users/uid123/caregiverId` | WRITE `"other-user"` | DENIED | `auth.uid !== newData.val()` and no admin role |
| `/caregivers/cg1` | WRITE `{name:"Test"}` | DENIED | `auth.token.role === 'admin'` fails |
| `/userLogs/-newId` | WRITE `{action:"tap",timestamp:123}` | ALLOWED | `auth != null` + valid schema |
| `/userLogs/-newId` | WRITE `{action:"tap"}` | DENIED | Missing `timestamp` (validation) |
| `/userSync/user-norole` | WRITE `{lastActivity:123}` | ALLOWED | `auth.uid === $userId` |
| `/userSync/other-user` | WRITE `{lastActivity:123}` | DENIED | Not own UID and no admin role |
| `/fineTuneMetrics/m1` | WRITE `{epoch:1}` | DENIED | `auth.token.role === 'admin'` fails |

---

### Scenario 3: Caregiver Role

Auth token: `{ uid: "carer-1", token: { role: "caregiver" } }`

| Path | Operation | Expected | Reason |
|------|-----------|----------|--------|
| `/users` | READ | ALLOWED | `auth != null` |
| `/users/uid123` | WRITE `{name:"Test",email:"t@t.com"}` | DENIED | `auth.token.role !== 'admin'` |
| `/users/uid123/role` | WRITE `"admin"` | DENIED | Not admin |
| `/users/uid123/caregiverId` | WRITE `"carer-1"` | ALLOWED | Self-assign |
| `/users/uid123/caregiverId` | WRITE `"other-carer"` | DENIED | Not self, not admin |
| `/caregivers` | READ | ALLOWED | `auth != null` |
| `/caregivers/cg1` | WRITE `{name:"New"}` | DENIED | Not admin |
| `/caregivers/cg1` | DELETE | DENIED | Not admin |
| `/userLogs/-newId` | WRITE `{action:"phrase_select",timestamp:123}` | ALLOWED | Auth + valid |
| `/userLogs/-newId` | WRITE `{action:"x".repeat(501),timestamp:1}` | DENIED | Action > 500 chars |
| `/userSync/carer-1` | WRITE `{lastActivity:999}` | ALLOWED | Own UID |
| `/fineTuneMetrics/m1` | WRITE `{epoch:1}` | DENIED | Not admin |
| `/randomPath` | READ | DENIED | Default deny |

---

### Scenario 4: Admin Role

Auth token: `{ uid: "admin-1", token: { role: "admin" } }`

| Path | Operation | Expected | Reason |
|------|-----------|----------|--------|
| `/users` | READ | ALLOWED | `auth != null` |
| `/users/uid123` | WRITE `{name:"New",email:"n@e.com",createdAt:123}` | ALLOWED | Admin |
| `/users/uid123/role` | WRITE `"caregiver"` | ALLOWED | Admin + valid enum |
| `/users/uid123/role` | WRITE `"superadmin"` | DENIED | Validation: not in enum |
| `/users/uid123/role` | WRITE `123` | DENIED | Validation: not string |
| `/users/uid123/caregiverId` | WRITE `"any-carer"` | ALLOWED | Admin |
| `/users/uid123/caregiverId` | WRITE `null` | ALLOWED | Admin, null valid |
| `/users/uid123/name` | WRITE `""` | DENIED | Validation: length > 0 |
| `/users/uid123/email` | WRITE `"notanemail"` | DENIED | Validation: regex |
| `/caregivers/cg1` | WRITE `{name:"Dr. Smith",email:"d@s.com"}` | ALLOWED | Admin |
| `/caregivers/cg1` | DELETE | ALLOWED | Admin |
| `/userLogs/-newId` | WRITE `{action:"admin_action",timestamp:123}` | ALLOWED | Auth + valid |
| `/userSync/any-user` | WRITE `{lastActivity:999}` | ALLOWED | Admin |
| `/fineTuneMetrics/m1` | WRITE `{epoch:5,loss:0.2,accuracy:0.95}` | ALLOWED | Admin + valid |
| `/fineTuneMetrics/m1` | WRITE `{loss:0.2}` | DENIED | Missing required `epoch` |
| `/randomPath` | WRITE `"test"` | DENIED | Default deny (even admin) |

---

## Validation Rules Summary

| Field | Type | Constraints |
|-------|------|-------------|
| `users/$uid/role` | string | Must be `"admin"` or `"caregiver"` |
| `users/$uid/name` | string | 1-200 characters |
| `users/$uid/email` | string | Must match `/^[^@]+@[^@]+$/` |
| `users/$uid/createdAt` | number | epoch milliseconds |
| `users/$uid/caregiverId` | string or null | — |
| `caregivers/$id/name` | string | 1-200 characters |
| `caregivers/$id/email` | string | Must match email regex |
| `userLogs/$id/action` | string | Max 500 characters |
| `userLogs/$id/timestamp` | number | Required |
| `userSync/$userId/lastActivity` | number | — |
| `fineTuneMetrics/$id/epoch` | number | Required |
| `fineTuneMetrics/$id/loss` | number | — |
| `fineTuneMetrics/$id/accuracy` | number | — |

---

## Known Limitations

1. **No per-caregiver log filtering at rules level.** Caregivers can read all logs; filtering to their assigned users is done client-side. A server-side query filter could enforce this, but would require restructuring the data model (e.g., `/userLogs/$userId/` nesting).

2. **Caregiver self-assignment to any user.** A caregiver can set `caregiverId` to their own UID on any user record. This is by design for the Connect User flow, but means caregivers can connect to users they shouldn't. Consider adding an admin-approval workflow for production.

3. **Log entries are append-only but not truly immutable.** Any authenticated user can overwrite an existing log entry. For production, consider adding `.write: !data.exists()` to make logs append-only.

---

## Post-Deployment Verification Steps

```bash
# 1. Deploy rules
firebase deploy --only database

# 2. Open Firebase Console Rules Playground
# 3. Run each scenario above in the simulator
# 4. Mark checkboxes in this document as verified
# 5. Test from the running dashboard:
#    a. Login as admin — verify full CRUD works
#    b. Login as caregiver — verify read-only on users/caregivers
#    c. Logout — verify all reads fail
```
