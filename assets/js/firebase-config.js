// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
