const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Initialize Twilio client
const accountSid = functions.config().twilio.account_sid;
const authToken = functions.config().twilio.auth_token;
const twilioPhone = functions.config().twilio.phone_number;
const superadminPhone = functions.config().twilio.superadmin_phone;

let twilioClient;

try {
  twilioClient = twilio(accountSid, authToken);
  console.log('✅ Twilio initialized');
} catch (error) {
  console.error('❌ Twilio initialization failed:', error.message);
}

/**
 * Send SMS to superadmin when an employee clocks in
 */
exports.notifySuperadminOnClockIn = functions.firestore
  .document('timeEntries/{entryId}')
  .onCreate(async (snap, context) => {
    try {
      const entry = snap.data();
      const entryId = context.params.entryId;

      // Only send notification for new clock-ins (status: active, no clockOut)
      if (entry.status !== 'active' || entry.clockOut) {
        console.log('⏭️  Skipping notification - not a new clock-in');
        return null;
      }

      // Format clock-in time to Chicago timezone
      const clockInTime = entry.clockIn.toDate();
      const timeString = clockInTime.toLocaleTimeString('en-US', {
        timeZone: 'America/Chicago',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      const dateString = clockInTime.toLocaleDateString('en-US', {
        timeZone: 'America/Chicago',
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });

      // Create SMS message
      const message = `🕐 CLOCK IN ALERT

Employee: ${entry.userName}
Time: ${timeString}
Date: ${dateString}

View timesheets at:
westsiderising.org/time-clock.html`;

      // Send SMS to superadmin
      if (!twilioClient) {
        console.error('❌ Twilio client not initialized');
        return null;
      }

      if (!superadminPhone || !twilioPhone) {
        console.error('❌ Phone numbers not configured');
        return null;
      }

      const result = await twilioClient.messages.create({
        body: message,
        from: twilioPhone,
        to: superadminPhone
      });

      console.log(`✅ SMS sent to superadmin - SID: ${result.sid}`);
      console.log(`   Employee: ${entry.userName}`);
      console.log(`   Time: ${timeString}`);

      return { success: true, messageSid: result.sid };

    } catch (error) {
      console.error('❌ Error sending clock-in notification:', error);
      // Don't throw error - we don't want to block the clock-in if SMS fails
      return { success: false, error: error.message };
    }
  });

/**
 * Optional: Send SMS for missed clock-outs
 * Runs daily at 11 PM Chicago time to check for unclosed entries
 */
exports.notifyUnclosedEntries = functions.pubsub
  .schedule('0 23 * * *')
  .timeZone('America/Chicago')
  .onRun(async (context) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find entries that are still active from today
      const activeEntries = await db.collection('timeEntries')
        .where('status', '==', 'active')
        .where('clockIn', '>=', admin.firestore.Timestamp.fromDate(today))
        .get();

      if (activeEntries.empty) {
        console.log('✅ No unclosed entries found');
        return null;
      }

      const unclosedNames = activeEntries.docs
        .map(doc => doc.data().userName)
        .join(', ');

      const message = `⚠️ UNCLOSED TIME ENTRIES

${activeEntries.size} employee(s) forgot to clock out:
${unclosedNames}

Please review and close manually:
westsiderising.org/time-clock.html`;

      await twilioClient.messages.create({
        body: message,
        from: twilioPhone,
        to: superadminPhone
      });

      console.log(`✅ Unclosed entries notification sent (${activeEntries.size} entries)`);
      return { success: true, count: activeEntries.size };

    } catch (error) {
      console.error('❌ Error checking unclosed entries:', error);
      return { success: false, error: error.message };
    }
  });
