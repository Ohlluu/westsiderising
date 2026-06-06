import { auth, db } from './firebase-config.js?v=5';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const loginForm = document.getElementById('admin-login-form');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const loginBtn = document.getElementById('login-btn');

// Forgot password toggle
document.getElementById('forgot-password-link').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    document.getElementById('forgot-password-form').style.display = 'block';
});

document.getElementById('back-to-login-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('forgot-password-form').style.display = 'none';
    document.getElementById('reset-success').style.display = 'none';
    document.getElementById('reset-error').style.display = 'none';
    document.getElementById('reset-email').value = '';
    loginForm.style.display = 'block';
});

async function sendResetEmail() {
    const email = document.getElementById('reset-email').value.trim();
    const resetBtn = document.getElementById('reset-btn');
    const resetError = document.getElementById('reset-error');
    const resetSuccess = document.getElementById('reset-success');

    resetError.style.display = 'none';
    resetSuccess.style.display = 'none';

    if (!email) {
        document.getElementById('reset-error-text').textContent = 'Please enter your email address.';
        resetError.style.display = 'flex';
        return;
    }

    resetBtn.disabled = true;
    resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        await sendPasswordResetEmail(auth, email);
        resetSuccess.style.display = 'block';
        resetBtn.innerHTML = '<i class="fas fa-check"></i> Sent';
    } catch (error) {
        let msg = 'Failed to send reset email. Please try again.';
        if (error.code === 'auth/user-not-found') msg = 'No account found with that email address.';
        if (error.code === 'auth/invalid-email') msg = 'Invalid email address format.';
        document.getElementById('reset-error-text').textContent = msg;
        resetError.style.display = 'flex';
        resetBtn.disabled = false;
        resetBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
    }
}

window.sendResetEmail = sendResetEmail;

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
