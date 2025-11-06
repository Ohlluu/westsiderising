// ===================================
// CALENDAR FUNCTIONALITY
// ===================================

document.addEventListener('DOMContentLoaded', function() {

    // Calendar variables
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();

    // Event dates (for demonstration - these would come from a database)
    const eventDates = {
        '2025-12-4': 'holiday-soiree-2025',  // Holiday Soiree
        '2024-3-15': 1,  // Event ID 1
        '2024-3-22': 2,  // Event ID 2
        '2024-4-5': 3,   // Event ID 3
        '2024-4-18': 4,  // Event ID 4
        '2024-5-10': 5,  // Event ID 5
        '2024-5-25': 6   // Event ID 6
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

            // Add click event to navigate to event detail page
            dayCell.addEventListener('click', function() {
                const eventId = eventDates[dateKey];
                window.location.href = `event-detail.html?id=${eventId}`;
            });
        }

        return dayCell;
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
