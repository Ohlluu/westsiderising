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

// Load approved events for the calendar
export async function loadCalendarEvents() {
    try {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, where('status', '==', 'approved'));
        const querySnapshot = await getDocs(q);

        const eventDates = {};

        querySnapshot.forEach((doc) => {
            const event = doc.data();
            const eventDate = parseDateSafe(event.eventDate);

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
                time: formatTime(event.eventTime),
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
