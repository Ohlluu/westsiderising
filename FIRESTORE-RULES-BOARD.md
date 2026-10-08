# Firestore Rules — Board of Directors

This is your **current live ruleset** with two new collections added at the bottom:
`boardMembers` and `boardContracts`. Nothing above them was changed, so pasting this
whole block will not affect the Onboarding tab, timesheets, or any existing form.

> `FIRESTORE-SECURITY-RULES.md` in this repo is **stale** — it predates the `contracts`
> collection. Use this file instead.

---

## Before you publish: enable Anonymous Auth

Board members have no accounts, but every Firestore rule requires `request.auth != null`.
`board.html` signs the browser in anonymously purely to satisfy that — no email, no
password, no account is created for the director.

1. Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Anonymous**

**If you skip this step, no board member will be able to open their link.**

---

## How access works

The access code **is** the Firestore document ID in `boardMembers`. That makes it an
unguessable capability — 24 random characters from a 31-character alphabet.

The security turns on a distinction in Firestore rules:

- `allow get` — fetch **one** document, by exact ID
- `allow list` — **query** the collection
- `allow read` — grants **both**

Board members get `get` only. They can open the document whose ID they already know,
and they cannot enumerate the collection to discover anyone else's code. Dr. Orr gets
full `read`, so she can list the roster.

---

## Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSuperAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin';
    }

    function isManagerOrAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager', 'superadmin'];
    }

    function isAuthenticated() {
      return request.auth != null;
    }

    match /events/{eventId} {
      allow read: if true;
      allow create: if request.resource.data.status == 'pending';
      allow update, delete: if isManagerOrAdmin();
    }

    match /volunteerApplications/{docId} {
      allow create: if request.resource.data.status == 'new';
      allow read, update, delete: if isManagerOrAdmin();
    }

    match /partnershipApplications/{docId} {
      allow create: if request.resource.data.status == 'new';
      allow read, update, delete: if isManagerOrAdmin();
    }

    match /joinTeamApplications/{docId} {
      allow create: if request.resource.data.status == 'new';
      allow read, update, delete: if isManagerOrAdmin();
    }

    match /youngLeadersApplications/{docId} {
      allow create: if request.resource.data.status == 'new';
      allow read, update, delete: if isManagerOrAdmin();
    }

    match /powerLabApplications/{docId} {
      allow create: if request.resource.data.status == 'new';
      allow read, update, delete: if isManagerOrAdmin();
    }

    match /communityVoicesSurveys/{docId} {
      allow create: if request.resource.data.status == 'new';
      allow read, update, delete: if isManagerOrAdmin();
    }

    match /assessmentSubmissions/{docId} {
      allow create: if request.resource.data.status == 'new';
      allow read, update, delete: if isManagerOrAdmin();
    }

    match /subscribers/{docId} {
      allow create: if true;
      allow read, update, delete: if isManagerOrAdmin();
    }

    match /users/{userId} {
      allow read: if request.auth.uid == userId || isSuperAdmin();
      allow write: if isSuperAdmin();
    }

    match /timeEntries/{entryId} {
      allow read: if resource.data.userId == request.auth.uid || isSuperAdmin();
      allow create: if (request.auth.uid != null && request.resource.data.userId == request.auth.uid) || isSuperAdmin();
      allow update: if resource.data.userId == request.auth.uid || isSuperAdmin();
      allow delete: if isSuperAdmin();
    }

    match /currentStatus/{userId} {
      allow read, write: if request.auth.uid == userId || isSuperAdmin();
    }

    match /contracts/{staffUid} {
      allow read, write: if isSuperAdmin();
      allow read: if isAuthenticated() && request.auth.uid == staffUid;
      allow update: if isAuthenticated() && request.auth.uid == staffUid;
    }

    // ==================== BOARD OF DIRECTORS ====================
    // Document ID is the director's private access code.

    function boardCodeIsActive(code) {
      return exists(/databases/$(database)/documents/boardMembers/$(code))
          && get(/databases/$(database)/documents/boardMembers/$(code)).data.get('revoked', false) != true;
    }

    // A signed document can never be altered again — not by the director, and not
    // by a replayed request. Compares the incoming map against the stored map for
    // every document that is already marked signed.
    function boardDocPreserved(docId) {
      return resource.data.get('documents', {}).get(docId, {}).get('signed', false) != true
          || request.resource.data.get('documents', {}).get(docId, {})
             == resource.data.get('documents', {}).get(docId, {});
    }

    function boardSignaturesImmutable() {
      return boardDocPreserved('bsa')
          && boardDocPreserved('nda')
          && boardDocPreserved('coi');
    }

    match /boardMembers/{code} {
      // Dr. Orr: full management, including listing the roster.
      allow read, write: if isSuperAdmin();

      // A director holding the exact code may fetch that one document.
      // `get` does not imply `list`, so codes cannot be enumerated.
      allow get: if isAuthenticated();
    }

    match /boardContracts/{code} {
      // Dr. Orr: full read and write across all board records.
      allow read, write: if isSuperAdmin();

      // The director holding an active code may read and fill in their own record.
      allow get:    if isAuthenticated() && boardCodeIsActive(code);
      allow create: if isAuthenticated() && boardCodeIsActive(code);
      allow update: if isAuthenticated() && boardCodeIsActive(code)
                       && boardSignaturesImmutable();

      // Nobody deletes board records from the client.
      allow delete: if false;
    }

  }
}
```

---

## What this does and does not protect

**Protected**

- Board records are invisible to managers and employees — only `isSuperAdmin()` can
  read or list them.
- Codes cannot be enumerated: anonymous users have `get` but never `list`.
- A signed document is frozen. `boardSignaturesImmutable()` rejects any update that
  alters a document already marked `signed`, so a director cannot revise an executed
  agreement and a replayed request cannot overwrite one.
- Revoking a code blocks all further reads and writes immediately, while preserving
  everything already signed.
- Board records cannot be deleted from the browser at all.

**Not protected — worth knowing**

- The link is the credential. Anyone a director forwards their link to can sign as
  that director. That is inherent to signing without accounts; it is why each person
  gets a separate code and why the copy-link dialog warns against forwarding.
- `boardSignaturesImmutable()` hardcodes the three document IDs. **If you add a fourth
  document to `BOARD_DOCS` in `assets/js/board-documents.js`, add a matching
  `boardDocPreserved('<id>')` line here**, or that document's signature will not be
  frozen.
- A typed-name signature is not a cryptographic signature. It matches how your
  employee contracts already work and is generally sufficient for Illinois nonprofit
  governance records under the Bylaws' Article XII §1 electronic-signature provision,
  but it is not notarization.

---

## How to apply

1. Firebase Console → **Authentication** → **Sign-in method** → enable **Anonymous**
2. Firebase Console → **Firestore Database** → **Rules**
3. Replace everything with the block above, click **Publish**
4. Wait ~30 seconds for propagation
