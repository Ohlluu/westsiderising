import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Load approved events for the events page
async function loadEvents() {
    const eventsGrid = document.getElementById('events-grid');

    if (!eventsGrid) return;

    try {
        // Query only approved events
        const eventsRef = collection(db, 'events');
        const q = query(
            eventsRef,
            where('status', '==', 'approved')
        );

        const querySnapshot = await getDocs(q);

        // Sort events by date in JavaScript
        const events = [];
        querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, data: doc.data() });
        });

        // Sort by event date (newest first)
        events.sort((a, b) => {
            const dateA = new Date(a.data.eventDate);
            const dateB = new Date(b.data.eventDate);
            return dateB - dateA;
        });

        if (events.length === 0) {
            eventsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem;">
                    <i class="fas fa-calendar" style="font-size: 4rem; color: var(--medium-gray); opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p style="color: var(--medium-gray); font-size: 1.1rem;">No upcoming events at this time. Check back soon!</p>
                </div>
            `;
            return;
        }

        // Clear existing events
        eventsGrid.innerHTML = '';

        // Add each approved event to the grid (sorted)
        events.forEach((eventDoc) => {
            const eventCard = createEventCard(eventDoc.data, eventDoc.id);
            eventsGrid.appendChild(eventCard);
        });

    } catch (error) {
        console.error('Error loading events:', error);
        eventsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--primary-red); opacity: 0.5; margin-bottom: 1rem;"></i>
                <p style="color: var(--medium-gray); font-size: 1.1rem;">Error loading events. Please refresh the page.</p>
            </div>
        `;
    }
}

// Create event card HTML
function createEventCard(event, eventId) {
    const eventCard = document.createElement('div');
    eventCard.className = 'event-card fade-in-up';

    const eventDate = new Date(event.eventDate);
    const month = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = eventDate.getDate();

    eventCard.innerHTML = `
        <a href="event-detail.html?id=${eventId}" class="event-link">
            <div class="event-image">
                ${event.eventImage ?
                    `<img src="${event.eventImage}" alt="${event.eventTitle}">` :
                    `<div class="event-placeholder-img">
                        <i class="fas fa-calendar"></i>
                        <span>Event Flyer</span>
                    </div>`
                }
                <div class="event-date-badge">
                    <span class="month">${month}</span>
                    <span class="day">${day}</span>
                </div>
            </div>
            <div class="event-content">
                <div class="event-meta">
                    <span class="event-time"><i class="far fa-clock"></i> ${event.eventTime || 'TBA'}</span>
                    <span class="event-location"><i class="fas fa-map-marker-alt"></i> ${event.eventLocation || 'TBA'}</span>
                </div>
                <h3>${event.eventTitle}</h3>
                <p>${event.eventDescription ? event.eventDescription.substring(0, 150) + '...' : 'Event details coming soon.'}</p>
                <div class="event-footer">
                    <span class="event-type">${event.eventType || 'Event'}</span>
                    <span class="learn-more">Learn More <i class="fas fa-arrow-right"></i></span>
                </div>
            </div>
        </a>
    `;

    return eventCard;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadEvents);
