// Time Clock Module
// Handles employee clock in/out functionality

let timerInterval = null;
let currentClockStatus = null;

// ==================== Timezone Functions ====================

// Get current time in Chicago timezone
function getChicagoTime() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
}

// Format Chicago time for display
function formatChicagoTime(date) {
    if (!date) return '';

    const chicagoDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Chicago' }));

    return chicagoDate.toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Format date only
function formatChicagoDate(date) {
    if (!date) return '';

    return new Date(date.toLocaleString('en-US', { timeZone: 'America/Chicago' })).toLocaleDateString('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ==================== Pay Period Calculation ====================

// Calculate pay period ID from a given date
function calculatePayPeriodId(date) {
    const startDate = new Date('2026-01-11T00:00:00-06:00'); // Jan 11, 2026 in Chicago time
    const checkDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Chicago' }));

    // Calculate days difference
    const diffTime = checkDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Calculate which 14-day period (0-indexed)
    const periodNumber = Math.floor(diffDays / 14);

    // Calculate the start date of this period
    const periodStart = new Date(startDate);
    periodStart.setDate(periodStart.getDate() + (periodNumber * 14));

    // Format as YYYY-MM-DD
    return periodStart.toISOString().split('T')[0];
}

// Get current pay period
function getCurrentPayPeriod() {
    return calculatePayPeriodId(getChicagoTime());
}

// Get pay period date range
function getPayPeriodRange(periodId) {
    const startDate = new Date(periodId + 'T00:00:00-06:00');
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 13);

    return {
        start: startDate,
        end: endDate,
        display: `${formatChicagoDate(startDate)} - ${formatChicagoDate(endDate)}`
    };
}

// ==================== Clock Status Functions ====================

// Check if user is currently clocked in
async function checkClockStatus(userId) {
    try {
        const statusDoc = await db.collection('currentStatus').doc(userId).get();

        if (statusDoc.exists) {
            const data = statusDoc.data();
            return {
                isClockedIn: data.isClockedIn || false,
                currentEntryId: data.currentEntryId || null,
                clockInTime: data.clockInTime ? data.clockInTime.toDate() : null
            };
        }

        return {
            isClockedIn: false,
            currentEntryId: null,
            clockInTime: null
        };
    } catch (error) {
        console.error('Error checking clock status:', error);
        return {
            isClockedIn: false,
            currentEntryId: null,
            clockInTime: null
        };
    }
}

// ==================== Clock In/Out Functions ====================

// Clock In
async function clockIn(userId, userName) {
    try {
        // Check if already clocked in
        const status = await checkClockStatus(userId);
        if (status.isClockedIn) {
            alert('You are already clocked in!');
            return false;
        }

        const now = firebase.firestore.Timestamp.fromDate(getChicagoTime());
        const payPeriodId = getCurrentPayPeriod();

        // Create time entry
        const entryRef = await db.collection('timeEntries').add({
            userId: userId,
            userName: userName,
            clockIn: now,
            clockOut: null,
            totalHours: 0,
            payPeriodId: payPeriodId,
            status: 'active',
            editHistory: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update current status
        await db.collection('currentStatus').doc(userId).set({
            isClockedIn: true,
            currentEntryId: entryRef.id,
            clockInTime: now
        });

        return true;
    } catch (error) {
        console.error('Error clocking in:', error);
        alert('Failed to clock in. Please try again.');
        return false;
    }
}

// Clock Out
async function clockOut(userId, currentEntryId) {
    try {
        const now = firebase.firestore.Timestamp.fromDate(getChicagoTime());

        // Get the entry to calculate hours
        const entryDoc = await db.collection('timeEntries').doc(currentEntryId).get();
        if (!entryDoc.exists) {
            throw new Error('Time entry not found');
        }

        const entryData = entryDoc.data();
        const clockInTime = entryData.clockIn.toDate();
        const clockOutTime = now.toDate();

        // Calculate total hours
        const diffMs = clockOutTime - clockInTime;
        const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

        // Update time entry
        await db.collection('timeEntries').doc(currentEntryId).update({
            clockOut: now,
            totalHours: totalHours,
            status: 'completed',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update current status
        await db.collection('currentStatus').doc(userId).set({
            isClockedIn: false,
            currentEntryId: null,
            clockInTime: null
        });

        return { success: true, totalHours };
    } catch (error) {
        console.error('Error clocking out:', error);
        alert('Failed to clock out. Please try again.');
        return { success: false };
    }
}

// ==================== UI Update Functions ====================

// Handle clock action button click
async function handleClockAction() {
    if (!currentUser) {
        alert('Please sign in first');
        return;
    }

    const btn = document.getElementById('clock-btn');
    btn.disabled = true;

    const status = currentClockStatus;

    if (status.isClockedIn) {
        // Clock Out
        const result = await clockOut(currentUser.uid, status.currentEntryId);
        if (result.success) {
            alert(`Clocked out successfully! Total hours: ${result.totalHours}`);
            await updateTimeclockUI();
        }
    } else {
        // Clock In
        const userName = currentUser.displayName || currentUser.email.split('@')[0];
        const success = await clockIn(currentUser.uid, userName);
        if (success) {
            await updateTimeclockUI();
        }
    }

    btn.disabled = false;
}

// Update the entire time clock UI
async function updateTimeclockUI() {
    if (!currentUser) return;

    const status = await checkClockStatus(currentUser.uid);
    currentClockStatus = status;

    const statusMessage = document.getElementById('status-message');
    const timerContainer = document.getElementById('timer-container');
    const clockBtn = document.getElementById('clock-btn');
    const clockInTimeEl = document.getElementById('clock-in-time');

    if (status.isClockedIn) {
        // User is clocked in
        statusMessage.textContent = 'You are currently clocked in';
        timerContainer.style.display = 'block';
        clockInTimeEl.textContent = `Clocked in at: ${formatChicagoTime(status.clockInTime)}`;

        clockBtn.className = 'clock-btn clock-out';
        clockBtn.innerHTML = '<i class="fas fa-stop"></i> Clock Out';

        // Start live timer
        startLiveTimer(status.clockInTime);
    } else {
        // User is clocked out
        statusMessage.textContent = 'Welcome! Ready to clock in?';
        timerContainer.style.display = 'none';

        clockBtn.className = 'clock-btn clock-in';
        clockBtn.innerHTML = '<i class="fas fa-clock"></i> Clock In';

        // Stop live timer
        stopLiveTimer();
    }

    // Reset stat cards — they load on click
    ['hours-today', 'hours-week', 'hours-period', 'hours-last-period'].forEach(id => {
        document.getElementById(id).textContent = '—';
    });
    activeStatType = null;
    document.querySelectorAll('.stat-card-btn').forEach(c => c.classList.remove('stat-card-active'));
    const panel = document.getElementById('stat-detail-panel');
    if (panel) panel.style.display = 'none';

    await loadRecentEntries(currentUser.uid);
}

// Start live timer
function startLiveTimer(clockInTime) {
    stopLiveTimer(); // Clear any existing timer

    function updateTimer() {
        const now = getChicagoTime();
        const diff = now - clockInTime;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.getElementById('timer-display').textContent = display;
    }

    updateTimer(); // Initial update
    timerInterval = setInterval(updateTimer, 1000);
}

// Stop live timer
function stopLiveTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ==================== Stats Functions ====================

// Load daily hours
async function loadDailyHours(userId) {
    try {
        // Get today's date in Chicago timezone
        const todayChicago = new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago' });

        // Query all entries for this user (we'll filter by date on client side)
        const snapshot = await db.collection('timeEntries')
            .where('userId', '==', userId)
            .get();

        let totalHours = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const clockInDate = data.clockIn.toDate();

            // Convert clock in time to Chicago date string
            const clockInChicagoDate = clockInDate.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });

            // Check if this entry is from today (Chicago time)
            if (clockInChicagoDate === todayChicago) {
                if (data.status === 'completed' && data.totalHours) {
                    totalHours += data.totalHours;
                } else if (data.status === 'active' && data.clockIn) {
                    // Calculate current hours for active entry
                    const now = new Date();
                    const clockInTime = data.clockIn.toDate();
                    const diffMs = now - clockInTime;
                    const hours = diffMs / (1000 * 60 * 60);
                    totalHours += hours;
                }
            }
        });

        document.getElementById('hours-today').textContent = totalHours.toFixed(1);
    } catch (error) {
        console.error('Error loading daily hours:', error);
        document.getElementById('hours-today').textContent = '0.0';
    }
}

// Load weekly hours
async function loadWeeklyHours(userId) {
    try {
        // Get current date in Chicago timezone
        const now = new Date();
        const chicagoNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
        const dayOfWeek = chicagoNow.getDay(); // 0 = Sunday, 1 = Monday, etc.

        // Calculate start of week (Sunday) in Chicago time
        const startOfWeekChicago = new Date(chicagoNow);
        startOfWeekChicago.setDate(chicagoNow.getDate() - dayOfWeek);
        startOfWeekChicago.setHours(0, 0, 0, 0);

        // Query all entries for this user
        const snapshot = await db.collection('timeEntries')
            .where('userId', '==', userId)
            .get();

        let totalHours = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const clockInDate = data.clockIn.toDate();

            // Convert clock in to Chicago time for comparison
            const clockInChicago = new Date(clockInDate.toLocaleString('en-US', { timeZone: 'America/Chicago' }));

            // Check if this entry is from this week
            if (clockInChicago >= startOfWeekChicago) {
                if (data.status === 'completed' && data.totalHours) {
                    totalHours += data.totalHours;
                } else if (data.status === 'active' && data.clockIn) {
                    // Calculate current hours for active entry
                    const now = new Date();
                    const clockInTime = data.clockIn.toDate();
                    const diffMs = now - clockInTime;
                    const hours = diffMs / (1000 * 60 * 60);
                    totalHours += hours;
                }
            }
        });

        document.getElementById('hours-week').textContent = totalHours.toFixed(1);
    } catch (error) {
        console.error('Error loading weekly hours:', error);
        document.getElementById('hours-week').textContent = '0.0';
    }
}

// Load last pay period hours
async function loadLastPayPeriodHours(userId) {
    try {
        const currentPeriodId = getCurrentPayPeriod();
        const currentStart = new Date(currentPeriodId + 'T00:00:00-06:00');

        // Last period starts 14 days before the current one
        const lastStart = new Date(currentStart);
        lastStart.setDate(lastStart.getDate() - 14);
        const lastEnd = new Date(currentStart); // exclusive — same as current period start

        const snapshot = await db.collection('timeEntries')
            .where('userId', '==', userId)
            .where('clockIn', '>=', firebase.firestore.Timestamp.fromDate(lastStart))
            .where('clockIn', '<', firebase.firestore.Timestamp.fromDate(lastEnd))
            .get();

        let totalHours = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'completed' && data.totalHours) {
                totalHours += data.totalHours;
            }
        });

        document.getElementById('hours-last-period').textContent = totalHours.toFixed(1);
    } catch (error) {
        console.error('Error loading last pay period hours:', error);
        document.getElementById('hours-last-period').textContent = '0.0';
    }
}

// Load pay period hours
async function loadPayPeriodHours(userId, periodId) {
    try {
        // Query by date range so entries saved under old payPeriodId values still count
        const periodStart = new Date(periodId + 'T00:00:00-06:00');
        const periodEndExclusive = new Date(periodStart);
        periodEndExclusive.setDate(periodEndExclusive.getDate() + 14);

        const snapshot = await db.collection('timeEntries')
            .where('userId', '==', userId)
            .where('clockIn', '>=', firebase.firestore.Timestamp.fromDate(periodStart))
            .where('clockIn', '<', firebase.firestore.Timestamp.fromDate(periodEndExclusive))
            .get();

        let totalHours = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'completed' && data.totalHours) {
                totalHours += data.totalHours;
            } else if (data.status === 'active' && data.clockIn) {
                // Calculate current hours for active entry
                const now = getChicagoTime();
                const clockInTime = data.clockIn.toDate();
                const diffMs = now - clockInTime;
                const hours = diffMs / (1000 * 60 * 60);
                totalHours += hours;
            }
        });

        document.getElementById('hours-period').textContent = totalHours.toFixed(1);
    } catch (error) {
        console.error('Error loading pay period hours:', error);
        document.getElementById('hours-period').textContent = '0.0';
    }
}

// Load recent entries
async function loadRecentEntries(userId) {
    try {
        const snapshot = await db.collection('timeEntries')
            .where('userId', '==', userId)
            .orderBy('clockIn', 'desc')
            .limit(10)
            .get();

        const listEl = document.getElementById('recent-entries-list');

        if (snapshot.empty) {
            listEl.innerHTML = '<div class="empty-state"><i class="fas fa-clock"></i><h4>No time entries yet</h4><p>Clock in to start tracking your time.</p></div>';
            return;
        }

        listEl.innerHTML = '';

        snapshot.forEach(doc => {
            const data = doc.data();
            const clockIn = data.clockIn.toDate();
            const clockOut = data.clockOut ? data.clockOut.toDate() : null;

            const entryDiv = document.createElement('div');
            entryDiv.className = 'entry-item';

            let hoursDisplay = '';
            if (data.status === 'active') {
                hoursDisplay = '<span class="entry-status active">In Progress</span>';
            } else {
                hoursDisplay = `<span class="entry-hours">${data.totalHours.toFixed(2)} hrs</span>`;
            }

            entryDiv.innerHTML = `
                <div>
                    <div class="entry-date">${formatChicagoDate(clockIn)}</div>
                    <div class="entry-times">
                        ${clockIn.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        ${clockOut ? ' - ' + clockOut.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
                    </div>
                </div>
                ${hoursDisplay}
            `;

            listEl.appendChild(entryDiv);
        });
    } catch (error) {
        console.error('Error loading recent entries:', error);
        document.getElementById('recent-entries-list').innerHTML = '<div class="message error"><i class="fas fa-exclamation-circle"></i> Error loading entries</div>';
    }
}

// ==================== Stat Card Detail Panel ====================

let activeStatType = null;

async function showStatDetail(type) {
    if (!currentUser) return;

    const panel = document.getElementById('stat-detail-panel');

    // Toggle off if same card clicked again
    if (activeStatType === type) {
        activeStatType = null;
        panel.style.display = 'none';
        document.querySelectorAll('.stat-card-btn').forEach(c => c.classList.remove('stat-card-active'));
        return;
    }

    activeStatType = type;

    // Highlight active card
    document.querySelectorAll('.stat-card-btn').forEach(c => c.classList.remove('stat-card-active'));
    document.querySelector(`[onclick="showStatDetail('${type}')"]`).classList.add('stat-card-active');

    // Load the stat number into the card
    switch (type) {
        case 'today':      await loadDailyHours(currentUser.uid); break;
        case 'week':       await loadWeeklyHours(currentUser.uid); break;
        case 'period':     await loadPayPeriodHours(currentUser.uid, getCurrentPayPeriod()); break;
        case 'lastperiod': await loadLastPayPeriodHours(currentUser.uid); break;
    }

    // Show panel with spinner
    panel.style.display = 'block';
    panel.innerHTML = '<div class="stat-detail-loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    const titleMap = {
        today: "Today's Entries",
        week: "This Week's Breakdown",
        period: "This Pay Period's Entries",
        lastperiod: "Last Pay Period's Entries"
    };

    try {
        let entries = [];

        if (type === 'today') {
            const todayChicago = new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
            const snapshot = await db.collection('timeEntries').where('userId', '==', currentUser.uid).get();
            snapshot.forEach(doc => {
                const data = doc.data();
                const clockInDate = data.clockIn.toDate().toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
                if (clockInDate === todayChicago) {
                    entries.push({ ...data, clockIn: data.clockIn.toDate(), clockOut: data.clockOut ? data.clockOut.toDate() : null });
                }
            });

        } else if (type === 'week') {
            const chicagoNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
            const startOfWeek = new Date(chicagoNow);
            startOfWeek.setDate(chicagoNow.getDate() - chicagoNow.getDay());
            startOfWeek.setHours(0, 0, 0, 0);

            const snapshot = await db.collection('timeEntries').where('userId', '==', currentUser.uid).get();
            snapshot.forEach(doc => {
                const data = doc.data();
                const clockInChicago = new Date(data.clockIn.toDate().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
                if (clockInChicago >= startOfWeek) {
                    entries.push({ ...data, clockIn: data.clockIn.toDate(), clockOut: data.clockOut ? data.clockOut.toDate() : null });
                }
            });

        } else if (type === 'period') {
            const periodId = getCurrentPayPeriod();
            const periodStart = new Date(periodId + 'T00:00:00-06:00');
            const periodEnd = new Date(periodStart);
            periodEnd.setDate(periodEnd.getDate() + 14);

            const snapshot = await db.collection('timeEntries')
                .where('userId', '==', currentUser.uid)
                .where('clockIn', '>=', firebase.firestore.Timestamp.fromDate(periodStart))
                .where('clockIn', '<', firebase.firestore.Timestamp.fromDate(periodEnd))
                .orderBy('clockIn', 'desc')
                .get();
            snapshot.forEach(doc => {
                const data = doc.data();
                entries.push({ ...data, clockIn: data.clockIn.toDate(), clockOut: data.clockOut ? data.clockOut.toDate() : null });
            });

        } else if (type === 'lastperiod') {
            const currentStart = new Date(getCurrentPayPeriod() + 'T00:00:00-06:00');
            const lastStart = new Date(currentStart);
            lastStart.setDate(lastStart.getDate() - 14);

            const snapshot = await db.collection('timeEntries')
                .where('userId', '==', currentUser.uid)
                .where('clockIn', '>=', firebase.firestore.Timestamp.fromDate(lastStart))
                .where('clockIn', '<', firebase.firestore.Timestamp.fromDate(currentStart))
                .orderBy('clockIn', 'desc')
                .get();
            snapshot.forEach(doc => {
                const data = doc.data();
                entries.push({ ...data, clockIn: data.clockIn.toDate(), clockOut: data.clockOut ? data.clockOut.toDate() : null });
            });
        }

        // Sort newest first
        entries.sort((a, b) => b.clockIn - a.clockIn);

        if (entries.length === 0) {
            panel.innerHTML = `<div class="stat-detail-header">${titleMap[type]}</div><div class="stat-detail-empty">No entries found.</div>`;
            return;
        }

        // For week view, group by day
        if (type === 'week') {
            const dayMap = new Map();
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            entries.forEach(entry => {
                const dayKey = entry.clockIn.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
                if (!dayMap.has(dayKey)) dayMap.set(dayKey, { label: formatChicagoDate(entry.clockIn), hours: 0 });
                if (entry.status === 'completed' && entry.totalHours) dayMap.get(dayKey).hours += entry.totalHours;
            });

            let rows = '';
            dayMap.forEach(day => {
                rows += `<tr><td>${day.label}</td><td>${day.hours.toFixed(2)} hrs</td></tr>`;
            });

            panel.innerHTML = `
                <div class="stat-detail-header">${titleMap[type]}</div>
                <table class="stat-detail-table">
                    <thead><tr><th>Day</th><th>Hours</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>`;
        } else {
            let rows = '';
            entries.forEach(entry => {
                const clockInTime = entry.clockIn.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                const clockOutTime = entry.clockOut ? entry.clockOut.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—';
                const hours = entry.status === 'active' ? '<span class="entry-status active">In Progress</span>' : `${entry.totalHours.toFixed(2)} hrs`;
                rows += `<tr><td>${formatChicagoDate(entry.clockIn)}</td><td>${clockInTime}</td><td>${clockOutTime}</td><td>${hours}</td></tr>`;
            });

            panel.innerHTML = `
                <div class="stat-detail-header">${titleMap[type]}</div>
                <table class="stat-detail-table">
                    <thead><tr><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Hours</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>`;
        }

    } catch (error) {
        console.error('Error loading stat detail:', error);
        panel.innerHTML = '<div class="stat-detail-empty">Error loading data. Please try again.</div>';
    }
}

// ==================== Initialize ====================

// Initialize time clock when tab is loaded
function initializeTimeClock() {
    if (!currentUser) {
        alert('Please sign in first');
        return;
    }

    updateTimeclockUI();

}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    stopLiveTimer();
});
