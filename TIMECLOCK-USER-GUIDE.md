# Time Clock System - User Guide

## Quick Start

### For Employees

#### Accessing the System
1. Navigate to the admin dashboard URL
2. Enter your email and password
3. Click "Sign In"

#### Clocking In
1. You'll see a green "Clock In" button
2. Click the button when you start your shift
3. A timer will start showing your current work time
4. You'll see your clock in time displayed

#### Clocking Out
1. When ready to end your shift, click the red "Clock Out" button
2. You'll see a confirmation with your total hours worked
3. Your time entry will appear in "Recent Time Entries"

#### Viewing Your Hours
Three stat cards show:
- **Hours Today** - Total hours worked today
- **Hours This Week** - Total hours this week
- **Hours This Pay Period** - Total hours in current pay period (updates every 2 weeks)

#### Recent Time Entries
- Shows your last 10 time entries
- Displays date, clock in/out times, and total hours
- Active entries (not clocked out yet) show "In Progress"

---

### For Super Admins

#### Accessing the System
1. Navigate to the admin dashboard URL
2. Enter your super admin email and password
3. Click "Sign In"
4. You'll see three tabs: Events, Time Clock, and Timesheets

#### Events Tab
Manage events for the main website:
- Click "Add Event" to create new events
- Fill in event details (title, date, time, location)
- Delete events using the "Delete" button
- Changes appear immediately on the public website

#### Time Clock Tab
Same functionality as employees:
- Clock in/out for your own time
- View your personal stats and recent entries

#### Timesheets Tab
Manage all employee time entries:

**Pay Period Navigation**
- View current or past pay periods
- Use "Previous" and "Next" buttons to navigate
- Pay periods run for 14 days starting January 6, 2026

**Currently Clocked In**
- Green panel shows who's currently working
- Displays employee name, clock in time, and duration
- Updates automatically in real-time

**Employee Filter**
- Dropdown to filter by specific employee
- Select "All Employees" to see everyone
- Filter persists while navigating pay periods

**Employee Timesheets**
Each employee has a card showing:
- Employee name and total hours for the period
- Table of all time entries with:
  - Date
  - Clock in time
  - Clock out time
  - Hours worked
  - Status (In Progress or Completed)

**Actions Available**

1. **Edit Entry**
   - Click "Edit" button on any entry
   - Modify clock in or clock out times
   - Must provide a reason for the edit
   - Edit is saved to audit trail
   - Click "History" to view all edits

2. **Delete Entry**
   - Click "Delete" button on any entry
   - Confirm deletion
   - Cannot be undone

3. **Add Manual Entry**
   - Click "Add Manual Entry" button
   - Enter clock in and clock out times
   - Provide reason for manual entry
   - Useful for forgotten clock ins/outs

4. **View History**
   - Click "History" button (appears if entry was edited)
   - See who edited, when, and why
   - Full audit trail for accountability

**Export Reports**

1. **PDF Export**
   - Click "Export PDF" button
   - Professional formatted timesheet
   - Includes WESTSIDE RISING header
   - Shows all employees and totals
   - Automatically downloads

2. **CSV Export**
   - Click "Export CSV" button
   - Spreadsheet format
   - Opens in Excel or Google Sheets
   - Includes all time entry data and subtotals
   - Good for payroll processing

## Tips & Best Practices

### For Employees
- Always clock in when you arrive
- Don't forget to clock out when you leave
- If you forget to clock out, notify your supervisor
- Check your hours regularly to ensure accuracy
- Contact admin if you see any errors

### For Super Admins
- Review timesheets weekly
- Export reports at end of each pay period
- Add reasons when editing entries for transparency
- Use manual entries for forgotten clock ins/outs
- Monitor "Currently Clocked In" panel during work hours
- Keep audit trails for at least one year

## Common Scenarios

### Forgot to Clock In
**Solution**: Super admin can add a manual entry with the correct times.

### Forgot to Clock Out
**Solution**: Super admin can edit the entry to add the clock out time.

### Clocked In at Wrong Time
**Solution**: Super admin can edit the entry to correct the time.

### Need to Add Past Time
**Solution**: Super admin can add a manual entry for any date.

### Clocked In Twice by Mistake
**Solution**: System prevents duplicate clock ins. If somehow happened, super admin can delete the duplicate.

### Wrong Pay Period
**Solution**: Super admin can edit entry's clock in time, which automatically recalculates the pay period.

## Understanding Pay Periods

- Pay periods are **14 days** long
- Start date: **January 6, 2026**
- Run continuously: Jan 6-19, Jan 20-Feb 2, Feb 3-16, etc.
- All times are in **Chicago timezone** (America/Chicago)
- Hours automatically assigned to correct pay period

## Keyboard Shortcuts

- **ESC** - Close any open modal/dialog
- Standard form shortcuts work (Tab, Enter, etc.)

## Security

### Passwords
- Use strong, unique passwords
- Don't share your login credentials
- Change password if compromised

### Clock In/Out
- Only clock in for yourself
- Report any suspicious activity
- Don't clock in/out for others

### Data Privacy
- Time data is confidential
- Super admins: Respect employee privacy
- Export reports are sensitive documents

## Getting Help

### Error Messages
If you see an error:
1. Note the exact error message
2. Check if you're still logged in
3. Try refreshing the page
4. Contact your administrator if issue persists

### Technical Issues
- Can't log in → Verify email and password
- Button not working → Try refreshing page
- Times wrong → Check your computer's timezone
- Can't see features → Verify your role (employee vs super admin)

### Questions
Contact your system administrator for:
- Access issues
- Role changes
- Data corrections
- Feature requests

## Mobile Access

The system works on mobile devices:
- Responsive design adapts to screen size
- All features available on mobile
- Use landscape mode for better timesheet viewing
- PDF exports work on mobile

## Browser Requirements

Supported browsers:
- Chrome (recommended)
- Firefox
- Safari
- Edge

Features used:
- JavaScript (must be enabled)
- Cookies (for authentication)
- Local storage (for session data)

## FAQ

**Q: Can I view timesheets from last year?**
A: Yes, use the "Previous" button to navigate to any past pay period.

**Q: Can I export a specific employee's timesheet?**
A: Yes, use the employee filter, then export. The export will only include filtered data.

**Q: What happens if I'm clocked in at midnight?**
A: The system tracks continuous time. Hours are split across days in reports.

**Q: Can I edit my own time entries?**
A: No, only super admins can edit entries to maintain accountability.

**Q: How accurate is the timer?**
A: The timer is updated every second and is accurate to the second.

**Q: Can I see other employees' hours?**
A: Employees see only their own data. Super admins see all employee data.

**Q: What if I work across two pay periods?**
A: Each clock in/out is assigned to a pay period based on the clock in time.

**Q: Can I have multiple active clock ins?**
A: No, you must clock out before you can clock in again.

**Q: Is there a maximum time I can be clocked in?**
A: No limit, but if you forget to clock out, it remains active until edited.

**Q: Can I see future pay periods?**
A: No, only current and past pay periods are shown.

## System Status

The time clock system:
- ✓ Available 24/7
- ✓ Automatic backups
- ✓ Real-time updates
- ✓ Mobile compatible
- ✓ Secure authentication
- ✓ Full audit trail

## Version History

**Version 1.0** (Current)
- Initial release
- Clock in/out functionality
- Timesheet management
- PDF/CSV export
- Audit trail
- Role-based access
