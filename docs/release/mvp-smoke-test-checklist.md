# Voice Dashboard — MVP Smoke Test Checklist

**Version:** MVP 1.0
**Date:** 2026-03-30

Run this checklist before and after each deployment.

---

## Prerequisites

- [ ] `npm start` runs without errors on `http://localhost:3000`
- [ ] `.env.local` has all required Firebase config values
- [ ] At least one admin account exists with custom claim `role: admin`
- [ ] At least one caregiver account exists with `role: caregiver` in database
- [ ] At least one user assigned via `/caregiverAssignments/{caregiverUid}/{userUid}: true`

---

## 1. Login Flow

| # | Test | Expected | Pass |
|---|------|----------|------|
| 1.1 | Open `/` | Login page shows Voice branding | [ ] |
| 1.2 | Login with wrong password | Error message, stays on login | [ ] |
| 1.3 | Login as admin | Redirects to `/admin` | [ ] |
| 1.4 | Login as caregiver | Redirects to `/caregiver` | [ ] |
| 1.5 | Click Sign Out | Returns to login page | [ ] |

## 2. Caregiver Dashboard — User Selector

| # | Test | Expected | Pass |
|---|------|----------|------|
| 2.1 | Caregiver with 0 assigned users | "No users assigned" alert | [ ] |
| 2.2 | Caregiver with 1+ assigned users | User cards shown, first auto-selected | [ ] |
| 2.3 | Click a different user card | Card highlights, data refreshes with skeletons | [ ] |
| 2.4 | Selected user shows name + email + sync status | All three visible | [ ] |

## 3. Caregiver Dashboard — Date Filter

| # | Test | Expected | Pass |
|---|------|----------|------|
| 3.1 | Default "7 days" selected | Stats reflect last 7 days | [ ] |
| 3.2 | Switch to "30 days" | Stats update, event count changes | [ ] |
| 3.3 | Switch to "All time" | All events shown | [ ] |
| 3.4 | Switch to "Custom" | Date pickers appear | [ ] |
| 3.5 | Set custom From/To range | Stats and table filter to range | [ ] |

## 4. Caregiver Dashboard — Stats & Insights

| # | Test | Expected | Pass |
|---|------|----------|------|
| 4.1 | With activity data | Stat cards show numbers, not zero | [ ] |
| 4.2 | With no activity data | Stat cards show 0, sections show empty states | [ ] |
| 4.3 | Usage trend chart | Appears when 2+ days of data exist | [ ] |
| 4.4 | Most Used Words section | Chips shown if data exists | [ ] |
| 4.5 | Missing Searched Words section | Chips shown if data exists | [ ] |
| 4.6 | Custom Vocabulary section | Chips shown if data exists | [ ] |
| 4.7 | Frequent Phrases section | List shown if data exists | [ ] |

## 5. Caregiver Dashboard — Exports

| # | Test | Expected | Pass |
|---|------|----------|------|
| 5.1 | Click "Report" button | Downloads `{name}-insights-{range}.csv` | [ ] |
| 5.2 | Open CSV | Has Report header (user, date range, generated timestamp) | [ ] |
| 5.3 | Click "Export" on activity table | Downloads `{name}-activity-{range}.csv` | [ ] |
| 5.4 | Open CSV | Columns: date, action, word, phrase, details | [ ] |
| 5.5 | Click download on vocabulary | Downloads `{name}-vocabulary.csv` | [ ] |
| 5.6 | Click copy on any insight section | Snackbar confirms copy | [ ] |
| 5.7 | Paste clipboard content | Correct word (count) list | [ ] |

## 6. Caregiver Dashboard — Loading & Error States

| # | Test | Expected | Pass |
|---|------|----------|------|
| 6.1 | Initial page load | Skeleton cards while assignments load | [ ] |
| 6.2 | Switch users | Skeletons in all sections during load | [ ] |
| 6.3 | Disconnect network, click refresh | Error states with retry buttons | [ ] |
| 6.4 | Click retry after reconnecting | Data loads successfully | [ ] |

## 7. Access Control (Server-Enforced)

| # | Test | Expected | Pass |
|---|------|----------|------|
| 7.1 | Caregiver navigates to `/admin` | Redirected to `/caregiver` | [ ] |
| 7.2 | Caregiver navigates to `/user-management` | Redirected to `/caregiver` | [ ] |
| 7.3 | Caregiver navigates to `/connect-user` | "Admin-only" message | [ ] |
| 7.4 | Console: `firebase.database().ref('users').once('value')` | PERMISSION_DENIED | [ ] |
| 7.5 | Console: read unassigned user's data | PERMISSION_DENIED | [ ] |

## 8. Admin Flows (Quick Check)

| # | Test | Expected | Pass |
|---|------|----------|------|
| 8.1 | Admin dashboard loads | Stats, charts, filters visible | [ ] |
| 8.2 | User Management loads | User list with caregiver assignment | [ ] |
| 8.3 | Assign Users page loads | Caregiver dropdown + unassigned users | [ ] |
| 8.4 | Assign a user to a caregiver | Toast confirms, user disappears from list | [ ] |

## 9. Production Deploy Verification

| # | Test | Expected | Pass |
|---|------|----------|------|
| 9.1 | `https://commai-b98fe.web.app` loads | Login page | [ ] |
| 9.2 | Direct URL `https://commai-b98fe.web.app/caregiver` | Login page (not 404) | [ ] |
| 9.3 | Browser tab shows "Voice Dashboard" | Correct title | [ ] |
| 9.4 | Login works end-to-end | Correct dashboard per role | [ ] |

---

## Result

| Category | Pass | Fail |
|----------|------|------|
| Login | /5 | |
| User Selector | /4 | |
| Date Filter | /5 | |
| Stats & Insights | /7 | |
| Exports | /7 | |
| Loading & Error | /4 | |
| Access Control | /5 | |
| Admin Flows | /4 | |
| Production Deploy | /4 | |
| **Total** | **/45** | |

**GO / NO-GO:** ___________
**Tester:** ___________
**Date:** ___________
