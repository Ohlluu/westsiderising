import { auth, db } from './firebase-config.js?v=5';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Helper function to format time from 24-hour to 12-hour format with AM/PM
function formatTime(timeString) {
    if (!timeString) return 'N/A';

    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minutes} ${ampm}`;
}

// Helper function to parse date string in local timezone (not UTC)
function parseDateSafe(dateString) {
    if (!dateString) return null;

    if (dateString.includes('T')) {
        return new Date(dateString);
    }

    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    return new Date(year, month - 1, day);
}

// Helper function to format a Firestore Timestamp or ISO string for display
function formatTimestamp(ts) {
    if (!ts) return 'N/A';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Check if user is logged in and has proper role
onAuthStateChanged(auth, async (user) => {
    console.log('Auth state changed:', user ? `Logged in as ${user.email}` : 'Not logged in');
    if (!user) {
        console.log('Redirecting to login page...');
        window.location.href = 'admin-login.html';
    } else {
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const role = userDoc.data().role || 'employee';

                if (role === 'superadmin' || role === 'manager') {
                    console.log('Loading dashboard... Role:', role);
                    loadDashboard();
                } else {
                    console.log('Employee detected, redirecting to Time Clock...');
                    window.location.href = 'time-clock.html';
                }
            } else {
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

// =============================================
// TAB SWITCHING
// =============================================
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.style.display = 'none';
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const panel = document.getElementById(`tab-${tabName}`);
    if (panel) panel.style.display = 'block';
    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');
};

// =============================================
// LOAD DASHBOARD DATA
// =============================================
async function loadDashboard() {
    try {
        // Load events
        const eventsRef = collection(db, 'events');
        const eventsSnapshot = await getDocs(eventsRef);

        let pendingCount = 0;
        let approvedCount = 0;
        const pendingEvents = [];
        const approvedEvents = [];

        eventsSnapshot.forEach((docSnap) => {
            const event = { id: docSnap.id, ...docSnap.data() };

            if (event.status === 'pending') {
                pendingCount++;
                pendingEvents.push(event);
            } else if (event.status === 'approved') {
                approvedCount++;
                approvedEvents.push(event);
            }
        });

        document.getElementById('pending-count').textContent = pendingCount;
        document.getElementById('approved-count').textContent = approvedCount;
        document.getElementById('total-count').textContent = eventsSnapshot.size;

        // Update events tab badge with pending count
        const eventsBadge = document.getElementById('badge-events');
        if (eventsBadge) {
            eventsBadge.textContent = pendingCount;
            eventsBadge.classList.toggle('tab-badge-new', pendingCount > 0);
        }

        displayPendingEvents(pendingEvents);
        displayApprovedEvents(approvedEvents);

        // Load all 3 application types in parallel
        await Promise.all([
            loadApplications('volunteerApplications',   'volunteer-apps-container',   'volunteer-count',   'badge-volunteers',   'volunteer-new-label',   displayVolunteerApplications),
            loadApplications('partnershipApplications', 'partnership-apps-container', 'partnership-count', 'badge-partnerships', 'partnership-new-label', displayPartnershipApplications),
            loadApplications('joinTeamApplications',    'jointeam-apps-container',    'jointeam-count',    'badge-jointeam',     'jointeam-new-label',    displayJoinTeamApplications)
        ]);

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

// =============================================
// GENERIC APPLICATION LOADER
// =============================================
async function loadApplications(collectionName, containerId, statCountId, badgeId, newLabelId, displayFn) {
    try {
        const appsSnapshot = await getDocs(collection(db, collectionName));

        const apps = [];
        let newCount = 0;

        appsSnapshot.forEach((docSnap) => {
            const app = { id: docSnap.id, ...docSnap.data() };
            apps.push(app);
            if (app.status === 'new') newCount++;
        });

        // Sort newest first
        apps.sort((a, b) => {
            const tA = a.submittedAt?.toMillis?.() ?? 0;
            const tB = b.submittedAt?.toMillis?.() ?? 0;
            return tB - tA;
        });

        const statEl = document.getElementById(statCountId);
        if (statEl) statEl.textContent = apps.length;

        const badgeEl = document.getElementById(badgeId);
        if (badgeEl) {
            badgeEl.textContent = apps.length;
            badgeEl.classList.toggle('tab-badge-new', newCount > 0);
        }

        const labelEl = document.getElementById(newLabelId);
        if (labelEl) {
            labelEl.textContent = newCount > 0 ? `${newCount} new` : '';
        }

        displayFn(apps, containerId);

    } catch (error) {
        console.error(`Error loading ${collectionName}:`, error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading applications. Please refresh.</p></div>`;
        }
    }
}

// =============================================
// TOGGLE APPLICATION DETAILS
// =============================================
window.toggleAppDetails = function(appId) {
    const detailsSection = document.getElementById(`details-${appId}`);
    const button = document.querySelector(`[data-app-id="${appId}"] .btn-view-details`);

    if (detailsSection.style.display === 'none') {
        detailsSection.style.display = 'block';
        if (button) button.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Details';
    } else {
        detailsSection.style.display = 'none';
        if (button) button.innerHTML = '<i class="fas fa-chevron-down"></i> View Details';
    }
};

// =============================================
// MARK APPLICATION AS REVIEWED
// =============================================
window.markAsReviewed = async function(collectionName, appId, buttonEl) {
    try {
        buttonEl.disabled = true;
        buttonEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        await updateDoc(doc(db, collectionName, appId), {
            status: 'reviewed',
            reviewedAt: new Date().toISOString()
        });
        loadDashboard();
    } catch (error) {
        console.error('Error marking as reviewed:', error);
        alert('Error updating application. Please try again.');
        buttonEl.disabled = false;
        buttonEl.innerHTML = '<i class="fas fa-check"></i> Mark as Reviewed';
    }
};

// =============================================
// DELETE APPLICATION
// =============================================
window.deleteApplication = async function(collectionName, appId) {
    if (!confirm('Are you sure you want to delete this application? This cannot be undone.')) return;

    try {
        await deleteDoc(doc(db, collectionName, appId));
        loadDashboard();
    } catch (error) {
        console.error('Error deleting application:', error);
        alert('Error deleting application. Please try again.');
    }
};

// =============================================
// DISPLAY VOLUNTEER APPLICATIONS
// =============================================
function displayVolunteerApplications(apps, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (apps.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-hands-helping"></i><p>No volunteer applications yet</p></div>`;
        return;
    }

    container.innerHTML = apps.map(app => {
        const isNew = app.status === 'new';
        const interestsDisplay = Array.isArray(app.interests)
            ? app.interests.join(', ')
            : (app.interests || 'N/A');

        return `
        <div class="event-card-admin app-card ${isNew ? 'app-card-new' : 'app-card-reviewed'}" data-app-id="${app.id}">
            <div class="event-card-header">
                <div>
                    <h3>${app.firstName || ''} ${app.lastName || ''}</h3>
                    <span class="event-badge ${isNew ? '' : 'reviewed-badge'}">${isNew ? 'New' : 'Reviewed'}</span>
                </div>
                <button class="btn-view-details" onclick="toggleAppDetails('${app.id}')">
                    <i class="fas fa-chevron-down"></i> View Details
                </button>
            </div>

            <div class="event-card-info">
                <div class="info-item"><i class="fas fa-envelope"></i><span>${app.email || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-phone"></i><span>${app.phone || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-clock"></i><span>${app.availability || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-calendar-plus"></i><span>${formatTimestamp(app.submittedAt)}</span></div>
            </div>

            <div class="event-details-expand" id="details-${app.id}" style="display: none;">
                <div class="details-section">
                    <h4><i class="fas fa-map-marker-alt"></i> Address</h4>
                    <p>${[app.address, app.city, app.zipCode].filter(Boolean).join(', ') || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-star"></i> Areas of Interest</h4>
                    <p>${interestsDisplay}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-tools"></i> Skills & Experience</h4>
                    <p>${app.skills || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-heart"></i> Motivation</h4>
                    <p>${app.motivation || 'N/A'}</p>
                </div>
            </div>

            <div class="event-card-actions">
                ${isNew ? `
                    <button class="btn-approve" onclick="markAsReviewed('volunteerApplications', '${app.id}', this)">
                        <i class="fas fa-check"></i> Mark as Reviewed
                    </button>
                ` : `
                    <span class="reviewed-label"><i class="fas fa-check-circle"></i> Reviewed</span>
                `}
                <a href="mailto:${app.email}" class="btn-view-event">
                    <i class="fas fa-envelope"></i> Email Applicant
                </a>
                <button class="btn-delete" onclick="deleteApplication('volunteerApplications', '${app.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// =============================================
// DISPLAY PARTNERSHIP APPLICATIONS
// =============================================
function displayPartnershipApplications(apps, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (apps.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-handshake"></i><p>No partnership applications yet</p></div>`;
        return;
    }

    container.innerHTML = apps.map(app => {
        const isNew = app.status === 'new';
        const partnershipTypeDisplay = Array.isArray(app.partnershipType)
            ? app.partnershipType.join(', ')
            : (app.partnershipType || 'N/A');
        const commitmentsDisplay = Array.isArray(app.commitments)
            ? app.commitments.join(', ')
            : (app.commitments || 'N/A');
        const agreementDisplay = Array.isArray(app.agreementTerms)
            ? app.agreementTerms.join(', ')
            : (app.agreementTerms || 'N/A');
        const contactEmail = app.email || app.emailAddress || '';

        return `
        <div class="event-card-admin app-card ${isNew ? 'app-card-new' : 'app-card-reviewed'}" data-app-id="${app.id}">
            <div class="event-card-header">
                <div>
                    <h3>${app.entityName || 'Unknown Organization'}</h3>
                    <span class="event-badge ${isNew ? '' : 'reviewed-badge'}">${isNew ? 'New' : 'Reviewed'}</span>
                </div>
                <button class="btn-view-details" onclick="toggleAppDetails('${app.id}')">
                    <i class="fas fa-chevron-down"></i> View Details
                </button>
            </div>

            <div class="event-card-info">
                <div class="info-item"><i class="fas fa-envelope"></i><span>${contactEmail || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-tags"></i><span>${partnershipTypeDisplay}</span></div>
                <div class="info-item"><i class="fas fa-user-tie"></i><span>${app.authorizedRep || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-calendar-plus"></i><span>${formatTimestamp(app.submittedAt)}</span></div>
            </div>

            <div class="event-details-expand" id="details-${app.id}" style="display: none;">
                <div class="details-section">
                    <h4><i class="fas fa-envelope"></i> Contact Info</h4>
                    <div class="contact-info">
                        <p><strong>Primary Email:</strong> ${app.email || 'N/A'}</p>
                        <p><strong>Email Address:</strong> ${app.emailAddress || 'N/A'}</p>
                        <p><strong>Contacts:</strong> ${app.contacts || 'N/A'}</p>
                    </div>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-handshake"></i> Partnership Type</h4>
                    <p>${partnershipTypeDisplay}${app.partnershipTypeOther ? ` (Other: ${app.partnershipTypeOther})` : ''}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-list-check"></i> Commitments</h4>
                    <p>${commitmentsDisplay}${app.commitmentsOther ? ` (Other: ${app.commitmentsOther})` : ''}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-life-ring"></i> Support Needed</h4>
                    <p>${app.support || 'N/A'}${app.supportOther ? ` (Other: ${app.supportOther})` : ''}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-file-contract"></i> Agreement Terms</h4>
                    <p>${agreementDisplay}${app.agreementOther ? ` (Other: ${app.agreementOther})` : ''}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-calendar-check"></i> Completion Date</h4>
                    <p>${app.completionDate || 'N/A'}</p>
                </div>
            </div>

            <div class="event-card-actions">
                ${isNew ? `
                    <button class="btn-approve" onclick="markAsReviewed('partnershipApplications', '${app.id}', this)">
                        <i class="fas fa-check"></i> Mark as Reviewed
                    </button>
                ` : `
                    <span class="reviewed-label"><i class="fas fa-check-circle"></i> Reviewed</span>
                `}
                ${contactEmail ? `
                    <a href="mailto:${contactEmail}" class="btn-view-event">
                        <i class="fas fa-envelope"></i> Email Applicant
                    </a>
                ` : ''}
                <button class="btn-delete" onclick="deleteApplication('partnershipApplications', '${app.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// =============================================
// DISPLAY JOIN TEAM APPLICATIONS
// =============================================
function displayJoinTeamApplications(apps, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (apps.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-user-tie"></i><p>No join team applications yet</p></div>`;
        return;
    }

    container.innerHTML = apps.map(app => {
        const isNew = app.status === 'new';
        const skillsDisplay = Array.isArray(app.skills)
            ? app.skills.join(', ')
            : (app.skills || 'N/A');

        return `
        <div class="event-card-admin app-card ${isNew ? 'app-card-new' : 'app-card-reviewed'}" data-app-id="${app.id}">
            <div class="event-card-header">
                <div>
                    <h3>${app.firstName || ''} ${app.lastName || ''}</h3>
                    <span class="event-badge ${isNew ? '' : 'reviewed-badge'}">${isNew ? 'New' : 'Reviewed'}</span>
                </div>
                <button class="btn-view-details" onclick="toggleAppDetails('${app.id}')">
                    <i class="fas fa-chevron-down"></i> View Details
                </button>
            </div>

            <div class="event-card-info">
                <div class="info-item"><i class="fas fa-envelope"></i><span>${app.email || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-briefcase"></i><span>${app.positionDisplay || app.positionInterest || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-clock"></i><span>${app.employmentType || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-calendar-plus"></i><span>${formatTimestamp(app.submittedAt)}</span></div>
            </div>

            <div class="event-details-expand" id="details-${app.id}" style="display: none;">
                <div class="details-section">
                    <h4><i class="fas fa-address-card"></i> Contact Info</h4>
                    <div class="contact-info">
                        <p><strong>Phone:</strong> ${app.phone || 'N/A'}</p>
                        <p><strong>Address:</strong> ${[app.address, app.city, app.zipCode].filter(Boolean).join(', ') || 'N/A'}</p>
                        <p><strong>Email:</strong> <a href="mailto:${app.email}">${app.email}</a></p>
                    </div>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-calendar-day"></i> Availability</h4>
                    <p><strong>Start Date:</strong> ${app.startDate || 'N/A'}</p>
                    <p><strong>Employment Type:</strong> ${app.employmentType || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-graduation-cap"></i> Education</h4>
                    <p>${app.education || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-history"></i> Experience</h4>
                    <p>${app.experience || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-tools"></i> Skills</h4>
                    <p>${skillsDisplay}${app.skillsOther ? ` (Other: ${app.skillsOther})` : ''}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-heart"></i> Motivation</h4>
                    <p>${app.motivation || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-users"></i> References</h4>
                    <p>${app.references || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-question-circle"></i> How They Heard About Us</h4>
                    <p>${app.hearAbout || 'N/A'}</p>
                </div>
                ${app.resumeFilename ? `
                <div class="details-section">
                    <h4><i class="fas fa-file-alt"></i> Resume</h4>
                    <p>${app.resumeFilename}</p>
                </div>
                ` : ''}
            </div>

            <div class="event-card-actions">
                ${isNew ? `
                    <button class="btn-approve" onclick="markAsReviewed('joinTeamApplications', '${app.id}', this)">
                        <i class="fas fa-check"></i> Mark as Reviewed
                    </button>
                ` : `
                    <span class="reviewed-label"><i class="fas fa-check-circle"></i> Reviewed</span>
                `}
                <a href="mailto:${app.email}" class="btn-view-event">
                    <i class="fas fa-envelope"></i> Email Applicant
                </a>
                <button class="btn-delete" onclick="deleteApplication('joinTeamApplications', '${app.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// =============================================
// EVENTS: EXISTING FUNCTIONS (UNCHANGED)
// =============================================

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

        await updateDoc(eventRef, {
            status: 'approved',
            approvedAt: new Date().toISOString()
        });

        alert('Event approved successfully! It will now appear on the website.');
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
        await deleteDoc(doc(db, 'events', eventId));
        alert('Event rejected and deleted.');
        loadDashboard();

    } catch (error) {
        console.error('Error rejecting event:', error);
        alert('Error rejecting event. Please try again.');
    }
};

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
        await deleteDoc(doc(db, 'events', eventId));
        alert('Event deleted successfully.');
        loadDashboard();

    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event. Please try again.');
    }
};
