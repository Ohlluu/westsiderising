import { auth, db } from './firebase-config.js?v=5';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Helper function to format time from 24-hour to 12-hour format with AM/PM
function formatTime(timeString) {
    if (!timeString) return 'N/A';

    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minutes} ${ampm}`;
}

// Helper function to parse date string in local timezone (not UTC)
function parseDateSafe(dateString) {
    if (!dateString) return null;

    if (dateString.includes('T')) {
        return new Date(dateString);
    }

    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    return new Date(year, month - 1, day);
}

// Helper function to format a Firestore Timestamp or ISO string for display
function formatTimestamp(ts) {
    if (!ts) return 'N/A';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Cache of loaded apps for print functionality
const appCache = {};

// Check if user is logged in and has proper role
onAuthStateChanged(auth, async (user) => {
    console.log('Auth state changed:', user ? `Logged in as ${user.email}` : 'Not logged in');
    if (!user) {
        console.log('Redirecting to login page...');
        window.location.href = 'admin-login.html';
    } else {
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const role = userDoc.data().role || 'employee';

                if (role === 'superadmin' || role === 'manager') {
                    console.log('Loading dashboard... Role:', role);
                    loadDashboard();
                } else {
                    console.log('Employee detected, redirecting to Time Clock...');
                    window.location.href = 'time-clock.html';
                }
            } else {
                console.log('No user document found, redirecting to Time Clock...');
                window.location.href = 'time-clock.html';
            }
        } catch (error) {
            console.error('Error checking user role:', error);
            window.location.href = 'time-clock.html';
        }
    }
});

// Logout functionality
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'admin-login.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out. Please try again.');
    }
});

// =============================================
// TAB SWITCHING
// =============================================
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.style.display = 'none';
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const panel = document.getElementById(`tab-${tabName}`);
    if (panel) panel.style.display = 'block';
    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');
};

// =============================================
// LOAD DASHBOARD DATA
// =============================================
async function loadDashboard() {
    try {
        // Load events
        const eventsRef = collection(db, 'events');
        const eventsSnapshot = await getDocs(eventsRef);

        let pendingCount = 0;
        let approvedCount = 0;
        const pendingEvents = [];
        const approvedEvents = [];

        eventsSnapshot.forEach((docSnap) => {
            const event = { id: docSnap.id, ...docSnap.data() };

            if (event.status === 'pending') {
                pendingCount++;
                pendingEvents.push(event);
            } else if (event.status === 'approved') {
                approvedCount++;
                approvedEvents.push(event);
            }
        });

        document.getElementById('pending-count').textContent = pendingCount;
        document.getElementById('approved-count').textContent = approvedCount;
        document.getElementById('total-count').textContent = eventsSnapshot.size;

        // Update events tab badge with pending count
        const eventsBadge = document.getElementById('badge-events');
        if (eventsBadge) {
            eventsBadge.textContent = pendingCount;
            eventsBadge.classList.toggle('tab-badge-new', pendingCount > 0);
        }

        displayPendingEvents(pendingEvents);
        displayApprovedEvents(approvedEvents);

        // Load all application types in parallel
        await Promise.all([
            loadApplications('volunteerApplications',    'volunteer-apps-container',  'volunteer-count',   'badge-volunteers',   'volunteer-new-label',   displayVolunteerApplications),
            loadApplications('partnershipApplications',  'partnership-apps-container','partnership-count', 'badge-partnerships', 'partnership-new-label', displayPartnershipApplications),
            loadApplications('joinTeamApplications',     'jointeam-apps-container',   'jointeam-count',    'badge-jointeam',     'jointeam-new-label',    displayJoinTeamApplications),
            loadApplications('powerLabApplications',     'powerlab-apps-container',   'powerlab-count',    'badge-powerlab',     'powerlab-new-label',    displayPowerLabApplications),
            loadApplications('communityVoicesSurveys',   'voices-apps-container',     'voices-count',      'badge-voices',       'voices-new-label',      displayCommunityVoicesSurveys)
        ]);

    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('pending-events-container').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading events. Please refresh the page.</p>
            </div>
        `;
    }
}

// =============================================
// GENERIC APPLICATION LOADER
// =============================================
async function loadApplications(collectionName, containerId, statCountId, badgeId, newLabelId, displayFn) {
    try {
        const appsSnapshot = await getDocs(collection(db, collectionName));

        const apps = [];
        let newCount = 0;

        appsSnapshot.forEach((docSnap) => {
            const app = { id: docSnap.id, ...docSnap.data() };
            apps.push(app);
            if (app.status === 'new') newCount++;
        });

        // Sort newest first
        apps.sort((a, b) => {
            const tA = a.submittedAt?.toMillis?.() ?? 0;
            const tB = b.submittedAt?.toMillis?.() ?? 0;
            return tB - tA;
        });

        const statEl = document.getElementById(statCountId);
        if (statEl) statEl.textContent = apps.length;

        const badgeEl = document.getElementById(badgeId);
        if (badgeEl) {
            badgeEl.textContent = apps.length;
            badgeEl.classList.toggle('tab-badge-new', newCount > 0);
        }

        const labelEl = document.getElementById(newLabelId);
        if (labelEl) {
            labelEl.textContent = newCount > 0 ? `${newCount} new` : '';
        }

        displayFn(apps, containerId);

    } catch (error) {
        console.error(`Error loading ${collectionName}:`, error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading applications. Please refresh.</p></div>`;
        }
    }
}

// =============================================
// TOGGLE APPLICATION DETAILS
// =============================================
window.toggleAppDetails = function(appId) {
    const detailsSection = document.getElementById(`details-${appId}`);
    const button = document.querySelector(`[data-app-id="${appId}"] .btn-view-details`);

    if (detailsSection.style.display === 'none') {
        detailsSection.style.display = 'block';
        if (button) button.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Details';
    } else {
        detailsSection.style.display = 'none';
        if (button) button.innerHTML = '<i class="fas fa-chevron-down"></i> View Details';
    }
};

// =============================================
// MARK APPLICATION AS REVIEWED
// =============================================
window.markAsReviewed = async function(collectionName, appId, buttonEl) {
    try {
        buttonEl.disabled = true;
        buttonEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        await updateDoc(doc(db, collectionName, appId), {
            status: 'reviewed',
            reviewedAt: new Date().toISOString()
        });
        loadDashboard();
    } catch (error) {
        console.error('Error marking as reviewed:', error);
        alert('Error updating application. Please try again.');
        buttonEl.disabled = false;
        buttonEl.innerHTML = '<i class="fas fa-check"></i> Mark as Reviewed';
    }
};

// =============================================
// DELETE APPLICATION
// =============================================
window.deleteApplication = async function(collectionName, appId) {
    if (!confirm('Are you sure you want to delete this application? This cannot be undone.')) return;

    try {
        await deleteDoc(doc(db, collectionName, appId));
        loadDashboard();
    } catch (error) {
        console.error('Error deleting application:', error);
        alert('Error deleting application. Please try again.');
    }
};

// =============================================
// VIEW FULL APPLICATION (opens organized new tab)
// =============================================
window.viewFullApplication = function(appId) {
    const app = appCache[appId];
    if (!app) {
        alert('Application data not available. Please refresh the page.');
        return;
    }

    const f = (val) => (val !== undefined && val !== null && val !== '') ? String(val) : null;
    const arrFmt = (val, other) => {
        let str = Array.isArray(val) ? val.join(', ') : (val || '');
        if (other) str += ` — Other: ${other}`;
        return str || null;
    };
    const section = (title, fields) => {
        const rows = fields
            .filter(([, val]) => val)
            .map(([label, val, wide]) =>
                `<div class="field${wide ? ' wide' : ''}"><span class="label">${label}</span><span class="value">${val}</span></div>`
            ).join('');
        return rows ? `<div class="section"><h3>${title}</h3><div class="grid">${rows}</div></div>` : '';
    };

    const applicantName = f(app.fullName)
        || (`${app.firstName || ''} ${app.lastName || ''}`.trim() || null)
        || f(app.contactName) || f(app.entityName) || 'Applicant';
    const formType = app.formType || 'Application';
    const isNew = app.status === 'new';
    const submittedDate = formatTimestamp(app.submittedAt);

    let sectionsHtml = '';

    if (formType === 'Employment Application') {
        let skillsGridHtml = '';
        if (app.skills && typeof app.skills === 'object') {
            const rows = Object.entries(app.skills)
                .map(([label, level]) => `<tr><td>${label}</td><td class="${level === 'Not indicated' ? 'muted' : ''}">${level}</td></tr>`)
                .join('');
            skillsGridHtml = `<div class="section"><h3>Skills Matrix</h3>
                <table class="skills-table">
                    <thead><tr><th>Skill</th><th>Proficiency</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                ${app.otherSkills ? `<div class="field wide" style="margin-top:12px;border:none"><span class="label">Other Skills</span><span class="value">${app.otherSkills}</span></div>` : ''}
                ${app.abilitiesVision ? `<div class="field wide" style="border:none"><span class="label">Abilities &amp; Vision</span><span class="value">${app.abilitiesVision}</span></div>` : ''}
            </div>`;
        }
        sectionsHtml = [
            section('Personal Information', [
                ['Full Name', f(app.fullName), true],
                ['Email', f(app.email)], ['Phone', f(app.phone)],
                ['Address', f(app.address)],
            ]),
            section('Position Details', [
                ['Primary Position', f(app.position)], ['Secondary Position', f(app.secondaryPosition)],
                ['Employment Type', f(app.employmentType)], ['Desired Pay', f(app.desiredPay)],
                ['Available Start Date', f(app.startDate)],
            ]),
            section('Eligibility', [
                ['US Citizen', f(app.usCitizen)], ['Work Authorized', f(app.workAuthorized)],
                ['Previously Worked for WR', f(app.workedForWR)],
                ['WR History', f(app.wrHistory), true],
                ['Criminal Background', f(app.criminalBackground)],
            ]),
            section('About You', [
                ['West Side Work Experience', f(app.westSideWork), true],
                ['Core Values', f(app.coreValues), true],
                ['WR Vision', f(app.wrVision), true],
            ]),
            section('Education', [
                ['School 1', f(app.school1), true], ['School 2', f(app.school2), true],
            ]),
            section('Work Experience', [
                ['Employer 1', f(app.employer1), true], ['Employer 2', f(app.employer2), true],
            ]),
            skillsGridHtml,
            section('References', [
                ['Reference 1', f(app.reference1), true],
                ['Reference 2', f(app.reference2), true],
                ['Reference 3', f(app.reference3), true],
            ]),
            app.resumeFilename ? `<div class="section"><h3>Resume</h3><div class="grid"><div class="field wide"><span class="label">File</span><span class="value">${app.resumeFilename}${app.resumeUrl ? ` &nbsp;<a href="${app.resumeUrl}" target="_blank" class="resume-link">&#128196; View / Download</a>` : ' <em style="color:#bbb;font-size:12px">(file not stored — submitted before upload was enabled)</em>'}</span></div></div></div>` : '',
            section('Signature', [['Signed', f(app.signature)], ['Date', f(app.todaysDate)]]),
        ].join('');

    } else if (formType === 'Volunteer Application') {
        sectionsHtml = [
            section('Personal Information', [
                ['Full Name', `${app.firstName || ''} ${app.lastName || ''}`.trim()],
                ['Email', f(app.email)], ['Phone', f(app.phone)],
                ['Address', [app.address, app.city, app.zipCode].filter(Boolean).join(', ') || null],
                ['Availability', f(app.availability)],
            ]),
            section('Areas of Interest', [['Interests', arrFmt(app.interests), true]]),
            section('Ways to Help', [['You Can Help By', arrFmt(app.helpBy, app.helpByOther), true]]),
            section('Background', [
                ['Skills &amp; Experience', f(app.skills), true],
                ['Motivation', f(app.motivation), true],
            ]),
        ].join('');

    } else if (formType === 'Partnership Application') {
        sectionsHtml = [
            section('Organization', [
                ['Entity Name', f(app.entityName), true],
                ['Authorized Rep', f(app.authorizedRep)], ['Email', f(app.email || app.emailAddress)],
                ['Contacts', f(app.contacts), true],
            ]),
            section('Partnership Details', [
                ['Partnership Type', arrFmt(app.partnershipType, app.partnershipTypeOther), true],
                ['Commitments', arrFmt(app.commitments, app.commitmentsOther), true],
                ['Support Needed', f(app.support) ? (f(app.support) + (app.supportOther ? ` — Other: ${app.supportOther}` : '')) : null, true],
                ['Agreement Terms', arrFmt(app.agreementTerms, app.agreementOther), true],
                ['Completion Date', f(app.completionDate)],
            ]),
        ].join('');

    } else if (app.applyingAs || app.q1) {
        sectionsHtml = [
            section('Applicant Information', [
                ['Full Name', f(app.fullName)], ['Email', f(app.email)], ['Phone', f(app.phone)],
                ['Applying As', f(app.applyingAs)], ['Organization', f(app.orgName)],
                ['Address', [app.address, app.city, app.state, app.zipCode].filter(Boolean).join(', ') || null, true],
            ]),
            section('Session &amp; Location', [
                ['Session Interest', arrFmt(app.sessionInterest), true],
                ['Neighborhoods', arrFmt(app.neighborhoods, app.neighborhoodOther), true],
                ['West Side Connection', arrFmt(app.westSideConnection), true],
                ['West Side (explain)', f(app.westSideExplain), true],
                ['WR Partnership History', f(app.wrPartnership), true],
            ]),
            section('Application Questions', [
                ['Q1', f(app.q1), true], ['Q2', f(app.q2), true], ['Q3', f(app.q3), true],
                ['Q4', f(app.q4), true], ['Q5', f(app.q5), true],
            ]),
            section('Logistics', [
                ['Preferred Time', f(app.preferredTime) ? f(app.preferredTime) + (app.preferredTimeOther ? ` — Other: ${app.preferredTimeOther}` : '') : null],
                ['How They Heard', f(app.hearAbout)], ['Referrals', f(app.referral)],
                ['Conditions Agreed', arrFmt(app.conditions), true], ['Signature', f(app.signature)],
            ]),
            app.participantCount ? `<div class="section"><h3>Additional Participants (${app.participantCount})</h3><div class="grid">
                ${app.participant1?.name ? `<div class="field wide"><span class="label">Participant 1</span><span class="value">${app.participant1.name}${app.participant1.phone ? ' | ' + app.participant1.phone : ''}${app.participant1.email ? ' | ' + app.participant1.email : ''}</span></div>` : ''}
                ${app.participant2?.name ? `<div class="field wide"><span class="label">Participant 2</span><span class="value">${app.participant2.name}${app.participant2.phone ? ' | ' + app.participant2.phone : ''}${app.participant2.email ? ' | ' + app.participant2.email : ''}</span></div>` : ''}
                ${app.participant3?.name ? `<div class="field wide"><span class="label">Participant 3</span><span class="value">${app.participant3.name}${app.participant3.phone ? ' | ' + app.participant3.phone : ''}${app.participant3.email ? ' | ' + app.participant3.email : ''}</span></div>` : ''}
            </div></div>` : '',
        ].join('');

    } else {
        sectionsHtml = [
            section('Contact', [
                ['Name', f(app.contactName)], ['Email', f(app.contactEmail)],
                ['Phone', f(app.contactPhone)], ['Community', f(app.community)],
            ]),
            section('Background', [
                ['Heard About WR Before?', f(app.heardAboutWR)], ['Age', f(app.age)],
                ['Time on West Side', f(app.timeOnWestSide)], ['Registered Voter', f(app.registeredVoter)],
            ]),
            section('Local Leadership', [
                ['Knows Alderman?', f(app.knowAlderman)], ['Alderman Name', f(app.alderman)],
                ['Alderman Rating', f(app.aldermanRating)], ['Mayor Rating', f(app.mayorRating)],
                ['Why (Mayor)', f(app.mayorRatingWhy), true],
            ]),
            section('Community Issues', [
                ['Top Issue 1', f(app.topIssue1)], ['Top Issue 2', f(app.topIssue2)], ['Top Issue 3', f(app.topIssue3)],
                ['Housing Satisfaction', f(app.housingSatisfaction)],
                ['Housing — Why', f(app.housingWhy), true],
                ['Housing Action Needed', f(app.housingAction), true],
            ]),
            section('Vision &amp; Involvement', [
                ['If I Were Mayor', f(app.ifMayor), true],
                ['Additional Concerns', f(app.additionalConcerns), true],
                ['Get Involved', arrFmt(app.getInvolved, app.getInvolvedOther), true],
            ]),
        ].join('');
    }

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>WESTSIDE RISING — ${applicantName}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f0f0; color: #222; padding: 30px 16px; }
  .page { max-width: 860px; margin: 0 auto; background: #fff; border-radius: 10px; box-shadow: 0 4px 24px rgba(0,0,0,0.12); overflow: hidden; }
  .app-header { background: #cc0000; color: #fff; padding: 28px 36px; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
  .app-header .org { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.75; margin-bottom: 4px; }
  .app-header .form-type { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
  .app-header .applicant { font-size: 15px; opacity: 0.9; }
  .header-right { text-align: right; flex-shrink: 0; }
  .status-pill { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.3px; margin-bottom: 8px; }
  .pill-new { background: #fff; color: #cc0000; }
  .pill-reviewed { background: rgba(255,255,255,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.5); }
  .submitted { font-size: 12px; opacity: 0.7; margin-bottom: 14px; }
  .print-btn { background: #fff; color: #cc0000; border: none; padding: 9px 20px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 700; }
  .print-btn:hover { background: #f5f5f5; }
  .app-body { padding: 32px 36px; }
  .section { margin-bottom: 28px; }
  .section h3 { font-size: 11px; font-weight: 700; color: #cc0000; text-transform: uppercase; letter-spacing: 1.2px; padding-bottom: 8px; border-bottom: 2px solid #f0f0f0; margin-bottom: 14px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #efefef; border-radius: 6px; overflow: hidden; }
  .field { padding: 10px 14px; border-bottom: 1px solid #f5f5f5; border-right: 1px solid #f5f5f5; }
  .field.wide { grid-column: 1 / -1; border-right: none; }
  .label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #aaa; margin-bottom: 4px; }
  .value { font-size: 14px; line-height: 1.6; color: #222; white-space: pre-wrap; word-break: break-word; }
  .skills-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .skills-table th { background: #f8f8f8; text-align: left; padding: 8px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #888; border: 1px solid #e8e8e8; }
  .skills-table td { padding: 7px 12px; border: 1px solid #e8e8e8; }
  .skills-table tr:nth-child(even) td { background: #fafafa; }
  .muted { color: #ccc; }
  .resume-link { display: inline-block; margin-left: 8px; background: #cc0000; color: #fff !important; padding: 4px 12px; border-radius: 5px; text-decoration: none; font-size: 13px; font-weight: 600; }
  .app-footer { padding: 16px 36px; background: #fafafa; border-top: 1px solid #f0f0f0; font-size: 11px; color: #bbb; text-align: center; }
  @media print {
    body { background: white; padding: 0; }
    .page { box-shadow: none; border-radius: 0; }
    .print-btn { display: none; }
  }
</style></head><body>
<div class="page">
  <div class="app-header">
    <div>
      <div class="org">Westside Rising</div>
      <div class="form-type">${formType}</div>
      <div class="applicant">${applicantName}</div>
    </div>
    <div class="header-right">
      <div class="status-pill ${isNew ? 'pill-new' : 'pill-reviewed'}">${isNew ? 'New' : 'Reviewed'}</div>
      <div class="submitted">Submitted: ${submittedDate}</div>
      <button class="print-btn" onclick="window.print()">&#128424;&nbsp; Print</button>
    </div>
  </div>
  <div class="app-body">${sectionsHtml}</div>
  <div class="app-footer">WESTSIDE RISING &mdash; Confidential &mdash; Generated ${new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}</div>
</div>
</body></html>`);
    win.document.close();
    win.focus();
};

// kept for backwards compat
window.printApplication = window.viewFullApplication;


// =============================================
// DISPLAY VOLUNTEER APPLICATIONS
// =============================================
function displayVolunteerApplications(apps, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    apps.forEach(app => { appCache[app.id] = app; });

    if (apps.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-hands-helping"></i><p>No volunteer applications yet</p></div>`;
        return;
    }

    container.innerHTML = apps.map(app => {
        const isNew = app.status === 'new';
        const interestsDisplay = Array.isArray(app.interests) ? app.interests.join(', ') : (app.interests || 'N/A');
        const helpByDisplay = Array.isArray(app.helpBy) ? app.helpBy.join(', ') : (app.helpBy || '');

        return `
        <div class="event-card-admin app-card ${isNew ? 'app-card-new' : 'app-card-reviewed'}" data-app-id="${app.id}">
            <div class="event-card-header">
                <div>
                    <h3>${app.firstName || ''} ${app.lastName || ''}</h3>
                    <span class="event-badge ${isNew ? '' : 'reviewed-badge'}">${isNew ? 'New' : 'Reviewed'}</span>
                </div>
                <button class="btn-view-details" onclick="toggleAppDetails('${app.id}')">
                    <i class="fas fa-chevron-down"></i> View Details
                </button>
            </div>

            <div class="event-card-info">
                <div class="info-item"><i class="fas fa-envelope"></i><span>${app.email || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-phone"></i><span>${app.phone || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-clock"></i><span>${app.availability || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-calendar-plus"></i><span>${formatTimestamp(app.submittedAt)}</span></div>
            </div>

            <div class="event-details-expand" id="details-${app.id}" style="display: none;">
                <div class="details-section">
                    <h4><i class="fas fa-map-marker-alt"></i> Address</h4>
                    <p>${[app.address, app.city, app.zipCode].filter(Boolean).join(', ') || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-star"></i> Areas of Interest</h4>
                    <p>${interestsDisplay}</p>
                </div>
                ${helpByDisplay ? `
                <div class="details-section">
                    <h4><i class="fas fa-hands-helping"></i> You Can Help By</h4>
                    <p>${helpByDisplay}${app.helpByOther ? ` (Other: ${app.helpByOther})` : ''}</p>
                </div>
                ` : ''}
                <div class="details-section">
                    <h4><i class="fas fa-tools"></i> Skills & Experience</h4>
                    <p>${app.skills || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-heart"></i> Motivation</h4>
                    <p>${app.motivation || 'N/A'}</p>
                </div>
            </div>

            <div class="event-card-actions">
                ${isNew ? `
                    <button class="btn-approve" onclick="markAsReviewed('volunteerApplications', '${app.id}', this)">
                        <i class="fas fa-check"></i> Mark as Reviewed
                    </button>
                ` : `
                    <span class="reviewed-label"><i class="fas fa-check-circle"></i> Reviewed</span>
                `}
                <a href="mailto:${app.email}" class="btn-view-event">
                    <i class="fas fa-envelope"></i> Email Applicant
                </a>
                <button class="btn-view-event" onclick="viewFullApplication('${app.id}')">
                    <i class="fas fa-external-link-alt"></i> View Full Application
                </button>
                <button class="btn-delete" onclick="deleteApplication('volunteerApplications', '${app.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// =============================================
// DISPLAY PARTNERSHIP APPLICATIONS
// =============================================
function displayPartnershipApplications(apps, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    apps.forEach(app => { appCache[app.id] = app; });

    if (apps.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-handshake"></i><p>No partnership applications yet</p></div>`;
        return;
    }

    container.innerHTML = apps.map(app => {
        const isNew = app.status === 'new';
        const partnershipTypeDisplay = Array.isArray(app.partnershipType)
            ? app.partnershipType.join(', ')
            : (app.partnershipType || 'N/A');
        const commitmentsDisplay = Array.isArray(app.commitments)
            ? app.commitments.join(', ')
            : (app.commitments || 'N/A');
        const agreementDisplay = Array.isArray(app.agreementTerms)
            ? app.agreementTerms.join(', ')
            : (app.agreementTerms || 'N/A');
        const contactEmail = app.email || app.emailAddress || '';

        return `
        <div class="event-card-admin app-card ${isNew ? 'app-card-new' : 'app-card-reviewed'}" data-app-id="${app.id}">
            <div class="event-card-header">
                <div>
                    <h3>${app.entityName || 'Unknown Organization'}</h3>
                    <span class="event-badge ${isNew ? '' : 'reviewed-badge'}">${isNew ? 'New' : 'Reviewed'}</span>
                </div>
                <button class="btn-view-details" onclick="toggleAppDetails('${app.id}')">
                    <i class="fas fa-chevron-down"></i> View Details
                </button>
            </div>

            <div class="event-card-info">
                <div class="info-item"><i class="fas fa-envelope"></i><span>${contactEmail || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-tags"></i><span>${partnershipTypeDisplay}</span></div>
                <div class="info-item"><i class="fas fa-user-tie"></i><span>${app.authorizedRep || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-calendar-plus"></i><span>${formatTimestamp(app.submittedAt)}</span></div>
            </div>

            <div class="event-details-expand" id="details-${app.id}" style="display: none;">
                <div class="details-section">
                    <h4><i class="fas fa-envelope"></i> Contact Info</h4>
                    <div class="contact-info">
                        <p><strong>Primary Email:</strong> ${app.email || 'N/A'}</p>
                        <p><strong>Email Address:</strong> ${app.emailAddress || 'N/A'}</p>
                        <p><strong>Contacts:</strong> ${app.contacts || 'N/A'}</p>
                    </div>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-handshake"></i> Partnership Type</h4>
                    <p>${partnershipTypeDisplay}${app.partnershipTypeOther ? ` (Other: ${app.partnershipTypeOther})` : ''}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-list-check"></i> Commitments</h4>
                    <p>${commitmentsDisplay}${app.commitmentsOther ? ` (Other: ${app.commitmentsOther})` : ''}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-life-ring"></i> Support Needed</h4>
                    <p>${app.support || 'N/A'}${app.supportOther ? ` (Other: ${app.supportOther})` : ''}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-file-contract"></i> Agreement Terms</h4>
                    <p>${agreementDisplay}${app.agreementOther ? ` (Other: ${app.agreementOther})` : ''}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-calendar-check"></i> Completion Date</h4>
                    <p>${app.completionDate || 'N/A'}</p>
                </div>
            </div>

            <div class="event-card-actions">
                ${isNew ? `
                    <button class="btn-approve" onclick="markAsReviewed('partnershipApplications', '${app.id}', this)">
                        <i class="fas fa-check"></i> Mark as Reviewed
                    </button>
                ` : `
                    <span class="reviewed-label"><i class="fas fa-check-circle"></i> Reviewed</span>
                `}
                ${contactEmail ? `
                    <a href="mailto:${contactEmail}" class="btn-view-event">
                        <i class="fas fa-envelope"></i> Email Applicant
                    </a>
                ` : ''}
                <button class="btn-view-event" onclick="viewFullApplication('${app.id}')">
                    <i class="fas fa-external-link-alt"></i> View Full Application
                </button>
                <button class="btn-delete" onclick="deleteApplication('partnershipApplications', '${app.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// =============================================
// DISPLAY JOIN TEAM APPLICATIONS
// =============================================
function displayJoinTeamApplications(apps, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    apps.forEach(app => { appCache[app.id] = app; });

    if (apps.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-user-tie"></i><p>No join team applications yet</p></div>`;
        return;
    }

    container.innerHTML = apps.map(app => {
        const isNew = app.status === 'new';

        // Skills is saved as an object: { 'Microsoft Word': 'Proficient', ... }
        let skillsDisplay = 'N/A';
        if (app.skills && typeof app.skills === 'object') {
            const entries = Object.entries(app.skills).filter(([, level]) => level && level !== 'Not indicated');
            skillsDisplay = entries.length > 0
                ? entries.map(([label, level]) => `<span style="display:inline-block;margin:2px 6px 2px 0"><strong>${label}:</strong> ${level}</span>`).join('')
                : 'None indicated';
        }

        return `
        <div class="event-card-admin app-card ${isNew ? 'app-card-new' : 'app-card-reviewed'}" data-app-id="${app.id}">
            <div class="event-card-header">
                <div>
                    <h3>${app.fullName || 'Unknown Applicant'}</h3>
                    <span class="event-badge ${isNew ? '' : 'reviewed-badge'}">${isNew ? 'New' : 'Reviewed'}</span>
                </div>
                <button class="btn-view-details" onclick="toggleAppDetails('${app.id}')">
                    <i class="fas fa-chevron-down"></i> View Details
                </button>
            </div>

            <div class="event-card-info">
                <div class="info-item"><i class="fas fa-envelope"></i><span>${app.email || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-briefcase"></i><span>${app.position || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-clock"></i><span>${app.employmentType || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-calendar-plus"></i><span>${formatTimestamp(app.submittedAt)}</span></div>
            </div>

            <div class="event-details-expand" id="details-${app.id}" style="display: none;">
                <div class="details-section">
                    <h4><i class="fas fa-address-card"></i> Contact Info</h4>
                    <p><strong>Phone:</strong> ${app.phone || 'N/A'}</p>
                    <p><strong>Address:</strong> ${app.address || 'N/A'}</p>
                    <p><strong>Email:</strong> <a href="mailto:${app.email}">${app.email || 'N/A'}</a></p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-briefcase"></i> Position Details</h4>
                    <p><strong>Primary Position:</strong> ${app.position || 'N/A'}</p>
                    ${app.secondaryPosition ? `<p><strong>Secondary Position:</strong> ${app.secondaryPosition}</p>` : ''}
                    <p><strong>Employment Type:</strong> ${app.employmentType || 'N/A'}</p>
                    <p><strong>Desired Pay:</strong> ${app.desiredPay || 'N/A'}</p>
                    <p><strong>Available Start Date:</strong> ${app.startDate || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-id-card"></i> Eligibility</h4>
                    <p><strong>US Citizen:</strong> ${app.usCitizen || 'N/A'}</p>
                    <p><strong>Work Authorized:</strong> ${app.workAuthorized || 'N/A'}</p>
                    <p><strong>Previously Worked for WR:</strong> ${app.workedForWR || 'N/A'}</p>
                    ${app.wrHistory ? `<p><strong>WR History:</strong> ${app.wrHistory}</p>` : ''}
                    <p><strong>Criminal Background:</strong> ${app.criminalBackground || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-graduation-cap"></i> Education</h4>
                    ${app.school1 ? `<p><strong>School 1:</strong> ${app.school1}</p>` : '<p>N/A</p>'}
                    ${app.school2 ? `<p><strong>School 2:</strong> ${app.school2}</p>` : ''}
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-history"></i> Work Experience</h4>
                    ${app.employer1 ? `<p><strong>Employer 1:</strong> ${app.employer1}</p>` : '<p>N/A</p>'}
                    ${app.employer2 ? `<p><strong>Employer 2:</strong> ${app.employer2}</p>` : ''}
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-tools"></i> Skills</h4>
                    <div>${skillsDisplay}</div>
                    ${app.otherSkills ? `<p style="margin-top:0.5rem"><strong>Other Skills:</strong> ${app.otherSkills}</p>` : ''}
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-eye"></i> Abilities & Vision</h4>
                    <p>${app.abilitiesVision || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-map-marker-alt"></i> West Side Work Experience</h4>
                    <p>${app.westSideWork || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-heart"></i> Core Values</h4>
                    <p>${app.coreValues || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-lightbulb"></i> WR Vision</h4>
                    <p>${app.wrVision || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-users"></i> References</h4>
                    ${app.reference1 ? `<p><strong>Ref 1:</strong> ${app.reference1}</p>` : '<p>N/A</p>'}
                    ${app.reference2 ? `<p><strong>Ref 2:</strong> ${app.reference2}</p>` : ''}
                    ${app.reference3 ? `<p><strong>Ref 3:</strong> ${app.reference3}</p>` : ''}
                </div>
                ${app.resumeFilename ? `
                <div class="details-section">
                    <h4><i class="fas fa-file-alt"></i> Resume</h4>
                    <p>${app.resumeFilename}</p>
                    ${app.resumeUrl ? `<a href="${app.resumeUrl}" target="_blank" class="btn-view-event" style="display:inline-flex;margin-top:6px"><i class="fas fa-external-link-alt"></i>&nbsp; View Resume</a>` : ''}
                </div>
                ` : ''}
                <div class="details-section">
                    <h4><i class="fas fa-signature"></i> Signature</h4>
                    <p><strong>Signed:</strong> ${app.signature || 'N/A'}</p>
                    <p><strong>Date:</strong> ${app.todaysDate || 'N/A'}</p>
                </div>
            </div>

            <div class="event-card-actions">
                ${isNew ? `
                    <button class="btn-approve" onclick="markAsReviewed('joinTeamApplications', '${app.id}', this)">
                        <i class="fas fa-check"></i> Mark as Reviewed
                    </button>
                ` : `
                    <span class="reviewed-label"><i class="fas fa-check-circle"></i> Reviewed</span>
                `}
                <a href="mailto:${app.email}" class="btn-view-event">
                    <i class="fas fa-envelope"></i> Email Applicant
                </a>
                <button class="btn-view-event" onclick="viewFullApplication('${app.id}')">
                    <i class="fas fa-external-link-alt"></i> View Full Application
                </button>
                <button class="btn-delete" onclick="deleteApplication('joinTeamApplications', '${app.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// =============================================
// DISPLAY POWER LAB APPLICATIONS
// =============================================
function displayPowerLabApplications(apps, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    apps.forEach(app => { appCache[app.id] = app; });

    if (apps.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-fist-raised"></i><p>No Power Lab applications yet</p></div>`;
        return;
    }

    container.innerHTML = apps.map(app => {
        const isNew = app.status === 'new';
        const sessionDisplay = Array.isArray(app.sessionInterest)
            ? app.sessionInterest.join(', ')
            : (app.sessionInterest || 'N/A');
        const neighborhoodsDisplay = Array.isArray(app.neighborhoods)
            ? app.neighborhoods.join(', ')
            : (app.neighborhoods || 'N/A');
        const westSideDisplay = Array.isArray(app.westSideConnection)
            ? app.westSideConnection.join(', ')
            : (app.westSideConnection || 'N/A');
        const conditionsDisplay = Array.isArray(app.conditions)
            ? app.conditions.join(', ')
            : (app.conditions || 'N/A');

        return `
        <div class="event-card-admin app-card ${isNew ? 'app-card-new' : 'app-card-reviewed'}" data-app-id="${app.id}">
            <div class="event-card-header">
                <div>
                    <h3>${app.fullName || 'Unknown Applicant'}</h3>
                    <span class="event-badge ${isNew ? '' : 'reviewed-badge'}">${isNew ? 'New' : 'Reviewed'}</span>
                </div>
                <button class="btn-view-details" onclick="toggleAppDetails('${app.id}')">
                    <i class="fas fa-chevron-down"></i> View Details
                </button>
            </div>

            <div class="event-card-info">
                <div class="info-item"><i class="fas fa-envelope"></i><span>${app.email || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-phone"></i><span>${app.phone || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-user-tag"></i><span>${app.applyingAs || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-calendar-plus"></i><span>${formatTimestamp(app.submittedAt)}</span></div>
            </div>

            <div class="event-details-expand" id="details-${app.id}" style="display: none;">
                <div class="details-section">
                    <h4><i class="fas fa-calendar-check"></i> Session Interest</h4>
                    <p>${sessionDisplay}</p>
                </div>
                ${app.orgName ? `
                <div class="details-section">
                    <h4><i class="fas fa-building"></i> Organization</h4>
                    <p>${app.orgName}</p>
                </div>
                ` : ''}
                <div class="details-section">
                    <h4><i class="fas fa-address-card"></i> Contact Info</h4>
                    <p><strong>Address:</strong> ${[app.address, app.city, app.state, app.zipCode].filter(Boolean).join(', ') || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${app.phone || 'N/A'}</p>
                    <p><strong>Email:</strong> <a href="mailto:${app.email}">${app.email}</a></p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-map-marker-alt"></i> Neighborhoods</h4>
                    <p>${neighborhoodsDisplay}${app.neighborhoodOther ? ` (Other: ${app.neighborhoodOther})` : ''}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-city"></i> West Side Connection</h4>
                    <p>${westSideDisplay}</p>
                    ${app.westSideExplain ? `<p><em>${app.westSideExplain}</em></p>` : ''}
                </div>
                ${app.wrPartnership ? `
                <div class="details-section">
                    <h4><i class="fas fa-handshake"></i> WR Partnership History</h4>
                    <p>${app.wrPartnership}</p>
                </div>
                ` : ''}
                <div class="details-section">
                    <h4><i class="fas fa-list-check"></i> Conditions Agreed</h4>
                    <p>${conditionsDisplay}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-question-circle"></i> Application Questions</h4>
                    <p><strong>Q1:</strong> ${app.q1 || 'N/A'}</p>
                    <p><strong>Q2:</strong> ${app.q2 || 'N/A'}</p>
                    <p><strong>Q3:</strong> ${app.q3 || 'N/A'}</p>
                    <p><strong>Q4:</strong> ${app.q4 || 'N/A'}</p>
                    <p><strong>Q5:</strong> ${app.q5 || 'N/A'}</p>
                </div>
                ${app.participantCount ? `
                <div class="details-section">
                    <h4><i class="fas fa-users"></i> Additional Participants (${app.participantCount})</h4>
                    ${app.participant1?.name ? `<p><strong>P1:</strong> ${app.participant1.name} | ${app.participant1.phone || ''} | ${app.participant1.email || ''}</p>` : ''}
                    ${app.participant2?.name ? `<p><strong>P2:</strong> ${app.participant2.name} | ${app.participant2.phone || ''} | ${app.participant2.email || ''}</p>` : ''}
                    ${app.participant3?.name ? `<p><strong>P3:</strong> ${app.participant3.name} | ${app.participant3.phone || ''} | ${app.participant3.email || ''}</p>` : ''}
                </div>
                ` : ''}
                <div class="details-section">
                    <h4><i class="fas fa-clock"></i> Preferred Time</h4>
                    <p>${app.preferredTime || 'N/A'}${app.preferredTimeOther ? ` (Other: ${app.preferredTimeOther})` : ''}</p>
                </div>
                ${app.hearAbout ? `
                <div class="details-section">
                    <h4><i class="fas fa-question-circle"></i> How They Heard About Us</h4>
                    <p>${app.hearAbout}</p>
                </div>
                ` : ''}
                ${app.referral ? `
                <div class="details-section">
                    <h4><i class="fas fa-user-friends"></i> Referrals</h4>
                    <p>${app.referral}</p>
                </div>
                ` : ''}
                <div class="details-section">
                    <h4><i class="fas fa-signature"></i> Signature</h4>
                    <p>${app.signature || 'N/A'}</p>
                </div>
            </div>

            <div class="event-card-actions">
                ${isNew ? `
                    <button class="btn-approve" onclick="markAsReviewed('powerLabApplications', '${app.id}', this)">
                        <i class="fas fa-check"></i> Mark as Reviewed
                    </button>
                ` : `
                    <span class="reviewed-label"><i class="fas fa-check-circle"></i> Reviewed</span>
                `}
                <a href="mailto:${app.email}" class="btn-view-event">
                    <i class="fas fa-envelope"></i> Email Applicant
                </a>
                <button class="btn-view-event" onclick="viewFullApplication('${app.id}')">
                    <i class="fas fa-external-link-alt"></i> View Full Application
                </button>
                <button class="btn-delete" onclick="deleteApplication('powerLabApplications', '${app.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// =============================================
// DISPLAY COMMUNITY VOICES SURVEYS
// =============================================
function displayCommunityVoicesSurveys(apps, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    apps.forEach(app => { appCache[app.id] = app; });

    if (apps.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-bullhorn"></i><p>No survey responses yet</p></div>`;
        return;
    }

    container.innerHTML = apps.map(app => {
        const isNew = app.status === 'new';
        const getInvolvedDisplay = Array.isArray(app.getInvolved)
            ? app.getInvolved.join(', ')
            : (app.getInvolved || 'N/A');

        return `
        <div class="event-card-admin app-card ${isNew ? 'app-card-new' : 'app-card-reviewed'}" data-app-id="${app.id}">
            <div class="event-card-header">
                <div>
                    <h3>${app.contactName || 'Anonymous'}</h3>
                    <span class="event-badge ${isNew ? '' : 'reviewed-badge'}">${isNew ? 'New' : 'Reviewed'}</span>
                </div>
                <button class="btn-view-details" onclick="toggleAppDetails('${app.id}')">
                    <i class="fas fa-chevron-down"></i> View Details
                </button>
            </div>

            <div class="event-card-info">
                <div class="info-item"><i class="fas fa-envelope"></i><span>${app.contactEmail || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-phone"></i><span>${app.contactPhone || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-map-marker-alt"></i><span>${app.community || 'N/A'}</span></div>
                <div class="info-item"><i class="fas fa-calendar-plus"></i><span>${formatTimestamp(app.submittedAt)}</span></div>
            </div>

            <div class="event-details-expand" id="details-${app.id}" style="display: none;">
                <div class="details-section">
                    <h4><i class="fas fa-info-circle"></i> Background</h4>
                    <p><strong>Heard about WR before?</strong> ${app.heardAboutWR || 'N/A'}</p>
                    <p><strong>Age:</strong> ${app.age || 'N/A'}</p>
                    <p><strong>Time on West Side:</strong> ${app.timeOnWestSide || 'N/A'}</p>
                    <p><strong>Registered Voter:</strong> ${app.registeredVoter || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-user-tie"></i> Alderman</h4>
                    <p><strong>Knows Alderman:</strong> ${app.knowAlderman || 'N/A'}</p>
                    ${app.alderman ? `<p><strong>Alderman:</strong> ${app.alderman}</p>` : ''}
                    ${app.aldermanRating ? `<p><strong>Alderman Rating:</strong> ${app.aldermanRating}</p>` : ''}
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-city"></i> Mayor</h4>
                    <p><strong>Rating:</strong> ${app.mayorRating || 'N/A'}</p>
                    ${app.mayorRatingWhy ? `<p><strong>Why:</strong> ${app.mayorRatingWhy}</p>` : ''}
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-exclamation-circle"></i> Top Issues</h4>
                    <p>${[app.topIssue1, app.topIssue2, app.topIssue3].filter(Boolean).join(', ') || 'N/A'}</p>
                </div>
                <div class="details-section">
                    <h4><i class="fas fa-home"></i> Housing</h4>
                    <p><strong>Satisfaction:</strong> ${app.housingSatisfaction || 'N/A'}</p>
                    ${app.housingWhy ? `<p><strong>Why:</strong> ${app.housingWhy}</p>` : ''}
                    ${app.housingAction ? `<p><strong>What should be done:</strong> ${app.housingAction}</p>` : ''}
                </div>
                ${app.ifMayor ? `
                <div class="details-section">
                    <h4><i class="fas fa-star"></i> If I Were Mayor</h4>
                    <p>${app.ifMayor}</p>
                </div>
                ` : ''}
                ${app.additionalConcerns ? `
                <div class="details-section">
                    <h4><i class="fas fa-comment"></i> Additional Concerns</h4>
                    <p>${app.additionalConcerns}</p>
                </div>
                ` : ''}
                <div class="details-section">
                    <h4><i class="fas fa-hands-helping"></i> Get Involved</h4>
                    <p>${getInvolvedDisplay}${app.getInvolvedOther ? ` (Other: ${app.getInvolvedOther})` : ''}</p>
                </div>
            </div>

            <div class="event-card-actions">
                ${isNew ? `
                    <button class="btn-approve" onclick="markAsReviewed('communityVoicesSurveys', '${app.id}', this)">
                        <i class="fas fa-check"></i> Mark as Reviewed
                    </button>
                ` : `
                    <span class="reviewed-label"><i class="fas fa-check-circle"></i> Reviewed</span>
                `}
                ${app.contactEmail ? `
                    <a href="mailto:${app.contactEmail}" class="btn-view-event">
                        <i class="fas fa-envelope"></i> Email Respondent
                    </a>
                ` : ''}
                <button class="btn-view-event" onclick="viewFullApplication('${app.id}')">
                    <i class="fas fa-external-link-alt"></i> View Full Application
                </button>
                <button class="btn-delete" onclick="deleteApplication('communityVoicesSurveys', '${app.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// =============================================
// EVENTS: EXISTING FUNCTIONS (UNCHANGED)
// =============================================

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = parseDateSafe(dateString);
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Toggle event details
window.toggleDetails = function(eventId) {
    const detailsSection = document.getElementById(`details-${eventId}`);
    const button = document.querySelector(`[data-event-id="${eventId}"] .btn-view-details`);

    if (detailsSection.style.display === 'none') {
        detailsSection.style.display = 'block';
        button.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Details';
    } else {
        detailsSection.style.display = 'none';
        button.innerHTML = '<i class="fas fa-chevron-down"></i> View Details';
    }
};

// Approve event
window.approveEvent = async function(eventId) {
    if (!confirm('Approve this event and publish it to the website?')) return;

    try {
        const eventRef = doc(db, 'events', eventId);
        const eventDoc = await getDoc(eventRef);

        if (!eventDoc.exists()) {
            alert('Event not found');
            return;
        }

        await updateDoc(eventRef, {
            status: 'approved',
            approvedAt: new Date().toISOString()
        });

        alert('Event approved successfully! It will now appear on the website.');
        loadDashboard();

    } catch (error) {
        console.error('Error approving event:', error);
        alert('Error approving event. Please try again.');
    }
};

// Reject event
window.rejectEvent = async function(eventId) {
    if (!confirm('Are you sure you want to reject and delete this event? This action cannot be undone.')) return;

    try {
        await deleteDoc(doc(db, 'events', eventId));
        alert('Event rejected and deleted.');
        loadDashboard();

    } catch (error) {
        console.error('Error rejecting event:', error);
        alert('Error rejecting event. Please try again.');
    }
};

// Display pending events
function displayPendingEvents(events) {
    const container = document.getElementById('pending-events-container');

    if (events.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No pending events to review</p>
            </div>
        `;
        return;
    }

    container.innerHTML = events.map(event => `
        <div class="event-card-admin" data-event-id="${event.id}">
            <div class="event-card-header">
                <div>
                    <h3>${event.eventTitle || 'Untitled Event'}</h3>
                    <span class="event-badge">${event.eventType || 'Event'}</span>
                </div>
                <button class="btn-view-details" onclick="toggleDetails('${event.id}')">
                    <i class="fas fa-chevron-down"></i>
                    View Details
                </button>
            </div>

            <div class="event-card-info">
                <div class="info-item">
                    <i class="far fa-calendar"></i>
                    <span>${formatDate(event.eventDate)}</span>
                </div>
                <div class="info-item">
                    <i class="far fa-clock"></i>
                    <span>${formatTime(event.eventTime)}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${event.eventLocation || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-user"></i>
                    <span>${event.organizerName || 'N/A'}</span>
                </div>
            </div>

            <div class="event-details-expand" id="details-${event.id}" style="display: none;">
                <div class="details-section">
                    <h4><i class="fas fa-info-circle"></i> Event Description</h4>
                    <p>${event.eventDescription || 'No description provided'}</p>
                </div>

                ${event.eventImage ? `
                    <div class="details-section">
                        <h4><i class="fas fa-image"></i> Event Flyer</h4>
                        <img src="${event.eventImage}" alt="Event Flyer" style="max-width: 100%; border-radius: 8px; margin-top: 0.5rem;">
                    </div>
                ` : ''}

                <div class="details-section">
                    <h4><i class="fas fa-user-circle"></i> Organizer Contact</h4>
                    <div class="contact-info">
                        <p><strong>Name:</strong> ${event.organizerName || 'N/A'}</p>
                        <p><strong>Email:</strong> ${event.organizerEmail ? `<a href="mailto:${event.organizerEmail}">${event.organizerEmail}</a>` : 'N/A'}</p>
                        <p><strong>Phone:</strong> ${event.organizerPhone ? `<a href="tel:${event.organizerPhone}">${event.organizerPhone}</a>` : 'N/A'}</p>
                    </div>
                </div>

                <div class="details-section">
                    <h4><i class="fas fa-clipboard-list"></i> Additional Information</h4>
                    <p><strong>Wants WESTSIDE RISING as Partner:</strong> ${event.westsideRisingPartner ? 'Yes' : 'No'}</p>
                    <p><strong>Expected Attendees:</strong> ${event.expectedAttendees || 'Not specified'}</p>
                    <p><strong>Registration Required:</strong> ${event.registrationRequired ? 'Yes' : 'No'}</p>
                    ${event.registrationLink ? `<p><strong>Registration Link:</strong> <a href="${event.registrationLink}" target="_blank">${event.registrationLink}</a></p>` : ''}
                    <p><strong>Submitted:</strong> ${formatDate(event.submittedAt)}</p>
                </div>
            </div>

            <div class="event-card-actions">
                <button class="btn-approve" onclick="approveEvent('${event.id}')">
                    <i class="fas fa-check"></i>
                    Approve & Publish
                </button>
                <button class="btn-reject" onclick="rejectEvent('${event.id}')">
                    <i class="fas fa-times"></i>
                    Reject
                </button>
            </div>
        </div>
    `).join('');
}

// Display approved events
function displayApprovedEvents(events) {
    const container = document.getElementById('approved-events-container');

    if (events.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p>No approved events</p>
            </div>
        `;
        return;
    }

    events.sort((a, b) => {
        const dateA = parseDateSafe(a.eventDate);
        const dateB = parseDateSafe(b.eventDate);
        return dateB - dateA;
    });

    container.innerHTML = events.map(event => `
        <div class="event-card-admin approved-event-card" data-event-id="${event.id}">
            <div class="event-card-header">
                <div>
                    <h3>${event.eventTitle || 'Untitled Event'}</h3>
                    <span class="event-badge approved-badge">${event.eventType || 'Event'}</span>
                </div>
                <button class="btn-view-details" onclick="toggleDetails('${event.id}')">
                    <i class="fas fa-chevron-down"></i>
                    View Details
                </button>
            </div>

            <div class="event-card-info">
                <div class="info-item">
                    <i class="far fa-calendar"></i>
                    <span>${formatDate(event.eventDate)}</span>
                </div>
                <div class="info-item">
                    <i class="far fa-clock"></i>
                    <span>${formatTime(event.eventTime)}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${event.eventLocation || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-user"></i>
                    <span>${event.organizerName || 'N/A'}</span>
                </div>
            </div>

            <div class="event-details-expand" id="details-${event.id}" style="display: none;">
                <div class="details-section">
                    <h4><i class="fas fa-info-circle"></i> Event Description</h4>
                    <p>${event.eventDescription || 'No description provided'}</p>
                </div>

                ${event.eventImage ? `
                    <div class="details-section">
                        <h4><i class="fas fa-image"></i> Event Flyer</h4>
                        <img src="${event.eventImage}" alt="Event Flyer" style="max-width: 100%; border-radius: 8px; margin-top: 0.5rem;">
                    </div>
                ` : ''}

                <div class="details-section">
                    <h4><i class="fas fa-user-circle"></i> Organizer Contact</h4>
                    <div class="contact-info">
                        <p><strong>Name:</strong> ${event.organizerName || 'N/A'}</p>
                        <p><strong>Email:</strong> ${event.organizerEmail ? `<a href="mailto:${event.organizerEmail}">${event.organizerEmail}</a>` : 'N/A'}</p>
                        <p><strong>Phone:</strong> ${event.organizerPhone ? `<a href="tel:${event.organizerPhone}">${event.organizerPhone}</a>` : 'N/A'}</p>
                    </div>
                </div>

                <div class="details-section">
                    <h4><i class="fas fa-clipboard-list"></i> Additional Information</h4>
                    <p><strong>Wants WESTSIDE RISING as Partner:</strong> ${event.westsideRisingPartner ? 'Yes' : 'No'}</p>
                    <p><strong>Expected Attendees:</strong> ${event.expectedAttendees || 'Not specified'}</p>
                    <p><strong>Registration Required:</strong> ${event.registrationRequired ? 'Yes' : 'No'}</p>
                    ${event.registrationLink ? `<p><strong>Registration Link:</strong> <a href="${event.registrationLink}" target="_blank">${event.registrationLink}</a></p>` : ''}
                    <p><strong>Approved:</strong> ${formatDate(event.approvedAt)}</p>
                </div>
            </div>

            <div class="event-card-actions">
                <a href="event-detail.html?id=${event.id}" class="btn-view-event" target="_blank">
                    <i class="fas fa-eye"></i>
                    View on Site
                </a>
                <button class="btn-delete" onclick="deleteEvent('${event.id}')">
                    <i class="fas fa-trash"></i>
                    Delete Event
                </button>
            </div>
        </div>
    `).join('');
}

// Delete approved event
window.deleteEvent = async function(eventId) {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone and will remove it from the website.')) return;

    try {
        await deleteDoc(doc(db, 'events', eventId));
        alert('Event deleted successfully.');
        loadDashboard();

    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event. Please try again.');
    }
};
