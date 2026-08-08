# Read this before touching the dashboard — 2026-08-08

An unattended audit ran overnight against both repos. **No dashboard code was
changed.** Every finding below is prepared, not applied, because each is
cross-repo or data-contract-touching and applying one side of a two-sided change
is how outages happen.

The three documents beside this one are copies from the app repo, kept here so
you do not need both checkouts open:

- `DATA-CONTRACT.md` — every RTDB path, who writes it, who reads it, and which
  ones are broken.
- `OVERNIGHT-2026-08-08-BACKLOG.md` — scored and tiered work list. Items B-1 to
  B-5 are the dashboard ones.
- `OVERNIGHT-2026-08-08-FINDINGS.md` — the raw audit output with file:line.

## The four things that matter

**1. Do not deploy `database.rules.json` from the app repo yet.** 67
emulator-backed tests now prove that the rules as written deny the dashboard
everything: no caregiver read tier exists, and six of the paths this app uses
(`alerts`, `favorites`, `customBoards`, `systemConfig`, `fineTuneMetrics`,
`sessions`) have no rule at all and fall through to a deny-all. Deploying takes
the dashboard offline, and because every call site swallows the failure into an
empty state it will look like a data problem rather than a rules problem.

**2. `setUserPassword` in `functions/index.js` is a public, unauthenticated
account-takeover endpoint.** No `context.auth`, no role check, no rate limit,
`cors({origin: true})`. Anyone who knows a uid — and uids are rendered
throughout this UI and appear in `/user-actions/:userId` URLs — can set any
account's password from a single curl. The hardened replacement in
`src/functions/index.js` is in the CRA source tree, is imported by nothing, and
does not parse (typographic quotes). So the locked one is the one that is not
running.

**3. Two service-account private keys are still in this repo's git history**
(`cdf18ec`, `8f9aa1e`). `git rm` does not remove a blob. An Admin SDK key
bypasses every security rule unconditionally. Revoking the key ids in GCP
Console → IAM → Service Accounts is the only step that actually stops this, and
nothing else in these documents matters while those keys are valid.

**4. `userLogs` is read at the wrong shape.** The app moved to
`userLogs/{uid}/{pushId}` on 2026-03-29; `Logs.js`, `Notifications.js`,
`AdminDashboard.js`, `CaregiverDashboard.js` and `UserActions.js` still treat it
as a flat map. Every log row renders `undefined`, and `CaregiverDashboard`'s
"active today" is permanently 0 — so a caregiver checking whether a non-speaking
person has communicated today is told *no* regardless of the truth.

## What did change here

Only `.github/workflows/ci.yml` — build and test on every PR. No secrets, no
deploy step.

Note for whenever you do deploy: this repo's `firebase.json` declares
`"codebase": "default"`, and so does the app repo's. A `firebase deploy` from
here replaces that codebase and will offer to delete all five of the app's Cloud
Functions, including the log-retention job. Give this one a distinct codebase
name first.
