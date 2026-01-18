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

        // Load appropriate tab content
        loadEventsTab();

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

        // Hide Events tab for employees, switch to Time Clock
        const eventsTab = document.querySelector('[data-tab="events"]');
        eventsTab.style.display = 'none';

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
        case 'events':
            loadEventsTab();
            break;
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

    setupModals();
});

// Setup Modals
function setupModals() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');

    // Close modal when clicking X
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Close timeclock modals
    document.querySelectorAll('.timeclock-modal').forEach(modal => {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// Events Tab Management
async function loadEventsTab() {
    try {
        const response = await fetch('/api/events');
        const events = await response.json();

        const adminEventsList = document.getElementById('admin-events-list');

        if (events.length === 0) {
            adminEventsList.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><h4>No events created yet</h4><p>Click "Add Event" to create your first event.</p></div>';
            return;
        }

        adminEventsList.innerHTML = events.map(event => `
            <div class="admin-code-item" style="margin-bottom: 1rem;">
                <div>
                    <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">${event.title}</h4>
                    <p style="margin-bottom: 0.25rem;"><strong>Date:</strong> ${formatDate(event.date)}</p>
                    ${event.time ? `<p style="margin-bottom: 0.25rem;"><strong>Time:</strong> ${formatTime(event.time)}</p>` : ''}
                    ${event.location ? `<p style="margin-bottom: 0.25rem;"><strong>Location:</strong> ${event.location}</p>` : ''}
                    ${event.description ? `<p style="color: #666; margin-top: 0.5rem;">${event.description}</p>` : ''}
                </div>
                <div>
                    <button class="btn btn-danger btn-small" onclick="deleteEvent(${event.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading events:', error);
        document.getElementById('admin-events-list').innerHTML = '<div class="message error"><i class="fas fa-exclamation-circle"></i> Error loading events</div>';
    }
}

// Show Add Event Modal
function showAddEventModal() {
    const modal = document.getElementById('event-modal');
    document.getElementById('event-form').reset();
    modal.style.display = 'block';
}

// Handle Event Form Submission
document.addEventListener('DOMContentLoaded', function() {
    const eventForm = document.getElementById('event-form');
    if (eventForm) {
        eventForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = {
                title: document.getElementById('event-title').value,
                description: document.getElementById('event-description').value,
                date: document.getElementById('event-date').value,
                time: document.getElementById('event-time').value,
                location: document.getElementById('event-location').value,
                imageUrl: document.getElementById('event-image').value,
                createdByCode: currentUser.email,
                createdByName: currentUser.displayName || currentUser.email
            };

            try {
                const response = await fetch('/api/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Event created successfully!');
                    document.getElementById('event-modal').style.display = 'none';
                    loadEventsTab();
                } else {
                    alert('Error creating event: ' + result.error);
                }
            } catch (error) {
                console.error('Error creating event:', error);
                alert('Error creating event');
            }
        });
    }
});

// Delete Event
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) {
        return;
    }

    try {
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code: currentUser.email,
                isMainAdmin: userRole === 'superadmin'
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Event deleted successfully!');
            loadEventsTab();
        } else {
            alert('Error deleting event: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event');
    }
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
}

function formatTime(timeString) {
    if (!timeString) return '';

    const time = new Date(`1970-01-01T${timeString}`);
    return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function showMessage(message, type, container) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    messageDiv.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;

    if (container) {
        container.innerHTML = '';
        container.appendChild(messageDiv);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    // Press Escape to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.querySelectorAll('.timeclock-modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});
