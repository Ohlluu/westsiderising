# Firestore Rules — Source of Truth

Copy the complete contents of `firestore.rules` into Firebase Console → Firestore Database → Rules and publish.
This does not deploy automatically with GitHub Pages.

This version removes duplicate grants from the supplied live rules and adds basic application field and server timestamp checks matched to current form scripts. It preserves optional Community Voices contact information and existing staff permissions. It does not validate every field or detect random prose, rate-limit submissions, or enable CAPTCHA/App Check.

App Check must be configured separately. Monitor legitimate forms, staff, board, and contractor requests before enabling Firestore enforcement. Anonymous Authentication must remain enabled for board and contractor signing.

Signed board/contractor sections remain frozen for access-code holders. Superadmin retains full access, including countersigning and deletion. Document IDs in the immutability functions must be updated if signing documents are added.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSuperAdmin() {
      return request.auth != null
          && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin';
    }

    function isManagerOrAdmin() {
      return request.auth != null
          && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager', 'superadmin'];
    }

    function isAuthenticated() {
      return request.auth != null;
    }

    // Basic validation; bot verification is configured through App Check.
    function text(value, minimum, maximum) {
      return value is string
          && value.size() >= minimum && value.size() <= maximum;
    }

    function email(value) {
      return text(value, 3, 254)
          && value.matches('[^@\\s]+@[^@\\s]+[.][^@\\s]+');
    }

    function newSubmission(data, type) {
      return data.status == 'new'
          && data.formType == type
          && data.submittedAt is timestamp
          && data.submittedAt == request.time;
    }

    function applicant(data) {
      return text(data.fullName, 1, 200)
          && email(data.email)
          && text(data.phone, 1, 80);
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
      allow create: if request.resource.data.status == 'pending'
          && text(request.resource.data.eventTitle, 1, 300)
          && email(request.resource.data.organizerEmail)
          && text(request.resource.data.organizerName, 1, 200);
      allow update, delete: if isManagerOrAdmin();
    }

    match /volunteerApplications/{docId} {
      allow create: if newSubmission(request.resource.data, 'Volunteer Application')
          && text(request.resource.data.firstName, 1, 200)
          && text(request.resource.data.lastName, 1, 200)
          && email(request.resource.data.email)
          && text(request.resource.data.phone, 1, 80)
          && request.resource.data.interests is list
          && request.resource.data.interests.size() > 0
          && request.resource.data.interests.size() <= 30;
      allow read, update, delete: if isManagerOrAdmin();
    }

    match /partnershipApplications/{docId} {
      allow create: if newSubmission(request.resource.data, 'Partnership Application')
          && email(request.resource.data.email)
          && text(request.resource.data.entityName, 1, 300)
          && request.resource.data.partnershipType is list
          && request.resource.data.partnershipType.size() > 0
          && request.resource.data.partnershipType.size() <= 30;
      allow read, update, delete: if isManagerOrAdmin();
    }

    match /joinTeamApplications/{docId} {
      allow create: if newSubmission(request.resource.data, 'Employment Application')
          && applicant(request.resource.data)
          && request.resource.data.positions is list
          && request.resource.data.positions.size() > 0
          && request.resource.data.positions.size() <= 20
          && text(request.resource.data.employmentType, 1, 300)
          && text(request.resource.data.signature, 1, 200);
      allow read, update, delete: if isManagerOrAdmin();
    }

    match /youngLeadersApplications/{docId} {
      allow create: if newSubmission(request.resource.data, 'Young Leaders Power Academy Application')
          && applicant(request.resource.data)
          && text(request.resource.data.position, 1, 300)
          && text(request.resource.data.signature, 1, 200);
      allow read, update, delete: if isManagerOrAdmin();
    }

    match /powerLabApplications/{docId} {
      allow create: if newSubmission(request.resource.data, 'Community Power Lab Application')
          && applicant(request.resource.data)
          && text(request.resource.data.signature, 1, 200);
      allow read, update, delete: if isManagerOrAdmin();
    }

    match /communityVoicesSurveys/{docId} {
      allow create: if newSubmission(request.resource.data, 'Community Voices Survey')
          && text(request.resource.data.contactName, 0, 200)
          && text(request.resource.data.contactPhone, 0, 80)
          && (request.resource.data.contactEmail == ''
              || email(request.resource.data.contactEmail))
          && request.resource.data.getInvolved is list
          && request.resource.data.getInvolved.size() <= 30;
      allow read, update, delete: if isManagerOrAdmin();
    }

    match /assessmentSubmissions/{docId} {
      allow create: if newSubmission(request.resource.data, 'Candidate Assessment')
          && text(request.resource.data.candidateName, 1, 200)
          && text(request.resource.data.positionApplied, 1, 300)
          && request.resource.data.accountability is map
          && request.resource.data.teamwork is map
          && request.resource.data.initiative is map
          && request.resource.data.criticalThinking is map
          && request.resource.data.situational is map;
      allow read, update, delete: if isManagerOrAdmin();
    }

    match /subscribers/{docId} {
      allow create: if request.resource.data.keys().hasOnly(['name', 'phone', 'email', 'subscribedAt'])
          && text(request.resource.data.name, 1, 200)
          && text(request.resource.data.phone, 0, 80)
          && email(request.resource.data.email)
          && request.resource.data.subscribedAt == request.time;
      allow read, update, delete: if isManagerOrAdmin();
    }

    match /users/{userId} {
      allow read: if (isAuthenticated() && request.auth.uid == userId) || isSuperAdmin();
      allow write: if isSuperAdmin();
    }

    match /timeEntries/{entryId} {
      allow read: if (isAuthenticated() && resource.data.userId == request.auth.uid) || isSuperAdmin();
      allow create: if (isAuthenticated() && request.resource.data.userId == request.auth.uid) || isSuperAdmin();
      allow update: if (isAuthenticated() && resource.data.userId == request.auth.uid) || isSuperAdmin();
      allow delete: if isSuperAdmin();
    }

    match /currentStatus/{userId} {
      allow read, write: if (isAuthenticated() && request.auth.uid == userId) || isSuperAdmin();
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
