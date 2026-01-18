# Time Clock System Setup Guide

## Overview
This guide will help you set up and configure the Time Clock System for Westside Rising's admin dashboard.

## Files Created
- `/public/admin-dashboard.html` - Main admin dashboard with tabs
- `/public/css/timeclock.css` - Time clock styling
- `/public/js/admin-dashboard.js` - Role-based access control
- `/public/js/timeclock.js` - Employee time clock functionality
- `/public/js/timesheets.js` - Super admin timesheet management

## Firebase Setup

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name your project (e.g., "westside-rising-timeclock")
4. Follow the setup wizard

### Step 2: Enable Authentication
1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Enable "Email/Password" sign-in method
4. Create admin users:
   - Click "Users" tab
   - Click "Add user"
   - Enter email and password for each admin/employee

### Step 3: Create Firestore Database
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Start in "production mode"
4. Choose a location (e.g., `us-central1`)

### Step 4: Get Firebase Configuration
1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll to "Your apps" section
3. Click the web icon `</>` to add a web app
4. Register app with a nickname (e.g., "Time Clock Web")
5. Copy the Firebase configuration object

### Step 5: Update Configuration in Code
Open `/public/js/admin-dashboard.js` and replace the Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## Firestore Security Rules

### Step 1: Set Security Rules
In Firebase Console, go to Firestore Database → Rules and paste the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is super admin
    function isSuperAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin';
    }

    // Users collection
    match /users/{userId} {
      // Users can read their own document
      allow read: if request.auth.uid == userId;

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

      // Only super admins can update and delete
      allow update, delete: if isSuperAdmin();
    }

    // Current status collection
    match /currentStatus/{userId} {
      // Users can read/write their own status, super admins can access all
      allow read, write: if request.auth.uid == userId || isSuperAdmin();
    }
  }
}
```

### Step 2: Publish Rules
Click "Publish" to activate the security rules.

## User Role Management

### Setting User Roles

#### Option 1: Firebase Console (Recommended for first super admin)
1. Go to Firestore Database in Firebase Console
2. Create a collection called `users`
3. Add a document with ID matching the user's Firebase Auth UID
4. Add these fields:
   ```
   email: "admin@westsiderising.org"
   displayName: "Admin Name"
   role: "superadmin"
   createdAt: [timestamp]
   ```

#### Option 2: After First Super Admin is Set
Once you have one super admin, they can:
1. Log into the admin dashboard
2. Access the Firestore console or use a script
3. Update other users' roles as needed

### Role Types
- **employee** - Can only access Time Clock tab, clock in/out, view own hours
- **superadmin** - Full access to all tabs, can manage timesheets, edit entries, export reports

## Initial Setup Checklist

- [ ] Firebase project created
- [ ] Email/Password authentication enabled
- [ ] Admin users created in Firebase Auth
- [ ] Firestore database created
- [ ] Security rules published
- [ ] Firebase config updated in `admin-dashboard.js`
- [ ] At least one super admin user created in `users` collection
- [ ] Tested login functionality
- [ ] Verified role-based access control

## Testing the System

### Employee Flow Test
1. **Login as Employee**
   - Navigate to `/admin-dashboard.html`
   - Sign in with employee credentials
   - Should see only Time Clock tab

2. **Clock In**
   - Click "Clock In" button
   - Should see timer start
   - Status should change to "You are currently clocked in"

3. **View Stats**
   - Check "Hours Today" updates
   - Check "Hours This Week" updates
   - Check "Hours This Pay Period" updates

4. **Clock Out**
   - Click "Clock Out" button
   - Should see confirmation with total hours
   - Entry should appear in "Recent Time Entries"

5. **Verify Entry**
   - Check that entry shows correct date and times
   - Verify hours calculation is accurate

### Super Admin Flow Test
1. **Login as Super Admin**
   - Navigate to `/admin-dashboard.html`
   - Sign in with super admin credentials
   - Should see all three tabs: Events, Time Clock, Timesheets

2. **Events Tab**
   - Add a new event
   - Verify it appears in the list
   - Delete an event
   - Verify it's removed

3. **Time Clock Tab**
   - Test clock in/out functionality
   - Verify stats update correctly

4. **Timesheets Tab**
   - Navigate to Timesheets tab
   - Should see current pay period
   - Navigate between pay periods using prev/next buttons

5. **Currently Clocked In Panel**
   - If anyone is clocked in, should see green panel
   - Should show employee name and duration
   - Should update in real-time

6. **Employee Filter**
   - Use dropdown to filter by employee
   - Verify only selected employee's data shows

7. **Edit Time Entry**
   - Click "Edit" on any time entry
   - Modify clock in/out times
   - Add reason for edit
   - Save changes
   - Verify entry updates
   - Click "History" button to view audit trail

8. **Add Manual Entry**
   - Click "Add Manual Entry" for an employee
   - Enter clock in/out times
   - Add reason
   - Save entry
   - Verify it appears in timesheet

9. **Delete Entry**
   - Click "Delete" on a time entry
   - Confirm deletion
   - Verify entry is removed

10. **Export Functions**
    - Click "Export PDF"
    - Verify PDF downloads with correct data and formatting
    - Click "Export CSV"
    - Verify CSV downloads and opens correctly in Excel

### Edge Cases to Test
1. **Midnight Rollover**
   - Clock in before midnight, clock out after
   - Verify entries appear on correct days
   - Verify hours calculations are accurate

2. **Pay Period Transitions**
   - Test during pay period boundaries (every 14 days from Jan 6, 2026)
   - Verify entries are assigned to correct pay period

3. **Duplicate Clock In Prevention**
   - While clocked in, try to clock in again
   - Should show error message

4. **Forgot to Clock Out**
   - Clock in and don't clock out
   - Entry should remain "active" status
   - Super admin can edit to add clock out time

5. **Timezone Handling**
   - Verify all times display in Chicago timezone
   - Test during DST transitions (if applicable)

## Pay Period Configuration

The system is configured with:
- **Start Date**: January 6, 2026
- **Frequency**: Bi-weekly (14 days)
- **Timezone**: America/Chicago

Pay periods automatically calculate:
- 2026-01-06 to 2026-01-19
- 2026-01-20 to 2026-02-02
- 2026-02-03 to 2026-02-16
- And so on...

## Troubleshooting

### Issue: "Permission Denied" Errors
**Solution**: Check Firestore security rules are published correctly. Verify user has correct role in `users` collection.

### Issue: Times Display Incorrectly
**Solution**: Verify browser timezone settings. Check that all timestamps are being converted to Chicago timezone.

### Issue: Can't See Timesheets Tab
**Solution**: Verify user's role in Firestore `users` collection is set to "superadmin" (case-sensitive).

### Issue: Clock In Button Not Working
**Solution**: Check browser console for errors. Verify Firebase is initialized correctly. Check that user is authenticated.

### Issue: Stats Not Updating
**Solution**: Check that time entries have correct `payPeriodId` and `userId` fields. Verify Firestore queries are working.

### Issue: PDF Export Fails
**Solution**: Verify jsPDF libraries are loading correctly. Check browser console for errors. Ensure data is loaded before exporting.

## Maintenance

### Adding New Employees
1. Create user in Firebase Authentication
2. User document will be auto-created on first login with "employee" role
3. Or manually create user document in Firestore with "employee" role

### Promoting to Super Admin
1. Go to Firestore Console
2. Find user document in `users` collection
3. Change `role` field from "employee" to "superadmin"
4. User needs to log out and log back in for changes to take effect

### Backup Data
1. In Firebase Console, go to Firestore Database
2. Use "Export" feature to backup data
3. Schedule regular backups (recommended: weekly)

### Monitoring
- Check Firebase Console regularly for:
  - Authentication activity
  - Firestore usage
  - Error logs
- Review audit trails in time entries for unusual activity

## Support

For issues or questions:
1. Check this documentation first
2. Review Firebase documentation
3. Check browser console for error messages
4. Contact system administrator

## Security Best Practices

1. **Never share Firebase credentials**
2. **Use strong passwords** for all admin accounts
3. **Review Firestore security rules** periodically
4. **Monitor authentication logs** for suspicious activity
5. **Regular backups** of Firestore data
6. **Audit trail review** of time entry edits
7. **Limit super admin accounts** to only necessary users

## Future Enhancements

Potential features to add:
- Email notifications for clock in/out
- Overtime tracking and alerts
- Mobile app for clock in/out
- GPS location tracking
- Shift scheduling
- Vacation/PTO management
- Automated payroll integration
- Custom reports and analytics
- Multi-location support
