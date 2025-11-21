import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Load approved events for the events page
async function loadEvents() {
    const upcomingEventsGrid = document.getElementById('upcoming-events-grid');
    const pastEventsGrid = document.getElementById('past-events-grid');

    if (!upcomingEventsGrid || !pastEventsGrid) return;

    try {
        // Query only approved events
        const eventsRef = collection(db, 'events');
        const q = query(
            eventsRef,
            where('status', '==', 'approved')
        );

        const querySnapshot = await getDocs(q);

        // Separate events into upcoming and past
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

        const upcomingEvents = [];
        const pastEvents = [];

        querySnapshot.forEach((doc) => {
            const eventData = { id: doc.id, data: doc.data() };
            const eventDate = parseDateSafe(eventData.data.eventDate);

            // Reset event date time to start of day for comparison
            eventDate.setHours(0, 0, 0, 0);

            if (eventDate >= today) {
                upcomingEvents.push(eventData);
            } else {
                pastEvents.push(eventData);
            }
        });

        // Sort upcoming events by date (soonest first)
        upcomingEvents.sort((a, b) => {
            const dateA = parseDateSafe(a.data.eventDate);
            const dateB = parseDateSafe(b.data.eventDate);
            return dateA - dateB;
        });

        // Sort past events by date (most recent first)
        pastEvents.sort((a, b) => {
            const dateA = parseDateSafe(a.data.eventDate);
            const dateB = parseDateSafe(b.data.eventDate);
            return dateB - dateA;
        });

        // Display upcoming events
        if (upcomingEvents.length === 0) {
            upcomingEventsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem;">
                    <i class="fas fa-calendar" style="font-size: 4rem; color: var(--medium-gray); opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p style="color: var(--medium-gray); font-size: 1.1rem;">No upcoming events at this time. Check back soon!</p>
                </div>
            `;
        } else {
            upcomingEventsGrid.innerHTML = '';
            upcomingEvents.forEach((eventDoc) => {
                const eventCard = createEventCard(eventDoc.data, eventDoc.id, false);
                upcomingEventsGrid.appendChild(eventCard);
            });
        }

        // Display past events (limit to 6 most recent)
        if (pastEvents.length === 0) {
            pastEventsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem;">
                    <i class="fas fa-history" style="font-size: 4rem; color: var(--medium-gray); opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p style="color: var(--medium-gray); font-size: 1.1rem;">No past events to display.</p>
                </div>
            `;
        } else {
            pastEventsGrid.innerHTML = '';
            // Only show the 6 most recent past events
            pastEvents.slice(0, 6).forEach((eventDoc) => {
                const eventCard = createEventCard(eventDoc.data, eventDoc.id, true);
                pastEventsGrid.appendChild(eventCard);
            });
        }

    } catch (error) {
        console.error('Error loading events:', error);
        upcomingEventsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--primary-red); opacity: 0.5; margin-bottom: 1rem;"></i>
                <p style="color: var(--medium-gray); font-size: 1.1rem;">Error loading events. Please refresh the page.</p>
            </div>
        `;
    }
}

// Create event card HTML
function createEventCard(event, eventId, isPast = false) {
    const eventCard = document.createElement('div');
    eventCard.className = `event-card fade-in-up${isPast ? ' past-event' : ''}`;

    const eventDate = parseDateSafe(event.eventDate);
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
                    <span class="event-time"><i class="far fa-clock"></i> ${formatTime(event.eventTime)}</span>
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
