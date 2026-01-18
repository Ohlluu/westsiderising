// ===================================
// CALENDAR FUNCTIONALITY
// ===================================

document.addEventListener('DOMContentLoaded', function() {

    // Calendar variables
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();

    // Event dates - will be loaded from Firebase
    let eventDates = window.firebaseEventDates || {};

    // Function to reload calendar with Firebase events
    window.reloadCalendar = function() {
        eventDates = window.firebaseEventDates || {};
        renderCalendar(currentMonth, currentYear);
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // DOM elements
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearDisplay = document.getElementById('calendar-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const sidebar = document.getElementById('calendar-sidebar');
    const sidebarDate = document.getElementById('sidebar-date');
    const sidebarContent = document.getElementById('sidebar-content');
    const sidebarClose = document.getElementById('sidebar-close');

    // Check if calendar elements exist (only on events page)
    if (!calendarGrid) return;

    // Initialize calendar
    renderCalendar(currentMonth, currentYear);

    // Event listeners
    prevMonthBtn.addEventListener('click', function() {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar(currentMonth, currentYear);
    });

    nextMonthBtn.addEventListener('click', function() {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar(currentMonth, currentYear);
    });

    // Sidebar close button
    sidebarClose.addEventListener('click', function() {
        sidebar.classList.remove('active');
    });

    // Render calendar function
    function renderCalendar(month, year) {
        // Clear existing calendar
        calendarGrid.innerHTML = '';

        // Update month/year display
        monthYearDisplay.textContent = `${monthNames[month]} ${year}`;

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        // Previous month's trailing days
        for (let i = firstDay - 1; i >= 0; i--) {
            const dayCell = createDayCell(daysInPrevMonth - i, 'other-month');
            calendarGrid.appendChild(dayCell);
        }

        // Current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${year}-${month + 1}-${day}`;
            const isToday = isCurrentDay(day, month, year);
            const hasEvent = eventDates.hasOwnProperty(dateKey);

            const dayCell = createDayCell(day, '', isToday, hasEvent, dateKey);
            calendarGrid.appendChild(dayCell);
        }

        // Next month's leading days
        const totalCells = calendarGrid.children.length;
        const remainingCells = 42 - totalCells; // 6 rows x 7 days = 42
        for (let day = 1; day <= remainingCells; day++) {
            const dayCell = createDayCell(day, 'other-month');
            calendarGrid.appendChild(dayCell);
        }
    }

    // Create individual day cell
    function createDayCell(day, extraClass = '', isToday = false, hasEvent = false, dateKey = '') {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.textContent = day;

        if (extraClass) {
            dayCell.classList.add(extraClass);
        }

        if (isToday) {
            dayCell.classList.add('today');
        }

        if (hasEvent) {
            dayCell.classList.add('has-event');
            dayCell.style.cursor = 'pointer';

            // Add click event to show sidebar with events
            dayCell.addEventListener('click', function() {
                showEventsSidebar(dateKey);
            });
        }

        return dayCell;
    }

    // Show events sidebar
    function showEventsSidebar(dateKey) {
        const events = eventDates[dateKey];
        if (!events || events.length === 0) return;

        // Parse the date
        const [year, month, day] = dateKey.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dateString = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Update sidebar header
        sidebarDate.textContent = dateString;

        // Clear previous content
        sidebarContent.innerHTML = '';

        // Create event cards
        events.forEach(event => {
            const eventCard = document.createElement('a');
            eventCard.href = `event-detail.html?id=${event.id}`;
            eventCard.className = 'sidebar-event-card';

            eventCard.innerHTML = `
                <div class="sidebar-event-image">
                    ${event.image ?
                        `<img src="${event.image}" alt="${event.title}">` :
                        `<div class="sidebar-event-placeholder">
                            <i class="fas fa-calendar"></i>
                        </div>`
                    }
                </div>
                <div class="sidebar-event-info">
                    <span class="sidebar-event-type">${event.type}</span>
                    <h4>${event.title}</h4>
                    <p><i class="far fa-clock"></i> ${event.time}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
                </div>
            `;

            sidebarContent.appendChild(eventCard);
        });

        // Show sidebar
        sidebar.classList.add('active');
    }

    // Check if date is today
    function isCurrentDay(day, month, year) {
        const today = new Date();
        return (
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        );
    }

    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') {
            prevMonthBtn.click();
        } else if (e.key === 'ArrowRight') {
            nextMonthBtn.click();
        }
    });

});
