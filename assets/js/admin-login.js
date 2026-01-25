import { auth, db } from './firebase-config.js?v=5';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const loginForm = document.getElementById('admin-login-form');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const loginBtn = document.getElementById('login-btn');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    console.log('Login form submitted for:', email);

    // Hide previous errors
    errorMessage.style.display = 'none';

    // Show loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

    try {
        // Sign in with Firebase Authentication
        console.log('Attempting Firebase sign in...');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Sign in successful!', userCredential.user.email);

        // Check user role and redirect accordingly
        try {
            const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
            const role = userDoc.exists() ? (userDoc.data().role || 'employee') : 'employee';

            console.log('User role:', role);

            // Redirect based on role
            if (role === 'superadmin' || role === 'manager') {
                // Super admin and manager go to Event Management
                console.log('Redirecting to Event Management...');
                window.location.href = 'admin-dashboard.html';
            } else {
                // Employee goes directly to Time Clock
                console.log('Redirecting to Time Clock...');
                window.location.href = 'time-clock.html';
            }
        } catch (roleError) {
            console.error('Error checking role:', roleError);
            // Default to Time Clock if role check fails
            window.location.href = 'time-clock.html';
        }

    } catch (error) {
        // Handle errors
        console.error('Login error:', error);

        let errorMsg = 'Invalid email or password. Please try again.';

        if (error.code === 'auth/user-not-found') {
            errorMsg = 'No admin account found with this email.';
        } else if (error.code === 'auth/wrong-password') {
            errorMsg = 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/invalid-email') {
            errorMsg = 'Invalid email address format.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMsg = 'Too many failed attempts. Please try again later.';
        }

        errorText.textContent = errorMsg;
        errorMessage.style.display = 'flex';

        // Reset button
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
});
