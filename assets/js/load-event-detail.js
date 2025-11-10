import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Helper function to format time from 24-hour to 12-hour format with AM/PM
function formatTime(timeString) {
    if (!timeString) return 'TBA';

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

// Get event ID from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

async function loadEventDetail() {
    if (!eventId) {
        showError('No event ID provided');
        return;
    }

    try {
        const eventRef = doc(db, 'events', eventId);
        const eventDoc = await getDoc(eventRef);

        if (!eventDoc.exists()) {
            showError('Event not found');
            return;
        }

        const event = eventDoc.data();

        // Check if event is approved
        if (event.status !== 'approved') {
            showError('This event is not available');
            return;
        }

        // Update page title
        document.title = `${event.eventTitle} | Westside Rising`;

        // Update event detail header
        const eventTitle = document.querySelector('.event-detail-title');
        if (eventTitle) eventTitle.textContent = event.eventTitle;

        const eventType = document.querySelector('.event-type-badge');
        if (eventType) eventType.textContent = event.eventType || 'Event';

        // Update event meta
        const eventDate = parseDateSafe(event.eventDate);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const metaItems = document.querySelectorAll('.event-detail-meta .meta-item span');
        if (metaItems[0]) metaItems[0].textContent = formattedDate;
        if (metaItems[1]) metaItems[1].textContent = formatTime(event.eventTime);
        if (metaItems[2]) metaItems[2].textContent = event.eventLocation || 'TBA';

        // Update event image
        const eventImage = document.querySelector('.event-detail-image');
        if (eventImage && event.eventImage) {
            eventImage.innerHTML = `<img src="${event.eventImage}" alt="${event.eventTitle}">`;
        }

        // Update event description
        const descriptionSection = document.querySelector('.event-detail-content');
        if (descriptionSection && event.eventDescription) {
            const aboutSection = descriptionSection.querySelector('p');
            if (aboutSection) {
                aboutSection.textContent = event.eventDescription;
            }
        }

        // Update sidebar info
        const sidebarInfo = document.querySelectorAll('.event-detail-info .info-value');
        if (sidebarInfo[0]) sidebarInfo[0].textContent = formattedDate;
        if (sidebarInfo[1]) sidebarInfo[1].textContent = formatTime(event.eventTime);
        if (sidebarInfo[2]) sidebarInfo[2].textContent = event.eventLocation || 'TBA';

        // Update registration link if available
        if (event.registrationRequired && event.registrationLink) {
            const registerBtn = document.querySelector('.sidebar-card .btn-primary');
            if (registerBtn) {
                registerBtn.href = event.registrationLink;
                registerBtn.target = '_blank';
            }
        }

        // Update Google Maps link
        const directionsLink = document.querySelector('.sidebar-card .btn-secondary');
        if (directionsLink && event.eventLocation) {
            directionsLink.href = `https://maps.google.com/?q=${encodeURIComponent(event.eventLocation)}`;
        }

    } catch (error) {
        console.error('Error loading event:', error);
        showError('Error loading event details');
    }
}

function showError(message) {
    const mainContent = document.querySelector('.event-detail-main');
    if (mainContent) {
        mainContent.innerHTML = `
            <div style="text-align: center; padding: 4rem 2rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--primary-red); opacity: 0.5; margin-bottom: 1rem;"></i>
                <h2 style="color: var(--dark-gray); margin-bottom: 1rem;">${message}</h2>
                <a href="events.html" class="btn btn-primary">
                    <i class="fas fa-arrow-left"></i>
                    Back to Events
                </a>
            </div>
        `;
    }
}

// Load event detail when page loads
document.addEventListener('DOMContentLoaded', loadEventDetail);
