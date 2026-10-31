# Firebase App Check rollout

The reCAPTCHA Enterprise site key registered in Firebase is initialized before Firebase services in `assets/js/firebase-config.js` (modular SDK) and `assets/js/firebase-app-check-compat.js` (compat SDK). The compat helper is called for the default staff app and the named board/contractor apps. Automatic token refresh is enabled. The SDK version remains 10.7.1.

## Publish and verify

1. Publish the website changes. Firestore rules are managed separately in Firebase Console; `firestore.rules` is the local copy of the replacement supplied to the user.
2. Keep enforcement off while checking the deployed site. Test a public application and newsletter subscription, public event/calendar loading, staff sign-in/dashboard/timesheets, and board/contractor access with authorized test links. Avoid creating real signatures for testing.
3. Open Firebase Console → Security → App Check → APIs → Cloud Firestore. Confirm requests from these legitimate flows are verified. Investigate invalid requests before enforcement; unknown/bot traffic can remain unverified. Metrics may take time to appear.
4. Enable enforcement for **Cloud Firestore** once legitimate flows are verified. Enforcement covers Firestore throughout the project, not just public applications. Do not enable enforcement for other services as part of this rollout.
5. Repeat the public and staff checks after enforcement. If legitimate traffic is blocked, disable Firestore enforcement while diagnosing.

Code checks exercised initialization order, automatic refresh, separate named apps, duplicate activation, local-preview behavior, and JavaScript syntax with mocked Firebase APIs. They do not verify live reCAPTCHA attestation or Firebase Console configuration. Live verification is required after publishing.

## Local previews

On localhost/127.0.0.1/IPv6 loopback, App Check is skipped unless `self.FIREBASE_APPCHECK_DEBUG_TOKEN` was explicitly configured before Firebase initialization. After enforcement, local previews can render but live Firestore requests require a registered debug token. Configure debugging only locally; never commit a debug token or add localhost to the production reCAPTCHA key.

## Limits

App Check reduces automated abuse; it is not a guarantee that every sender is human and does not provide a per-person application submission rate limit. The Firestore rules perform basic validation, not exhaustive content or spam detection.
