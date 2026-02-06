# SMS Clock-In Notifications Setup Guide

## 🎯 What This Does

Automatically sends a text message to the superadmin's phone whenever an employee clocks in.

**Bonus:** Also sends a nightly report if anyone forgot to clock out.

---

## ✅ Can I Use the Same Twilio Account?

**YES!** You can use your existing Twilio account from weconnectfamilies for both projects.

Your Twilio credentials (get these from your weconnectfamilies/.env file):
- **Account SID:** `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Auth Token:** `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Twilio Phone:** `+1234567890`

You can either:
- **Option A:** Use the same phone number (+19342274058) for both projects
- **Option B:** Buy a second Twilio number ($1/month) specifically for West Side Rising

---

## 🚀 Setup Steps

### Step 1: Install Firebase CLI (If Not Already Installed)

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

### Step 3: Initialize Firebase Functions

```bash
cd /Users/user/Desktop/westsiderising
firebase init functions
```

When prompted:
- **Select project:** Choose your westside-rising Firebase project
- **Language:** JavaScript
- **ESLint:** No (optional)
- **Install dependencies:** Yes

### Step 4: Install Twilio in Functions Directory

```bash
cd functions
npm install twilio
```

### Step 5: Set Twilio Configuration (Environment Variables)

Run these commands to securely store your Twilio credentials:

```bash
firebase functions:config:set \
  twilio.account_sid="YOUR_ACCOUNT_SID_HERE" \
  twilio.auth_token="YOUR_AUTH_TOKEN_HERE" \
  twilio.phone_number="+1YOUR_TWILIO_NUMBER" \
  twilio.superadmin_phone="+1YOUR_SUPERADMIN_PHONE"
```

**Get your credentials from:** `/Users/user/websites/weconnectfamilies/.env`

### Step 6: Deploy to Firebase

```bash
firebase deploy --only functions
```

This will deploy two functions:
1. **notifySuperadminOnClockIn** - Sends SMS when someone clocks in
2. **notifyUnclosedEntries** - Daily check at 11 PM for unclosed entries

---

## 📱 What the SMS Looks Like

**When someone clocks in:**
```
🕐 CLOCK IN ALERT

Employee: John Smith
Time: 9:15 AM
Date: Mon, Feb 3

View timesheets at:
westsiderising.org/time-clock.html
```

**Daily unclosed entries report (11 PM):**
```
⚠️ UNCLOSED TIME ENTRIES

2 employee(s) forgot to clock out:
John Smith, Jane Doe

Please review and close manually:
westsiderising.org/time-clock.html
```

---

## 💰 Twilio Costs

- **SMS to US numbers:** $0.0079 per message (~$0.01)
- **Monthly phone number:** $1.00/month
- **Free tier:** Twilio gives you $15.50 credit when you sign up

**Example monthly cost:**
- 100 clock-ins/month = $0.79
- 30 daily reports = $0.24
- Phone number = $1.00
- **Total: ~$2.03/month**

---

## 🧪 Testing Before Deploying

### Test Locally with Firebase Emulator

```bash
cd /Users/user/Desktop/westsiderising
firebase emulators:start
```

Then trigger a clock-in event manually in Firestore to see if SMS would be sent.

---

## 🔧 Configuration Options

### Change Superadmin Phone Number

```bash
firebase functions:config:set twilio.superadmin_phone="+1234567890"
firebase deploy --only functions
```

### Disable Nightly Reports

Edit `functions/index.js` and comment out or remove the `notifyUnclosedEntries` function.

### Change Alert Time

In `functions/index.js`, change the schedule:
```javascript
.schedule('0 23 * * *')  // 11 PM daily
// Change to:
.schedule('0 20 * * *')  // 8 PM daily
```

---

## ❌ Troubleshooting

### SMS Not Sending?

1. **Check Firebase logs:**
   ```bash
   firebase functions:log
   ```

2. **Verify Twilio config:**
   ```bash
   firebase functions:config:get
   ```

3. **Check Twilio console:**
   - https://console.twilio.com/
   - Go to Monitor → Logs → Errors

### "Twilio not initialized" error?

Run:
```bash
firebase functions:config:get
```

If empty, re-run Step 5 to set credentials.

### Phone number format errors?

Twilio requires E.164 format: `+1XXXXXXXXXX`
- ✅ Correct: `+16462262433`
- ❌ Wrong: `6462262433` or `(646) 226-2433`

---

## 📊 Monitoring

### View Function Logs

```bash
firebase functions:log --only notifySuperadminOnClockIn
```

### Check Costs

Monitor Twilio usage at: https://console.twilio.com/

---

## 🎉 You're Done!

Once deployed, SMS notifications will automatically send whenever:
1. ✅ An employee clocks in
2. ⚠️ Daily report at 11 PM if entries are unclosed

Questions? Check the Firebase console for function logs or Twilio console for delivery status.
