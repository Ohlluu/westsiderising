# Firestore Rules — Board of Directors & Contractors

Your live ruleset plus four collections: `boardMembers`, `boardContracts`,
`contractorMembers`, and `contractorContracts`. Nothing above them changed, so
pasting this whole block will not affect Onboarding, timesheets, or any form.

> `FIRESTORE-SECURITY-RULES.md` in this repo is **stale** — it predates the
> `contracts` collection. Use this file instead.

---

## Before you publish: enable Anonymous Auth

Board members and contractors have no accounts, but every Firestore rule requires
`request.auth != null`. `board.html` and `contractor.html` sign the browser in
anonymously purely to satisfy that — no email, no password, no account is created.

1. Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Anonymous**

**If you skip this, no board or contractor link will work.**

---

## How access works

The access code **is** the Firestore document ID. That makes it an unguessable
capability — 24 random characters from a 31-character alphabet.

The security turns on a distinction in Firestore rules:

- `allow get` — fetch **one** document, by exact ID
- `allow list` — **query** the collection
- `allow read` — grants **both**

Board members and contractors get `get` only. They can open the document whose ID
they already know, and cannot enumerate the collection to discover anyone else's
code. Dr. Orr gets full `read`, so she can list both rosters.

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

    function boardCodeIsActive(code) {
      return exists(/databases/$(database)/documents/boardMembers/$(code))
          && get(/databases/$(database)/documents/boardMembers/$(code)).data.revoked == false;
    }

    function boardIsSigned(docId) {
      return 'documents' in resource.data
          && docId in resource.data.documents
          && 'signed' in resource.data.documents[docId]
          && resource.data.documents[docId].signed == true;
    }

    function boardDocPreserved(docId) {
      return !boardIsSigned(docId)
          || ('documents' in request.resource.data
              && docId in request.resource.data.documents
              && request.resource.data.documents[docId] == resource.data.documents[docId]);
    }

    function boardSignaturesImmutable() {
      return boardDocPreserved('bsa')
          && boardDocPreserved('nda')
          && boardDocPreserved('coi');
    }

    function contractorCodeIsActive(code) {
      return exists(/databases/$(database)/documents/contractorMembers/$(code))
          && get(/databases/$(database)/documents/contractorMembers/$(code)).data.revoked == false;
    }

    function contractorIsSigned(docId) {
      return 'documents' in resource.data
          && docId in resource.data.documents
          && 'contractorSigned' in resource.data.documents[docId]
          && resource.data.documents[docId].contractorSigned == true;
    }

    function contractorDocPreserved(docId) {
      return !contractorIsSigned(docId)
          || ('documents' in request.resource.data
              && docId in request.resource.data.documents
              && request.resource.data.documents[docId] == resource.data.documents[docId]);
    }

    function contractorSignaturesImmutable() {
      return contractorDocPreserved('service')
          && contractorDocPreserved('nda')
          && contractorDocPreserved('coi');
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

    match /boardMembers/{code} {
      allow read, write: if isSuperAdmin();
      allow get: if isAuthenticated();
    }

    match /boardContracts/{code} {
      allow read, write: if isSuperAdmin();
      allow get: if isAuthenticated() && boardCodeIsActive(code);
      allow create: if isAuthenticated() && boardCodeIsActive(code);
      allow update: if isAuthenticated() && boardCodeIsActive(code) && boardSignaturesImmutable();
      allow delete: if false;
    }

    match /contractorMembers/{code} {
      allow read, write: if isSuperAdmin();
      allow get: if isAuthenticated();
    }

    match /contractorContracts/{code} {
      allow read, write: if isSuperAdmin();
      allow get: if isAuthenticated() && contractorCodeIsActive(code);
      allow create: if isAuthenticated() && contractorCodeIsActive(code);
      allow update: if isAuthenticated() && contractorCodeIsActive(code) && contractorSignaturesImmutable();
      allow delete: if false;
    }

  }
}
```

---

## Notes on syntax

An earlier draft used `.get('revoked', false)` and `.get('documents', {})` with map
defaults, which the rules compiler rejected. This version uses plain field reads and
`'key' in map` membership checks instead, and declares every function above the
`match` blocks.

`boardCodeIsActive` / `contractorCodeIsActive` read `.revoked` directly rather than
defaulting it. That is safe because `createBODMember` and `createContractorMember`
both always write `revoked: false` when generating a code. **If a member document is
ever created by hand without that field, its link will stop working** — add
`revoked: false` and it resumes.

---

## What this does and does not protect

**Protected**

- Board and contractor records are invisible to managers and employees; only
  `isSuperAdmin()` can read or list them.
- Codes cannot be enumerated: anonymous users have `get` but never `list`.
- A signed document is frozen. The `...SignaturesImmutable()` checks reject any
  update that alters a section already marked signed.
- Contractor records stay writable by superadmin after signing, because
  countersigning the Service Agreement and Conflict of Interest requires it.
- Revoking a code blocks all further reads and writes immediately, while preserving
  everything already signed.
- Contractors and directors cannot delete their own records; `allow delete: if false`
  blocks them. Superadmin **can** delete, because `allow read, write: if isSuperAdmin()`
  already covers delete and rules are a permissive union. That is deliberate so Dr. Orr
  can remove a record created with the wrong name.

**Not protected — worth knowing**

- The link is the credential. Anyone it is forwarded to can sign as that person.
  That is inherent to signing without accounts; it is why each person gets a separate
  code and why the copy-link dialog warns against forwarding.
- The immutability functions hardcode their document IDs. **If you add a document to
  `BOARD_DOCS` or `CONTRACTOR_DOCS`, add a matching `...DocPreserved('<id>')` line
  here**, or that document's signature will not be frozen.
- A typed-name signature is not a cryptographic signature. It matches how your
  employee contracts already work, but it is not notarization.

---

## How to apply

1. Firebase Console → **Authentication** → **Sign-in method** → enable **Anonymous**
2. Firebase Console → **Firestore Database** → **Rules**
3. Replace everything with the block above, click **Publish**
4. Wait ~30 seconds for propagation
