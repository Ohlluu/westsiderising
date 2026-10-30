# Westside Rising — Project Guide

Context for any AI coding agent working in this repo. Read this before changing anything.

---

## 1. Critical facts

- **Repo path:** `/Users/user/wr` — remote `github.com/Ohlluu/westsiderising.git`
- **`/Users/user/websites/wr` is NOT this project.** It is an abandoned Express/SQLite
  prototype. Nothing there is deployed. Ignore it entirely.
- **Deploying is `git push origin main`.** GitHub Pages serves `main` from the **repo
  root** and publishes to westsiderising.org in 1–2 minutes. There is no staging and no
  preview. A push is a production release.
- `vercel.json`, `server.js`, `server-serverless.js` and the `public/` directory are
  **dead leftovers**. Editing them changes nothing on the live site.
- **No build step, no bundler, no tests.** Plain HTML at the repo root plus
  `assets/js` and `assets/css`. Edit the file, push, done.
- GitHub Pages serves clean URLs: `about.html` is reachable at `/about`. Internal links
  use the extensionless form (`href="about"`).

## 2. Stack

- Static HTML/CSS/vanilla JS. No framework.
- **Firebase** project `westside-rising` — Auth + Firestore.
- Uses the **compat SDK** (`firebase-app-compat.js`, `firebase-auth-compat.js`,
  `firebase-firestore-compat.js`), which exposes globals `firebase`, `auth`, `db`.
  **Do not mix in the modular v9+ SDK** — it will not interoperate.
  (`assets/js/firebase-config.js` is the modular version and is used only by a few
  standalone form scripts. Follow whatever the file you are editing already uses.)
- Cloud Functions in `functions/` handle Twilio SMS. Deployed separately via
  `firebase deploy --only functions`. Leave alone unless asked.

## 3. Roles and permissions

Roles live in Firestore at `users/{uid}.role`: `superadmin`, `manager`, `employee`.
**Nobody's identity is hardcoded.** Dr. Angelique Orr is the superadmin by virtue of her
role field. (`NKOYA_UID` in `contracts.js` is a staff member with a custom contract — not
an admin.)

**Hiding a tab in JavaScript is not security.** Anyone can un-hide it in DevTools. The
Firestore rules are the only real enforcement. Any permission change must be made in the
rules too, or it is cosmetic.

## 4. Firestore rules

`FIRESTORE-RULES.md` is the source of truth. `FIRESTORE-SECURITY-RULES.md` is **stale** —
it predates the `contracts` collection. Delete it or ignore it.

Rules are **not** deployed from this repo. They must be pasted by hand into
Firebase Console → Firestore Database → Rules → Publish. After changing
`FIRESTORE-RULES.md`, tell the user to publish it, or the change does nothing.

Rules-syntax gotchas learned the hard way:
- `map.get(key, default)` with a **map literal default** like `{}` is rejected. Use
  `'key' in map` membership checks instead.
- Declare all `function`s above the `match` blocks.
- Rules are a **permissive union**: `allow read, write: if isSuperAdmin()` already grants
  delete, so a later `allow delete: if false` does not revoke it for superadmin.

> ⚠️ **Outstanding:** the contractor collections are in `FIRESTORE-RULES.md` but have
> **not been published** to Firebase. Until the user does that, the Contractors tab shows
> an error and contractor links fail at verification.

## 5. The three signing systems

Three separate document-signing flows. They look similar and are easy to confuse.

| | Employees | Board of Directors | Contractors |
|---|---|---|---|
| Entry point | `time-clock.html` → **Onboarding** tab | `board.html` (unlisted) | `contractor.html` (unlisted) |
| Admin view | same tab, superadmin sees roster | **BOD** tab, superadmin only | **Contractors** tab, superadmin only |
| Auth | real Firebase account | anonymous + private code | anonymous + private code |
| Order | WR signs first, then staff | director signs alone | contractor signs, then WR countersigns |
| Collections | `contracts/{uid}` | `boardMembers` / `boardContracts` | `contractorMembers` / `contractorContracts` |
| Code | `assets/js/contracts.js` | `board-*.js`, `bod-admin.js` | `contractor-*.js` |

**The access-code model (board + contractors):** the code **is** the Firestore document
ID — 24 random chars. Rules grant anonymous users `get` (one doc by exact ID) but never
`list`, so codes cannot be enumerated. The link is the credential; anyone it is forwarded
to can sign as that person. This is inherent to signing without accounts.

`board.html` and `contractor.html` each initialise a **named secondary Firebase app**
(`firebase.initializeApp(config, 'board')`) with SESSION persistence, so the anonymous
session never leaks into the staff portal's LOCAL-persistence session. `timeclock-dashboard.js`
also rejects `user.isAnonymous` outright. Preserve both guards.

Documents are **pluggable builder functions**. `assets/js/board-documents.js` holds the
shared helpers (`bdEscape`, `bdField`, `bdDateField`, `bdStaticHTML`, `bdDownloadPDF`)
that the contractor files also depend on — it must load **before** them.

Signed documents are frozen in the rules via `boardSignaturesImmutable()` /
`contractorSignaturesImmutable()`, which **hardcode their document IDs**. Adding a
document to `BOARD_DOCS` or `CONTRACTOR_DOCS` requires adding a matching
`...DocPreserved('<id>')` line to the rules, or that signature will not be frozen.

## 6. Gotchas that have already caused bugs

- **`assets/images/WR logo.jpg` has a space in the filename.** Reference it as
  `WR%20logo.jpg`. There is no `logo.jpg`; guessing that name shipped a broken header.
- **`cloneNode()` does not copy current form state.** A `<select>` the user changed, or
  text typed but not saved, clones back empty. `bdStaticHTML()` reads live values first —
  use it for any print or PDF path.
- **`.btn` sets `overflow: hidden`.** A flex button with `flex-basis: 0` and
  `min-width: 0` will shrink below its label and **clip the text** instead of wrapping.
  Use `min-width: max-content`.
- **Dates:** `new Date('2026-06-03')` parses as UTC and renders as June 2 in Chicago.
  Parse date-only strings into local time (see `bdFormatDateValue`).
- **Cache busting:** JS is versioned in the HTML (`script.js?v=3`) — bump it after every
  change. **CSS is not versioned**, so CSS edits need a hard refresh to show up.
- The nav bar and footer are **duplicated in all 28 HTML pages**. A nav change is a
  28-file find-and-replace, not a one-file edit.
- Beware `perl -CSD -i` on these files — it double-encoded UTF-8 and produced `SoirÃ©e`.
  Prefer plain ASCII in replacements.

## 7. Public forms and spam

Nine collections accept writes from the open internet: `events`, `volunteerApplications`,
`partnershipApplications`, `joinTeamApplications`, `youngLeadersApplications`,
`powerLabApplications`, `communityVoicesSurveys`, `assessmentSubmissions`, `subscribers`.

Eight require only `status == 'new'`; `subscribers` is `allow create: if true`. There is
**no captcha, honeypot, rate limiting, or field validation anywhere.** Because Firestore
has a public REST API, a bot does not even need to load the site — form-side protection
alone is bypassable.

The user has reported real spam submissions and has agreed in principle to fixing this,
but **no work has started**. The recommended approach, in order: validate required fields
in the rules, add a honeypot plus a minimum fill time, then enable **Firebase App Check**
(the only one of the three that closes the direct-REST-API hole).

## 8. Known open work

1. **Publish the contractor Firestore rules** (section 4).
2. **2026 awardees** on `annual-soiree.html`. Follow the `#year-2025` panel as the
   template: `awardees-showcase` (intro + video), then `award-category` blocks of
   `awardee-card`s. Still needed from the user: award categories, who won what, bios,
   individual photos, and the video file. Note `awards.js` grabs the video by
   `getElementById('awardees-video')` — a **single ID**, so a second year's video needs
   that switched to a class.
3. **Spam prevention** (section 7).
4. The Conflict of Interest text in `board-documents.js` is a **draft** written from the
   organisation's own Bylaws Article VI. It has not been reviewed by counsel.

## 9. Working style the user expects

- **Do not over-explore.** The user is cost-sensitive and has said so repeatedly. Go
  straight to the relevant file. Do not re-read files you just wrote.
- **Push when asked, not before.** Commit to `main` and push directly — the user has
  explicitly rejected branch/preview workflows as friction.
- **Ask only when the answer changes the work.** The user has pushed back on
  multi-question check-ins. Make the routine call yourself, state the assumption, move on.
- **Verify filenames before referencing them.** Guessing has shipped broken images twice.
