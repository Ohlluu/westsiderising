// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJEc_oZSA5W--CP3UEfgamAOmW7l2uKJk",
  authDomain: "westside-rising-time-clock.firebaseapp.com",
  projectId: "westside-rising-time-clock",
  storageBucket: "westside-rising-time-clock.firebasestorage.app",
  messagingSenderId: "45421275739",
  appId: "1:45421275739:web:97fd216fdd6e931115ad7e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
