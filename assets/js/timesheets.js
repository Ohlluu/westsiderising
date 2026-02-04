// Timesheets Module
// Handles super admin timesheet management

let currentPeriodId = null;
let allPayPeriods = [];
let currentPeriodIndex = 0;
let clockedInListener = null;
let allEmployeesData = [];
let selectedEmployeeFilter = 'all';

// ==================== Initialization ====================

// Initialize timesheets (super admin only)
function initializeTimesheets() {
    // Get current user from Firebase Auth
    const adminUser = auth.currentUser;

    // Note: userRole should be checked in timeclock-dashboard.js before calling this
    if (!adminUser || (typeof userRole !== 'undefined' && userRole !== 'superadmin')) {
        alert('Access denied. This section is only available to super admins.');
        switchTab('timeclock');
        return;
    }

    // Calculate all pay periods
    allPayPeriods = calculatePayPeriods();
    currentPeriodId = getCurrentPayPeriod();

    // Find current period index
    currentPeriodIndex = allPayPeriods.findIndex(p => p.id === currentPeriodId);
    if (currentPeriodIndex === -1) {
        currentPeriodIndex = allPayPeriods.length - 1;
    }

    // Load current period data
    loadPayPeriodData(currentPeriodId);

    // Listen to currently clocked in status
    listenToClockedInStatus();
}

// ==================== Pay Period Management ====================

// Calculate all pay periods from Jan 6, 2026 to current date
function calculatePayPeriods() {
    const periods = [];
    const startDate = new Date('2026-01-04T00:00:00-06:00');
    const today = getChicagoTime();

    let currentDate = new Date(startDate);

    while (currentDate <= today) {
        const periodId = currentDate.toISOString().split('T')[0];
        const endDate = new Date(currentDate);
        endDate.setDate(endDate.getDate() + 13);

        periods.push({
            id: periodId,
            start: new Date(currentDate),
            end: endDate,
            display: `${formatChicagoDate(currentDate)} - ${formatChicagoDate(endDate)}`
        });

        // Move to next period (14 days later)
        currentDate.setDate(currentDate.getDate() + 14);
    }

    return periods;
}

// Navigate pay periods
function navigatePeriod(direction) {
    currentPeriodIndex += direction;

    // Boundary checks
    if (currentPeriodIndex < 0) {
        currentPeriodIndex = 0;
        return;
    }
    if (currentPeriodIndex >= allPayPeriods.length) {
        currentPeriodIndex = allPayPeriods.length - 1;
        return;
    }

    currentPeriodId = allPayPeriods[currentPeriodIndex].id;
    loadPayPeriodData(currentPeriodId);

    // Update button states
    document.getElementById('prev-period-btn').disabled = currentPeriodIndex === 0;
    document.getElementById('next-period-btn').disabled = currentPeriodIndex === allPayPeriods.length - 1;
}

// ==================== Load Timesheet Data ====================

// Load all data for a pay period
async function loadPayPeriodData(periodId) {
    try {
        // Update period display
        const period = allPayPeriods.find(p => p.id === periodId);
        if (period) {
            document.getElementById('period-display').textContent = period.display;
        }

        // Query all time entries for this period
        const snapshot = await db.collection('timeEntries')
            .where('payPeriodId', '==', periodId)
            .orderBy('clockIn', 'desc')
            .get();

        // Group by employee
        const employeeMap = new Map();

        snapshot.forEach(doc => {
            const data = doc.data();
            const entry = {
                id: doc.id,
                ...data,
                clockIn: data.clockIn.toDate(),
                clockOut: data.clockOut ? data.clockOut.toDate() : null
            };

            if (!employeeMap.has(data.userId)) {
                employeeMap.set(data.userId, {
                    userId: data.userId,
                    userName: data.userName,
                    entries: [],
                    totalHours: 0
                });
            }

            const employee = employeeMap.get(data.userId);
            employee.entries.push(entry);

            if (data.status === 'completed' && data.totalHours) {
                employee.totalHours += data.totalHours;
            }
        });

        // Convert to array
        allEmployeesData = Array.from(employeeMap.values());

        // Fetch proper display names from users collection
        for (let employee of allEmployeesData) {
            try {
                const userDoc = await db.collection('users').doc(employee.userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    // Use displayName if available (check both camelCase and lowercase), otherwise fall back to email prefix
                    employee.userName = userData.displayName || userData.displayname || userData.email?.split('@')[0] || employee.userName;
                }
            } catch (error) {
                console.error('Error fetching user display name:', error);
                // Keep the existing userName if fetch fails
            }
        }

        // Sort by name
        allEmployeesData.sort((a, b) => a.userName.localeCompare(b.userName));

        // Update employee filter dropdown
        updateEmployeeFilter();

        // Display timesheets
        displayTimesheets();

    } catch (error) {
        console.error('Error loading pay period data:', error);
        document.getElementById('timesheet-list').innerHTML = '<div class="message error"><i class="fas fa-exclamation-circle"></i> Error loading timesheet data</div>';
    }
}

// Update employee filter dropdown
function updateEmployeeFilter() {
    const select = document.getElementById('employee-select');
    select.innerHTML = '<option value="all">All Employees</option>';

    allEmployeesData.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee.userId;
        option.textContent = employee.userName;
        select.appendChild(option);
    });

    select.value = selectedEmployeeFilter;
}

// Filter employee timesheets
function filterEmployeeTimesheets() {
    selectedEmployeeFilter = document.getElementById('employee-select').value;
    displayTimesheets();
}

// Display timesheets
function displayTimesheets() {
    const listEl = document.getElementById('timesheet-list');

    let dataToDisplay = allEmployeesData;

    if (selectedEmployeeFilter !== 'all') {
        dataToDisplay = allEmployeesData.filter(emp => emp.userId === selectedEmployeeFilter);
    }

    if (dataToDisplay.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard"></i><h4>No timesheet data</h4><p>No time entries found for this pay period.</p></div>';
        return;
    }

    listEl.innerHTML = '';

    dataToDisplay.forEach(employee => {
        const card = createEmployeeTimesheetCard(employee);
        listEl.appendChild(card);
    });
}

// Create employee timesheet card
function createEmployeeTimesheetCard(employee) {
    const card = document.createElement('div');
    card.className = 'employee-timesheet';

    // Header
    const header = document.createElement('div');
    header.className = 'employee-header';
    header.innerHTML = `
        <div class="employee-name">${employee.userName}</div>
        <div class="employee-total">
            <div class="total-label">Total Hours</div>
            <div class="total-hours">${employee.totalHours.toFixed(2)}</div>
        </div>
    `;
    card.appendChild(header);

    // Entries
    const entriesDiv = document.createElement('div');
    entriesDiv.className = 'timesheet-entries';

    const table = document.createElement('table');
    table.className = 'timesheet-table';

    table.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Hours</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${employee.entries.map(entry => createEntryRow(entry)).join('')}
        </tbody>
    `;

    entriesDiv.appendChild(table);

    // Add Entry Button
    const addBtn = document.createElement('button');
    addBtn.className = 'add-entry-btn';
    addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Manual Entry';
    addBtn.onclick = () => showManualEntryModal(employee.userId, employee.userName);
    entriesDiv.appendChild(addBtn);

    card.appendChild(entriesDiv);

    return card;
}

// Create entry row HTML
function createEntryRow(entry) {
    const clockInDate = formatChicagoDate(entry.clockIn);
    const clockInTime = entry.clockIn.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const clockOutTime = entry.clockOut ? entry.clockOut.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '-';
    const hours = entry.status === 'completed' ? entry.totalHours.toFixed(2) : '-';
    const statusClass = entry.status === 'active' ? 'active' : 'completed';
    const statusText = entry.status === 'active' ? 'In Progress' : 'Completed';

    const hasEditHistory = entry.editHistory && entry.editHistory.length > 0;

    return `
        <tr>
            <td data-label="Date">${clockInDate}</td>
            <td data-label="Clock In">${clockInTime}</td>
            <td data-label="Clock Out">${clockOutTime}</td>
            <td data-label="Hours">${hours}</td>
            <td data-label="Status"><span class="entry-status ${statusClass}">${statusText}</span></td>
            <td data-label="Actions">
                <div class="entry-actions">
                    <button class="action-btn edit" onclick="showEditModal('${entry.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete" onclick="deleteTimeEntry('${entry.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                    ${hasEditHistory ? `
                        <button class="action-btn history" onclick="showAuditTrail('${entry.id}')">
                            <i class="fas fa-history"></i> History
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

// ==================== Currently Clocked In ====================

// Listen to currently clocked in status
function listenToClockedInStatus() {
    // Remove existing listener
    if (clockedInListener) {
        clockedInListener();
    }

    clockedInListener = db.collection('currentStatus')
        .where('isClockedIn', '==', true)
        .onSnapshot(snapshot => {
            const clockedInList = document.getElementById('clocked-in-list');
            const panel = document.getElementById('clocked-in-panel');

            if (snapshot.empty) {
                panel.style.display = 'none';
                return;
            }

            panel.style.display = 'block';
            clockedInList.innerHTML = '';

            snapshot.forEach(doc => {
                const data = doc.data();
                const clockInTime = data.clockInTime.toDate();

                const item = document.createElement('div');
                item.className = 'clocked-in-item';

                // Calculate duration
                const now = getChicagoTime();
                const diff = now - clockInTime;
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                // Get user name from users collection
                db.collection('users').doc(doc.id).get().then(userDoc => {
                    const userData = userDoc.data();
                    const userName = userDoc.exists ? (userData.displayName || userData.displayname || 'Unknown') : 'Unknown';

                    item.innerHTML = `
                        <div class="clocked-in-name">${userName}</div>
                        <div class="clocked-in-time">
                            Since: ${clockInTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </div>
                        <div class="clocked-in-duration">${hours}h ${minutes}m</div>
                    `;

                    clockedInList.appendChild(item);
                });
            });
        }, error => {
            console.error('Error listening to clocked in status:', error);
        });
}

// ==================== Edit Time Entry ====================

// Show edit modal
async function showEditModal(entryId) {
    try {
        const doc = await db.collection('timeEntries').doc(entryId).get();
        if (!doc.exists) {
            alert('Time entry not found');
            return;
        }

        const data = doc.data();
        const modal = document.getElementById('edit-modal');

        document.getElementById('edit-entry-id').value = entryId;

        // Format datetime for input
        const clockIn = data.clockIn.toDate();
        const clockInStr = formatDateTimeLocal(clockIn);
        document.getElementById('edit-clock-in').value = clockInStr;

        if (data.clockOut) {
            const clockOut = data.clockOut.toDate();
            const clockOutStr = formatDateTimeLocal(clockOut);
            document.getElementById('edit-clock-out').value = clockOutStr;
        } else {
            document.getElementById('edit-clock-out').value = '';
        }

        document.getElementById('edit-reason').value = '';

        modal.classList.add('active');
    } catch (error) {
        console.error('Error loading entry for edit:', error);
        alert('Failed to load time entry');
    }
}

// Close edit modal
function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('active');
    document.getElementById('edit-form').reset();
}

// Save edited entry
async function saveEditedEntry() {
    const entryId = document.getElementById('edit-entry-id').value;
    const clockInStr = document.getElementById('edit-clock-in').value;
    const clockOutStr = document.getElementById('edit-clock-out').value;
    const reason = document.getElementById('edit-reason').value.trim();

    if (!reason) {
        alert('Please provide a reason for this edit');
        return;
    }

    if (!clockInStr) {
        alert('Clock in time is required');
        return;
    }

    try {
        // Get current admin user from Firebase Auth
        const adminUser = auth.currentUser;
        if (!adminUser) {
            alert('You must be logged in to edit entries');
            return;
        }

        // Parse datetime-local input as Chicago timezone
        // datetime-local format: "2026-01-15T14:30"
        // Convert to Chicago timezone properly
        const clockIn = parseChicagoDateTime(clockInStr);
        const clockOut = clockOutStr ? parseChicagoDateTime(clockOutStr) : null;

        // Calculate total hours if clock out provided
        let totalHours = 0;
        let status = 'active';

        if (clockOut) {
            const diffMs = clockOut - clockIn;
            totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
            status = 'completed';
        }

        // Get original entry for audit
        const doc = await db.collection('timeEntries').doc(entryId).get();
        const originalData = doc.data();

        // Calculate new pay period
        const payPeriodId = calculatePayPeriodId(clockIn);

        // Create edit history entry
        const editEntry = {
            editedBy: adminUser.uid,
            editedByName: adminUser.displayName || adminUser.email,
            editedAt: firebase.firestore.Timestamp.now(), // Use Timestamp.now() instead of serverTimestamp() for arrayUnion
            reason: reason,
            changes: {
                clockIn: {
                    before: originalData.clockIn.toDate().toISOString(),
                    after: clockIn.toISOString()
                },
                clockOut: {
                    before: originalData.clockOut ? originalData.clockOut.toDate().toISOString() : null,
                    after: clockOut ? clockOut.toISOString() : null
                }
            }
        };

        // Update entry
        const updateData = {
            clockIn: firebase.firestore.Timestamp.fromDate(clockIn),
            totalHours: totalHours,
            status: status,
            payPeriodId: payPeriodId,
            editHistory: firebase.firestore.FieldValue.arrayUnion(editEntry),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (clockOut) {
            updateData.clockOut = firebase.firestore.Timestamp.fromDate(clockOut);
        } else {
            updateData.clockOut = null;
        }

        await db.collection('timeEntries').doc(entryId).update(updateData);

        alert('Time entry updated successfully!');
        closeEditModal();
        loadPayPeriodData(currentPeriodId);

    } catch (error) {
        console.error('Error saving edited entry:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            entryId: entryId,
            clockInStr: clockInStr,
            clockOutStr: clockOutStr
        });
        alert('Failed to save changes. Please try again.\n\nError: ' + error.message);
    }
}

// ==================== Manual Entry ====================

// Show global manual entry modal (with employee selector)
async function showGlobalManualEntryModal() {
    try {
        // Load all users from the users collection
        const usersSnapshot = await db.collection('users').get();
        const employeeSelect = document.getElementById('manual-employee-select');

        // Clear existing options (except the placeholder)
        employeeSelect.innerHTML = '<option value="">-- Select an employee --</option>';

        // Populate dropdown with all employees
        const users = [];
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            users.push({
                userId: doc.id,
                displayName: userData.displayName || userData.displayname || userData.email?.split('@')[0] || 'Unknown',
                email: userData.email
            });
        });

        // Sort by display name
        users.sort((a, b) => a.displayName.localeCompare(b.displayName));

        // Add to dropdown
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = JSON.stringify({ userId: user.userId, userName: user.displayName });
            option.textContent = user.displayName;
            employeeSelect.appendChild(option);
        });

        // Show the employee selector
        document.getElementById('employee-selector-group').style.display = 'block';

        // Clear the hidden fields (will be set when employee is selected)
        document.getElementById('manual-user-id').value = '';
        document.getElementById('manual-user-name').value = '';

        // Reset form
        document.getElementById('manual-entry-form').reset();
        document.getElementById('edit-modal').classList.remove('active');
        document.getElementById('manual-entry-modal').classList.add('active');

    } catch (error) {
        console.error('Error loading employees:', error);
        alert('Failed to load employee list. Please try again.');
    }
}

// Make it globally accessible
window.showGlobalManualEntryModal = showGlobalManualEntryModal;

// Show manual entry modal (for specific employee from their card)
function showManualEntryModal(userId, userName) {
    // Hide the employee selector (user is already known)
    document.getElementById('employee-selector-group').style.display = 'none';

    document.getElementById('manual-user-id').value = userId;
    document.getElementById('manual-user-name').value = userName;
    document.getElementById('manual-entry-form').reset();
    document.getElementById('edit-modal').classList.remove('active');
    document.getElementById('manual-entry-modal').classList.add('active');
}

// Close manual entry modal
function closeManualEntryModal() {
    document.getElementById('manual-entry-modal').classList.remove('active');
    document.getElementById('manual-entry-form').reset();
}

// Save manual entry
async function saveManualEntry() {
    let userId = document.getElementById('manual-user-id').value;
    let userName = document.getElementById('manual-user-name').value;

    // Check if employee selector is visible (global modal)
    const employeeSelector = document.getElementById('employee-selector-group');
    if (employeeSelector.style.display !== 'none') {
        // Get user info from dropdown
        const selectedOption = document.getElementById('manual-employee-select');
        if (!selectedOption.value) {
            alert('Please select an employee');
            return;
        }
        const userData = JSON.parse(selectedOption.value);
        userId = userData.userId;
        userName = userData.userName;
    }

    const clockInStr = document.getElementById('manual-clock-in').value;
    const clockOutStr = document.getElementById('manual-clock-out').value;
    const reason = document.getElementById('manual-reason').value.trim();

    if (!userId || !userName || !clockInStr || !clockOutStr || !reason) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        // Get current admin user from Firebase Auth
        const adminUser = auth.currentUser;
        if (!adminUser) {
            alert('You must be logged in to add manual entries');
            return;
        }

        // Parse datetime-local input as Chicago timezone
        const clockIn = parseChicagoDateTime(clockInStr);
        const clockOut = parseChicagoDateTime(clockOutStr);

        if (clockOut <= clockIn) {
            alert('Clock out time must be after clock in time');
            return;
        }

        // Calculate total hours
        const diffMs = clockOut - clockIn;
        const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

        // Calculate pay period
        const payPeriodId = calculatePayPeriodId(clockIn);

        // Create manual entry with audit trail
        await db.collection('timeEntries').add({
            userId: userId,
            userName: userName,
            clockIn: firebase.firestore.Timestamp.fromDate(clockIn),
            clockOut: firebase.firestore.Timestamp.fromDate(clockOut),
            totalHours: totalHours,
            payPeriodId: payPeriodId,
            status: 'completed',
            editHistory: [{
                editedBy: adminUser.uid,
                editedByName: adminUser.displayName || adminUser.email,
                editedAt: firebase.firestore.Timestamp.now(), // Use Timestamp.now() instead of serverTimestamp() for nested objects
                reason: `Manual entry created: ${reason}`,
                changes: {
                    type: 'manual_creation'
                }
            }],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Manual entry added successfully!');
        closeManualEntryModal();
        loadPayPeriodData(currentPeriodId);

    } catch (error) {
        console.error('Error saving manual entry:', error);
        alert('Failed to save manual entry. Please try again.');
    }
}

// ==================== Delete Entry ====================

// Delete time entry
async function deleteTimeEntry(entryId) {
    if (!confirm('Are you sure you want to delete this time entry? This action cannot be undone.')) {
        return;
    }

    try {
        await db.collection('timeEntries').doc(entryId).delete();
        alert('Time entry deleted successfully!');
        loadPayPeriodData(currentPeriodId);
    } catch (error) {
        console.error('Error deleting entry:', error);
        alert('Failed to delete time entry. Please try again.');
    }
}

// ==================== Audit Trail ====================

// Show audit trail
async function showAuditTrail(entryId) {
    try {
        const doc = await db.collection('timeEntries').doc(entryId).get();
        if (!doc.exists) {
            alert('Time entry not found');
            return;
        }

        const data = doc.data();
        const editHistory = data.editHistory || [];

        const auditTrail = document.getElementById('audit-trail');

        if (editHistory.length === 0) {
            auditTrail.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><h4>No edit history</h4><p>This entry has not been modified.</p></div>';
        } else {
            auditTrail.innerHTML = editHistory.map(edit => {
                const timestamp = edit.editedAt ? edit.editedAt.toDate().toLocaleString() : 'Unknown';

                let changesText = '';
                if (edit.changes.type === 'manual_creation') {
                    changesText = 'Manual entry created';
                } else if (edit.changes.clockIn || edit.changes.clockOut) {
                    changesText = 'Modified clock in/out times';
                }

                return `
                    <div class="audit-item">
                        <div class="audit-header">
                            <span class="audit-editor">${edit.editedByName}</span>
                            <span class="audit-timestamp">${timestamp}</span>
                        </div>
                        <div class="audit-changes">${changesText}</div>
                        <div class="audit-reason">"${edit.reason}"</div>
                    </div>
                `;
            }).join('');
        }

        document.getElementById('audit-modal').classList.add('active');
    } catch (error) {
        console.error('Error loading audit trail:', error);
        alert('Failed to load edit history');
    }
}

// Close audit modal
function closeAuditModal() {
    document.getElementById('audit-modal').classList.remove('active');
}

// ==================== Export Functions ====================

// Export to PDF
function exportToPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const period = allPayPeriods.find(p => p.id === currentPeriodId);
        const periodText = period ? period.display : currentPeriodId;

        // Header
        doc.setFontSize(20);
        doc.setTextColor(45, 95, 63);
        doc.text('WESTSIDE RISING', 105, 20, { align: 'center' });

        doc.setFontSize(14);
        doc.text('Time Clock Report', 105, 30, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Pay Period: ${periodText}`, 105, 40, { align: 'center' });

        // Prepare table data
        const tableData = [];

        allEmployeesData.forEach(employee => {
            employee.entries.forEach((entry, index) => {
                const clockInDate = formatChicagoDate(entry.clockIn);
                const clockInTime = entry.clockIn.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                const clockOutTime = entry.clockOut ? entry.clockOut.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '-';
                const hours = entry.status === 'completed' ? entry.totalHours.toFixed(2) : '-';

                tableData.push([
                    index === 0 ? employee.userName : '',
                    clockInDate,
                    clockInTime,
                    clockOutTime,
                    hours
                ]);
            });

            // Add subtotal row
            tableData.push([
                { content: `${employee.userName} - Subtotal`, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
                { content: employee.totalHours.toFixed(2), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
            ]);
        });

        // Generate table
        doc.autoTable({
            head: [['Employee', 'Date', 'Clock In', 'Clock Out', 'Hours']],
            body: tableData,
            startY: 50,
            theme: 'striped',
            headStyles: {
                fillColor: [45, 95, 63],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 10
            }
        });

        // Save PDF
        doc.save(`westside-rising-timesheet-${currentPeriodId}.pdf`);

    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Failed to export PDF. Please try again.');
    }
}

// Export to CSV
function exportToCSV() {
    try {
        const period = allPayPeriods.find(p => p.id === currentPeriodId);
        const periodText = period ? period.display : currentPeriodId;

        // CSV Header
        let csv = 'WESTSIDE RISING - Time Clock Report\n';
        csv += `Pay Period: ${periodText}\n\n`;
        csv += 'Employee,Date,Clock In,Clock Out,Hours\n';

        // Add data
        allEmployeesData.forEach(employee => {
            employee.entries.forEach(entry => {
                const clockInDate = formatChicagoDate(entry.clockIn);
                const clockInTime = entry.clockIn.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                const clockOutTime = entry.clockOut ? entry.clockOut.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '-';
                const hours = entry.status === 'completed' ? entry.totalHours.toFixed(2) : '-';

                csv += `"${employee.userName}","${clockInDate}","${clockInTime}","${clockOutTime}",${hours}\n`;
            });

            // Add subtotal
            csv += `"${employee.userName} - Subtotal","","","",${employee.totalHours.toFixed(2)}\n`;
        });

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `westside-rising-timesheet-${currentPeriodId}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error('Error exporting CSV:', error);
        alert('Failed to export CSV. Please try again.');
    }
}

// ==================== Utility Functions ====================

// Parse datetime-local input string as Chicago timezone
function parseChicagoDateTime(datetimeStr) {
    // datetime-local format: "2026-01-15T14:30"
    if (!datetimeStr) return null;

    // Simple approach: just append ":00" for seconds
    // Note: Chicago is CST/CDT (UTC-6 in winter, UTC-5 in summer)
    // For January 2026, it's CST (UTC-6)
    // We'll use a simple parser that treats the input as local Chicago time

    try {
        // Parse components
        const [datePart, timePart] = datetimeStr.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);

        // Create date in browser's local time
        const localDate = new Date(year, month - 1, day, hours, minutes, 0);

        // Convert to Chicago time by getting what this local time means in Chicago
        const chicagoTimeString = localDate.toLocaleString('en-US', {
            timeZone: 'America/Chicago',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // Now we need to find the UTC time that gives us our desired Chicago display
        // Calculate offset between what browser shows and what Chicago would show
        const chicagoParsed = new Date(localDate.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
        const offsetMs = localDate.getTime() - chicagoParsed.getTime();

        // Return the adjusted date
        return new Date(localDate.getTime() + offsetMs);
    } catch (error) {
        console.error('Error parsing Chicago datetime:', error, datetimeStr);
        return null;
    }
}

// Format date for datetime-local input (in Chicago timezone)
function formatDateTimeLocal(date) {
    // Convert to Chicago timezone
    const chicagoDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Chicago' }));

    const year = chicagoDate.getFullYear();
    const month = String(chicagoDate.getMonth() + 1).padStart(2, '0');
    const day = String(chicagoDate.getDate()).padStart(2, '0');
    const hours = String(chicagoDate.getHours()).padStart(2, '0');
    const minutes = String(chicagoDate.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (clockedInListener) {
        clockedInListener();
    }
});
