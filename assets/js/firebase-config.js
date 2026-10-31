// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAhlVGI_uyVoNGVaTHhEE5QgiRqC5VOnVc",
  authDomain: "westside-rising.firebaseapp.com",
  projectId: "westside-rising",
  storageBucket: "westside-rising.firebasestorage.app",
  messagingSenderId: "444755248691",
  appId: "1:444755248691:web:5e9fea91b2d088096ec546",
  measurementId: "G-0Z08M3RW6T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Activate before Auth, Firestore, or Storage makes requests.
// Local previews need an explicitly configured, registered App Check debug token.
const localPreview = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
if (!localPreview || self.FIREBASE_APPCHECK_DEBUG_TOKEN) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('6LeVGAouAAAAABBP2NnHzSL88CCEgv6gJUEbVXi9'),
    isTokenAutoRefreshEnabled: true
  });
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
