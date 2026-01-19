// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBJEc_oZSA5W--CP3UEfgamAOmW7l2uKJk",
    authDomain: "westside-rising-time-clock.firebaseapp.com",
    projectId: "westside-rising-time-clock",
    storageBucket: "westside-rising-time-clock.firebasestorage.app",
    messagingSenderId: "45421275739",
    appId: "1:45421275739:web:97fd216fdd6e931115ad7e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global Variables
let currentUser = null;
let userRole = null;

// Authentication State Observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('user-email').textContent = user.email;

        // Check user role
        const role = await checkUserRole(user);
        userRole = role;

        // Show dashboard and configure UI based on role
        document.getElementById('dashboard-section').style.display = 'block';

        configureUIForRole(role);

        // Initialize Time Clock tab by default
        initializeTimeClock();

    } else {
        // Not authenticated - redirect to login page
        currentUser = null;
        userRole = null;
        window.location.href = 'admin-login.html';
    }
});

// Check User Role
async function checkUserRole(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();

        if (userDoc.exists) {
            return userDoc.data().role || 'employee';
        } else {
            // Create user document with default role
            await db.collection('users').doc(user.uid).set({
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                role: 'employee',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return 'employee';
        }
    } catch (error) {
        console.error('Error checking user role:', error);
        return 'employee';
    }
}

// Configure UI Based on Role
function configureUIForRole(role) {
    const timeclockTab = document.querySelector('[data-tab="timeclock"]');
    const timesheetsTab = document.querySelector('[data-tab="timesheets"]');

    if (role === 'superadmin') {
        // Super admin sees all tabs
        timeclockTab.style.display = 'block';
        timesheetsTab.style.display = 'block';
    } else {
        // Employee only sees Time Clock tab
        timeclockTab.style.display = 'block';
        timesheetsTab.style.display = 'none';

        // Switch to Time Clock tab automatically
        switchTab('timeclock');
    }
}

// Sign Out
async function signOut() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Sign out error:', error);
        alert('Failed to sign out. Please try again.');
    }
}

// Tab Switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
        targetTab.classList.add('active');
    }

    // Initialize tab content
    switch (tabName) {
        case 'timeclock':
            if (typeof initializeTimeClock === 'function') {
                initializeTimeClock();
            }
            break;
        case 'timesheets':
            if (typeof initializeTimesheets === 'function') {
                initializeTimesheets();
            }
            break;
    }
}

// Add event listeners to tabs
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
});

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    // Press Escape to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.timeclock-modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});
