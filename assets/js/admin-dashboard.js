import { auth, db } from './firebase-config.js?v=5';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Helper function to format time from 24-hour to 12-hour format with AM/PM
function formatTime(timeString) {
    if (!timeString) return 'N/A';

    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12; // Convert 0 to 12 for midnight

    return `${displayHour}:${minutes} ${ampm}`;
}

// Helper function to parse date string in local timezone (not UTC)
function parseDateSafe(dateString) {
    if (!dateString) return null;

    // If it's already a full ISO string with time, use it directly
    if (dateString.includes('T')) {
        return new Date(dateString);
    }

    // Otherwise, parse as local date by splitting and creating date manually
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    return new Date(year, month - 1, day); // month is 0-indexed
}

// Check if user is logged in and has proper role
onAuthStateChanged(auth, async (user) => {
    console.log('Auth state changed:', user ? `Logged in as ${user.email}` : 'Not logged in');
    if (!user) {
        // Not logged in, redirect to login page
        console.log('Redirecting to login page...');
        window.location.href = 'admin-login.html';
    } else {
        // Check user role
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const role = userDoc.data().role || 'employee';

                // Only superadmin and manager can access Event Management
                if (role === 'superadmin' || role === 'manager') {
                    console.log('Loading dashboard... Role:', role);
                    loadDashboard();
                } else {
                    // Employee trying to access Event Management - redirect to Time Clock
                    console.log('Employee detected, redirecting to Time Clock...');
                    alert('You do not have permission to access Event Management. Redirecting to Time Clock.');
                    window.location.href = 'time-clock.html';
                }
            } else {
                // No user document, treat as employee
                console.log('No user document found, redirecting to Time Clock...');
                window.location.href = 'time-clock.html';
            }
        } catch (error) {
            console.error('Error checking user role:', error);
            window.location.href = 'time-clock.html';
        }
    }
});

// Logout functionality
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'admin-login.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out. Please try again.');
    }
});

// Load dashboard data
async function loadDashboard() {
    try {
        // Get all events
        const eventsRef = collection(db, 'events');
        const eventsSnapshot = await getDocs(eventsRef);

        let pendingCount = 0;
        let approvedCount = 0;
        const pendingEvents = [];
        const approvedEvents = [];

        eventsSnapshot.forEach((doc) => {
            const event = { id: doc.id, ...doc.data() };

            if (event.status === 'pending') {
                pendingCount++;
                pendingEvents.push(event);
            } else if (event.status === 'approved') {
                approvedCount++;
                approvedEvents.push(event);
            }
        });

        // Update stats
        document.getElementById('pending-count').textContent = pendingCount;
        document.getElementById('approved-count').textContent = approvedCount;
        document.getElementById('total-count').textContent = eventsSnapshot.size;

        // Display pending events
        displayPendingEvents(pendingEvents);

        // Display approved events
        displayApprovedEvents(approvedEvents);

    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('pending-events-container').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading events. Please refresh the page.</p>
            </div>
        `;
    }
}

// Display pending events
function displayPendingEvents(events) {
    const container = document.getElementById('pending-events-container');

    if (events.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No pending events to review</p>
            </div>
        `;
        return;
    }

    container.innerHTML = events.map(event => `
        <div class="event-card-admin" data-event-id="${event.id}">
            <div class="event-card-header">
                <div>
                    <h3>${event.eventTitle || 'Untitled Event'}</h3>
                    <span class="event-badge">${event.eventType || 'Event'}</span>
                </div>
                <button class="btn-view-details" onclick="toggleDetails('${event.id}')">
                    <i class="fas fa-chevron-down"></i>
                    View Details
                </button>
            </div>

            <div class="event-card-info">
                <div class="info-item">
                    <i class="far fa-calendar"></i>
                    <span>${formatDate(event.eventDate)}</span>
                </div>
                <div class="info-item">
                    <i class="far fa-clock"></i>
                    <span>${formatTime(event.eventTime)}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${event.eventLocation || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-user"></i>
                    <span>${event.organizerName || 'N/A'}</span>
                </div>
            </div>

            <!-- Expandable Details Section -->
            <div class="event-details-expand" id="details-${event.id}" style="display: none;">
                <div class="details-section">
                    <h4><i class="fas fa-info-circle"></i> Event Description</h4>
                    <p>${event.eventDescription || 'No description provided'}</p>
                </div>

                ${event.eventImage ? `
                    <div class="details-section">
                        <h4><i class="fas fa-image"></i> Event Flyer</h4>
                        <img src="${event.eventImage}" alt="Event Flyer" style="max-width: 100%; border-radius: 8px; margin-top: 0.5rem;">
                    </div>
                ` : ''}

                <div class="details-section">
                    <h4><i class="fas fa-user-circle"></i> Organizer Contact</h4>
                    <div class="contact-info">
                        <p><strong>Name:</strong> ${event.organizerName || 'N/A'}</p>
                        <p><strong>Email:</strong> ${event.organizerEmail ? `<a href="mailto:${event.organizerEmail}">${event.organizerEmail}</a>` : 'N/A'}</p>
                        <p><strong>Phone:</strong> ${event.organizerPhone ? `<a href="tel:${event.organizerPhone}">${event.organizerPhone}</a>` : 'N/A'}</p>
                    </div>
                </div>

                <div class="details-section">
                    <h4><i class="fas fa-clipboard-list"></i> Additional Information</h4>
                    <p><strong>Wants WESTSIDE RISING as Partner:</strong> ${event.westsideRisingPartner ? 'Yes' : 'No'}</p>
                    <p><strong>Expected Attendees:</strong> ${event.expectedAttendees || 'Not specified'}</p>
                    <p><strong>Registration Required:</strong> ${event.registrationRequired ? 'Yes' : 'No'}</p>
                    ${event.registrationLink ? `<p><strong>Registration Link:</strong> <a href="${event.registrationLink}" target="_blank">${event.registrationLink}</a></p>` : ''}
                    <p><strong>Submitted:</strong> ${formatDate(event.submittedAt)}</p>
                </div>
            </div>

            <div class="event-card-actions">
                <button class="btn-approve" onclick="approveEvent('${event.id}')">
                    <i class="fas fa-check"></i>
                    Approve & Publish
                </button>
                <button class="btn-reject" onclick="rejectEvent('${event.id}')">
                    <i class="fas fa-times"></i>
                    Reject
                </button>
            </div>
        </div>
    `).join('');
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = parseDateSafe(dateString);
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Approve event
window.approveEvent = async function(eventId) {
    if (!confirm('Approve this event and publish it to the website?')) return;

    try {
        const eventRef = doc(db, 'events', eventId);
        const eventDoc = await getDoc(eventRef);

        if (!eventDoc.exists()) {
            alert('Event not found');
            return;
        }

        // Update event status to approved
        await updateDoc(eventRef, {
            status: 'approved',
            approvedAt: new Date().toISOString()
        });

        alert('Event approved successfully! It will now appear on the website.');

        // Reload dashboard
        loadDashboard();

    } catch (error) {
        console.error('Error approving event:', error);
        alert('Error approving event. Please try again.');
    }
};

// Reject event
window.rejectEvent = async function(eventId) {
    if (!confirm('Are you sure you want to reject and delete this event? This action cannot be undone.')) return;

    try {
        const eventRef = doc(db, 'events', eventId);

        // Delete the event
        await deleteDoc(eventRef);

        alert('Event rejected and deleted.');

        // Reload dashboard
        loadDashboard();

    } catch (error) {
        console.error('Error rejecting event:', error);
        alert('Error rejecting event. Please try again.');
    }
};

// Toggle event details
window.toggleDetails = function(eventId) {
    const detailsSection = document.getElementById(`details-${eventId}`);
    const button = document.querySelector(`[data-event-id="${eventId}"] .btn-view-details`);

    if (detailsSection.style.display === 'none') {
        detailsSection.style.display = 'block';
        button.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Details';
    } else {
        detailsSection.style.display = 'none';
        button.innerHTML = '<i class="fas fa-chevron-down"></i> View Details';
    }
};

// Display approved events
function displayApprovedEvents(events) {
    const container = document.getElementById('approved-events-container');

    if (events.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p>No approved events</p>
            </div>
        `;
        return;
    }

    // Sort events by date (newest first)
    events.sort((a, b) => {
        const dateA = parseDateSafe(a.eventDate);
        const dateB = parseDateSafe(b.eventDate);
        return dateB - dateA;
    });

    container.innerHTML = events.map(event => `
        <div class="event-card-admin approved-event-card" data-event-id="${event.id}">
            <div class="event-card-header">
                <div>
                    <h3>${event.eventTitle || 'Untitled Event'}</h3>
                    <span class="event-badge approved-badge">${event.eventType || 'Event'}</span>
                </div>
                <button class="btn-view-details" onclick="toggleDetails('${event.id}')">
                    <i class="fas fa-chevron-down"></i>
                    View Details
                </button>
            </div>

            <div class="event-card-info">
                <div class="info-item">
                    <i class="far fa-calendar"></i>
                    <span>${formatDate(event.eventDate)}</span>
                </div>
                <div class="info-item">
                    <i class="far fa-clock"></i>
                    <span>${formatTime(event.eventTime)}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${event.eventLocation || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-user"></i>
                    <span>${event.organizerName || 'N/A'}</span>
                </div>
            </div>

            <!-- Expandable Details Section -->
            <div class="event-details-expand" id="details-${event.id}" style="display: none;">
                <div class="details-section">
                    <h4><i class="fas fa-info-circle"></i> Event Description</h4>
                    <p>${event.eventDescription || 'No description provided'}</p>
                </div>

                ${event.eventImage ? `
                    <div class="details-section">
                        <h4><i class="fas fa-image"></i> Event Flyer</h4>
                        <img src="${event.eventImage}" alt="Event Flyer" style="max-width: 100%; border-radius: 8px; margin-top: 0.5rem;">
                    </div>
                ` : ''}

                <div class="details-section">
                    <h4><i class="fas fa-user-circle"></i> Organizer Contact</h4>
                    <div class="contact-info">
                        <p><strong>Name:</strong> ${event.organizerName || 'N/A'}</p>
                        <p><strong>Email:</strong> ${event.organizerEmail ? `<a href="mailto:${event.organizerEmail}">${event.organizerEmail}</a>` : 'N/A'}</p>
                        <p><strong>Phone:</strong> ${event.organizerPhone ? `<a href="tel:${event.organizerPhone}">${event.organizerPhone}</a>` : 'N/A'}</p>
                    </div>
                </div>

                <div class="details-section">
                    <h4><i class="fas fa-clipboard-list"></i> Additional Information</h4>
                    <p><strong>Wants WESTSIDE RISING as Partner:</strong> ${event.westsideRisingPartner ? 'Yes' : 'No'}</p>
                    <p><strong>Expected Attendees:</strong> ${event.expectedAttendees || 'Not specified'}</p>
                    <p><strong>Registration Required:</strong> ${event.registrationRequired ? 'Yes' : 'No'}</p>
                    ${event.registrationLink ? `<p><strong>Registration Link:</strong> <a href="${event.registrationLink}" target="_blank">${event.registrationLink}</a></p>` : ''}
                    <p><strong>Approved:</strong> ${formatDate(event.approvedAt)}</p>
                </div>
            </div>

            <div class="event-card-actions">
                <a href="event-detail.html?id=${event.id}" class="btn-view-event" target="_blank">
                    <i class="fas fa-eye"></i>
                    View on Site
                </a>
                <button class="btn-delete" onclick="deleteEvent('${event.id}')">
                    <i class="fas fa-trash"></i>
                    Delete Event
                </button>
            </div>
        </div>
    `).join('');
}

// Delete approved event
window.deleteEvent = async function(eventId) {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone and will remove it from the website.')) return;

    try {
        const eventRef = doc(db, 'events', eventId);

        // Delete the event
        await deleteDoc(eventRef);

        alert('Event deleted successfully.');

        // Reload dashboard
        loadDashboard();

    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event. Please try again.');
    }
};
