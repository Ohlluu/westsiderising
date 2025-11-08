import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Load approved events for the calendar
export async function loadCalendarEvents() {
    try {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, where('status', '==', 'approved'));
        const querySnapshot = await getDocs(q);

        const eventDates = {};

        querySnapshot.forEach((doc) => {
            const event = doc.data();
            const eventDate = new Date(event.eventDate);

            // Format date key as 'YYYY-M-D'
            const year = eventDate.getFullYear();
            const month = eventDate.getMonth() + 1; // JavaScript months are 0-indexed
            const day = eventDate.getDate();
            const dateKey = `${year}-${month}-${day}`;

            // Initialize array if it doesn't exist
            if (!eventDates[dateKey]) {
                eventDates[dateKey] = [];
            }

            // Add event to the date
            eventDates[dateKey].push({
                id: doc.id,
                title: event.eventTitle,
                time: event.eventTime || 'TBA',
                location: event.eventLocation || 'TBA',
                type: event.eventType || 'Event',
                image: event.eventImage || null
            });
        });

        // Make eventDates available globally for calendar.js
        window.firebaseEventDates = eventDates;

        // Trigger calendar reload if it's already initialized
        if (window.reloadCalendar) {
            window.reloadCalendar();
        }

        return eventDates;

    } catch (error) {
        console.error('Error loading calendar events:', error);
        return {};
    }
}

// Auto-load when module is imported
loadCalendarEvents();
