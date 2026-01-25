# Firestore Security Rules - Updated for 3 Role System

## Role Permissions

### 1. **superadmin**
- ✅ Full access to Event Management
- ✅ Full access to Time Clock
- ✅ Full access to Timesheets
- ✅ Can manage all user roles
- ✅ Can edit/delete any time entries

### 2. **manager**
- ✅ Full access to Event Management
- ✅ Access to Time Clock (clock in/out)
- ❌ NO access to Timesheets

### 3. **employee**
- ❌ NO access to Event Management
- ✅ Access to Time Clock (clock in/out only)
- ❌ NO access to Timesheets

---

## Updated Firestore Security Rules

Copy and paste these rules into Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is super admin
    function isSuperAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin';
    }

    // Helper function to check if user is manager or superadmin
    function isManagerOrAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager', 'superadmin'];
    }

    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // ==================== EVENTS COLLECTION ====================
    // Events collection - for Event Management Dashboard
    match /events/{eventId} {
      // Anyone can read events (for public website)
      allow read: if true;

      // Managers and superadmins can create events (submit event form)
      allow create: if isManagerOrAdmin();

      // Managers and superadmins can update and delete events (admin dashboard)
      allow update, delete: if isManagerOrAdmin();
    }

    // ==================== TIME CLOCK COLLECTIONS ====================
    // Users collection
    match /users/{userId} {
      // Users can read their own document
      // Super admins can read all user documents (for employee dropdown)
      allow read: if request.auth.uid == userId || isSuperAdmin();

      // Only super admins can write
      allow write: if isSuperAdmin();
    }

    // Time entries collection
    match /timeEntries/{entryId} {
      // Users can read their own entries, super admins can read all
      allow read: if resource.data.userId == request.auth.uid || isSuperAdmin();

      // Users can create their own entries
      allow create: if request.auth.uid != null &&
                       request.resource.data.userId == request.auth.uid;

      // Users can update their own entries (for clocking out)
      // Super admins can update and delete any entry
      allow update: if resource.data.userId == request.auth.uid || isSuperAdmin();
      allow delete: if isSuperAdmin();
    }

    // Current status collection
    match /currentStatus/{userId} {
      // Users can read/write their own status, super admins can access all
      allow read, write: if request.auth.uid == userId || isSuperAdmin();
    }
  }
}
```

---

## How to Apply These Rules

1. **Go to Firebase Console:**
   - [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Select your **westside-rising** project

2. **Navigate to Firestore Database → Rules**

3. **Copy the entire rules code block above**

4. **Replace ALL existing rules** with the code above

5. **Click "Publish"**

6. **Wait 30 seconds** for rules to propagate

---

## Setting User Roles

To assign roles to users, update the `role` field in their user document:

1. **Firebase Console → Firestore Database → users collection**
2. **Click on a user document**
3. **Edit the `role` field** to one of:
   - `superadmin`
   - `manager`
   - `employee`

---

## Access Matrix

| Feature | superadmin | manager | employee |
|---------|------------|---------|----------|
| Event Management | ✅ | ✅ | ❌ |
| Time Clock (clock in/out) | ✅ | ✅ | ✅ |
| Timesheets (view all, edit, export) | ✅ | ❌ | ❌ |
| Manage User Roles | ✅ | ❌ | ❌ |

