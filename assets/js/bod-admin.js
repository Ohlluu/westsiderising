// BOD Tab — Board of Directors records, superadmin only.
//
// Lives in the staff portal (time-clock.html) alongside the Onboarding tab, but is
// restricted to superadmin at three layers: the tab button is only un-hidden for
// superadmin, initializeBOD() returns immediately for anyone else, and the Firestore
// rules grant `list` on boardMembers / boardContracts to superadmin alone.

const BOD_ROSTER_SUGGESTIONS = [
    'Bradly Johnson',
    'Carol Johnson',
    'Anthony Jones',
    'Alees Edwards',
    'Dr. Mary Nelson',
    'Martin Coffer',
];

let bodMembers = [];
let bodContracts = {};       // keyed by access code
let bodCurrentCode = null;
let bodCurrentDoc = BOARD_DOCS[0].id;

// ==================== Entry Point ====================

function initializeBOD() {
    const container = document.getElementById('bod-tab');
    if (!container) return;

    // Hard gate — not just a hidden tab button.
    if (userRole !== 'superadmin') {
        container.innerHTML = `
            <div class="contracts-empty">
                <i class="fas fa-lock"></i> This section is restricted.
            </div>`;
        return;
    }

    renderBODRoster();
}

// ==================== Roster ====================

async function renderBODRoster() {
    const container = document.getElementById('bod-tab');
    bodCurrentCode = null;

    container.innerHTML = `
        <div class="contracts-container">
            <div class="bod-header">
                <div>
                    <h2 class="bod-title">Board of Directors</h2>
                    <p class="bod-subtitle">
                        Signed governance documents. Each director receives a private link &mdash;
                        these pages are not linked anywhere on the website.
                    </p>
                </div>
                <button class="bod-add-btn" onclick="showBODAddForm()">
                    <i class="fas fa-plus"></i> Add Board Member
                </button>
            </div>

            <div id="bod-add-form" class="bod-add-form" style="display:none;">
                <label for="bod-new-name">Board member name</label>
                <input type="text" id="bod-new-name" list="bod-name-suggestions"
                       placeholder="Full name" autocomplete="off">
                <datalist id="bod-name-suggestions">
                    ${BOD_ROSTER_SUGGESTIONS.map(n => `<option value="${bdEscape(n)}">`).join('')}
                </datalist>
                <div class="bod-add-actions">
                    <button class="bod-cancel-btn" onclick="hideBODAddForm()">Cancel</button>
                    <button class="bod-save-btn" onclick="createBODMember()">
                        <i class="fas fa-key"></i> Generate Access Link
                    </button>
                </div>
                <div id="bod-add-error" class="bod-add-error" style="display:none;"></div>
            </div>

            <div id="bod-list" class="staff-contracts-list">
                <div class="contracts-loading"><i class="fas fa-spinner fa-spin"></i> Loading board members…</div>
            </div>
        </div>
    `;

    try {
        const [memberSnap, contractSnap] = await Promise.all([
            db.collection('boardMembers').get(),
            db.collection('boardContracts').get()
        ]);

        bodMembers = [];
        memberSnap.forEach(doc => bodMembers.push({ code: doc.id, ...doc.data() }));
        bodMembers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        bodContracts = {};
        contractSnap.forEach(doc => { bodContracts[doc.id] = doc.data(); });

        renderBODRows();
    } catch (err) {
        console.error('Error loading board members:', err);
        document.getElementById('bod-list').innerHTML =
            '<div class="contracts-empty">Error loading board members.</div>';
    }
}

function renderBODRows() {
    const list = document.getElementById('bod-list');
    if (!list) return;

    if (!bodMembers.length) {
        list.innerHTML = `
            <div class="contracts-empty">
                No board members yet. Use <strong>Add Board Member</strong> to generate
                a private signing link for each director.
            </div>`;
        return;
    }

    list.innerHTML = bodMembers.map(m => {
        const data = bodContracts[m.code] || { documents: {} };
        const signedCount = BOARD_DOCS.filter(d => data.documents?.[d.id]?.signed).length;
        const status = m.revoked ? 'revoked'
            : signedCount === BOARD_DOCS.length ? 'complete'
            : signedCount > 0 ? 'partial' : 'not-started';

        return `
            <div class="staff-contract-row bod-row">
                <div class="staff-contract-info" onclick="openBODMember('${m.code}')">
                    <div class="staff-contract-avatar">${bdEscape(bodInitials(m.name))}</div>
                    <div>
                        <div class="staff-contract-name">${bdEscape(m.name || 'Unnamed')}</div>
                        <div class="staff-contract-email">
                            ${signedCount} of ${BOARD_DOCS.length} documents signed
                        </div>
                    </div>
                </div>
                <div class="staff-contract-status">
                    ${bodStatusBadge(status)}
                    <button class="bod-icon-btn" title="Copy private link"
                            onclick="copyBODLink(event, '${m.code}')">
                        <i class="fas fa-link"></i>
                    </button>
                    <button class="bod-icon-btn ${m.revoked ? 'restore' : 'danger'}"
                            title="${m.revoked ? 'Reactivate access' : 'Revoke access'}"
                            onclick="toggleBODRevoked(event, '${m.code}', ${!m.revoked})">
                        <i class="fas fa-${m.revoked ? 'rotate-left' : 'ban'}"></i>
                    </button>
                    <i class="fas fa-chevron-right bod-chevron" onclick="openBODMember('${m.code}')"></i>
                </div>
            </div>
        `;
    }).join('');
}

function bodStatusBadge(status) {
    const map = {
        'not-started': ['badge-not-started',  'Not Started'],
        'partial':     ['badge-wr-signed',    'In Progress'],
        'complete':    ['badge-complete',     '<i class="fas fa-check"></i> Complete'],
        'revoked':     ['badge-revoked',      'Access Revoked'],
    };
    const [cls, label] = map[status] || map['not-started'];
    return `<span class="contract-status-badge ${cls}">${label}</span>`;
}

// ==================== Add / Revoke ====================

function showBODAddForm() {
    document.getElementById('bod-add-form').style.display = 'block';
    document.getElementById('bod-new-name').focus();
}

function hideBODAddForm() {
    document.getElementById('bod-add-form').style.display = 'none';
    document.getElementById('bod-new-name').value = '';
    document.getElementById('bod-add-error').style.display = 'none';
}

// 24 chars of crypto-random base32. The code is the Firestore document ID and is
// the only secret protecting the link, so it must be long enough to resist guessing.
function generateBODCode() {
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  // no I, L, O, 0, 1
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}

async function createBODMember() {
    const nameInput = document.getElementById('bod-new-name');
    const errorEl = document.getElementById('bod-add-error');
    const name = nameInput.value.trim();

    if (!name) {
        errorEl.textContent = 'Please enter the board member\'s name.';
        errorEl.style.display = 'block';
        return;
    }

    const code = generateBODCode();

    try {
        await db.collection('boardMembers').doc(code).set({
            name,
            revoked: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid
        });

        hideBODAddForm();
        await renderBODRoster();
        showBODLinkModal(name, code);
    } catch (err) {
        console.error('Error creating board member:', err);
        errorEl.textContent = 'Could not create the access link. Please try again.';
        errorEl.style.display = 'block';
    }
}

async function toggleBODRevoked(event, code, revoked) {
    event.stopPropagation();
    const member = bodMembers.find(m => m.code === code);
    const name = member ? member.name : 'this board member';

    const msg = revoked
        ? `Revoke access for ${name}?\n\nTheir link will stop working. Documents they have already signed are kept.`
        : `Reactivate access for ${name}?\n\nTheir original link will work again.`;
    if (!confirm(msg)) return;

    try {
        await db.collection('boardMembers').doc(code).update({ revoked });
        await renderBODRoster();
    } catch (err) {
        console.error('Error updating board member:', err);
        alert('Could not update access. Please try again.');
    }
}

function bodLinkFor(code) {
    return `${window.location.origin}/board.html?c=${code}`;
}

async function copyBODLink(event, code) {
    event.stopPropagation();
    const member = bodMembers.find(m => m.code === code);
    showBODLinkModal(member ? member.name : '', code);
}

function showBODLinkModal(name, code) {
    const link = bodLinkFor(code);
    const existing = document.getElementById('bod-link-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'bod-link-modal';
    modal.className = 'bod-modal';
    modal.innerHTML = `
        <div class="bod-modal-card">
            <h3><i class="fas fa-link"></i> Private link for ${bdEscape(name)}</h3>
            <p class="bod-modal-note">
                Send this link directly to ${bdEscape(name)} only. Anyone who has it can sign
                as this board member, so do not post it or forward it to a group.
            </p>
            <textarea class="bod-link-box" readonly rows="3">${bdEscape(link)}</textarea>
            <div class="bod-modal-actions">
                <button class="bod-cancel-btn" onclick="document.getElementById('bod-link-modal').remove()">Close</button>
                <button class="bod-save-btn" onclick="copyBODLinkText(this, '${bdEscape(link)}')">
                    <i class="fas fa-copy"></i> Copy Link
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function copyBODLinkText(btn, link) {
    navigator.clipboard.writeText(link).then(() => {
        btn.innerHTML = '<i class="fas fa-check"></i> Copied';
        setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i> Copy Link'; }, 2000);
    }).catch(() => {
        const box = document.querySelector('.bod-link-box');
        if (box) { box.select(); }
        alert('Press Cmd/Ctrl+C to copy the selected link.');
    });
}

// ==================== Member Document View (read-only) ====================

async function openBODMember(code) {
    bodCurrentCode = code;
    bodCurrentDoc = BOARD_DOCS[0].id;

    const member = bodMembers.find(m => m.code === code) || { name: '' };
    const container = document.getElementById('bod-tab');

    container.innerHTML = `
        <div class="contracts-container">
            <button class="contracts-back-btn" onclick="renderBODRoster()">
                <i class="fas fa-arrow-left"></i> Back to Board of Directors
            </button>
            <div class="contracts-header-bar">
                <div>
                    <div class="contracts-header-name">${bdEscape(member.name || 'Board Member')}</div>
                    <div class="contracts-header-sub">Board of Directors &bull; Governance Documents</div>
                </div>
                <div id="bod-overall-badge"></div>
            </div>
            <div class="doc-tabs" id="bod-doc-tabs"></div>
            <div id="bod-doc-content"></div>
        </div>
    `;

    try {
        const snap = await db.collection('boardContracts').doc(code).get();
        bodContracts[code] = snap.exists ? snap.data() : { documents: {} };
        if (!bodContracts[code].documents) bodContracts[code].documents = {};
    } catch (e) {
        bodContracts[code] = { documents: {} };
    }

    renderBODDocTabs();
    renderBODDocument(bodCurrentDoc);
}

function renderBODDocTabs() {
    const tabs = document.getElementById('bod-doc-tabs');
    if (!tabs) return;
    const data = bodContracts[bodCurrentCode] || { documents: {} };

    tabs.innerHTML = BOARD_DOCS.map(d => {
        const signed = !!data.documents?.[d.id]?.signed;
        const icon = signed ? '<i class="fas fa-check-circle doc-tab-check"></i>' : '';
        return `<button class="doc-tab-btn ${d.id === bodCurrentDoc ? 'active' : ''}"
                    onclick="switchBODDoc('${d.id}')">${icon}${d.label}</button>`;
    }).join('');
}

function switchBODDoc(docId) {
    bodCurrentDoc = docId;
    renderBODDocTabs();
    renderBODDocument(docId);
}

function renderBODDocument(docId) {
    const content = document.getElementById('bod-doc-content');
    if (!content) return;

    const data = bodContracts[bodCurrentCode] || { documents: {} };
    const docData = data.documents?.[docId] || {};
    const signed = !!docData.signed;
    const saved = docData.fields || {};
    const sig = docData.signature || {};

    const banner = signed
        ? `<div class="doc-status-banner fully-signed"><i class="fas fa-lock"></i> Signed on ${formatBODDate(sig.date)}.</div>`
        : `<div class="doc-status-banner pending-staff"><i class="fas fa-clock"></i> Not yet signed by this board member.</div>`;

    const sigBlock = `
        <div class="signature-block">
            <div class="signature-party single">
                <div class="signature-party-label">BOARD MEMBER</div>
                <div class="signature-row">
                    <label>Signature</label>
                    ${signed
                        ? `<div class="signature-name-display">${bdEscape(sig.name)}</div>`
                        : '<div class="signature-name-display" style="color:#bbb;font-size:1rem;">Pending</div>'}
                </div>
                <div class="signature-row">
                    <label>Date</label>
                    <div class="signature-date-display">${signed ? formatBODDate(sig.date) : ''}</div>
                </div>
            </div>
        </div>
    `;

    content.innerHTML = `
        <div class="document-card">
            ${banner}
            <div class="document-body">
                ${buildBoardDocument(docId, saved, false)}
                ${sigBlock}
            </div>
            <div class="contract-action-bar">
                <button class="contract-save-btn print-doc-btn"><i class="fas fa-print"></i> Print / Save PDF</button>
            </div>
        </div>
    `;

    const printBtn = content.querySelector('.print-doc-btn');
    if (printBtn) printBtn.addEventListener('click', () => printBODDocument(docId));
}

function printBODDocument(docId) {
    const body = document.querySelector('#bod-doc-content .document-body');
    if (!body) return;
    const member = bodMembers.find(m => m.code === bodCurrentCode) || { name: '' };

    const win = window.open('', '_blank');
    if (!win) {
        alert('Please allow popups for this site to print documents.');
        return;
    }

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${bdEscape(boardDocLabel(docId))} — ${bdEscape(member.name)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap" rel="stylesheet">
    <style>
        body{font-family:Arial,Helvetica,sans-serif;padding:2rem 3rem;color:#222;font-size:11pt;line-height:1.7;margin:0;}
        .doc-title{text-align:center;font-weight:700;font-size:1rem;text-decoration:underline;margin-bottom:0.6rem;}
        .doc-subtitle{text-align:center;font-weight:600;margin-bottom:1.2rem;}
        .doc-section-heading{font-weight:700;margin:1.2rem 0 0.4rem;}
        .doc-sub-heading{font-weight:700;margin:0.8rem 0 0.3rem;}
        .doc-paragraph{margin-bottom:0.8rem;}
        .doc-list{margin:0.4rem 0 0.8rem 1.5rem;padding:0;}
        .doc-list li{margin-bottom:0.3rem;}
        .doc-checklist{margin:0.4rem 0 0.8rem 1.5rem;padding:0;list-style:none;}
        .doc-checklist li:before{content:"\\2610  ";}
        .doc-field{display:inline-block;border:none;border-bottom:1px solid #333;min-width:140px;padding:0 2px;}
        .doc-field-wide{min-width:260px;}
        .doc-field-block{display:block;width:100%;margin-bottom:0.6rem;min-height:1.4rem;}
        .doc-disclosure-box{border:1px solid #999;padding:0.8rem;margin-bottom:1rem;}
        .doc-closing{margin-top:2rem;}
        .signature-block{margin-top:2rem;padding-top:1.2rem;border-top:2px solid #ddd;page-break-inside:avoid;}
        .signature-party-label{font-weight:700;font-size:0.85rem;border-bottom:1px solid #ddd;padding-bottom:0.4rem;margin-bottom:0.8rem;}
        .signature-row{margin-bottom:0.6rem;}
        .signature-row label{display:block;font-size:0.75rem;font-weight:600;color:#555;text-transform:uppercase;margin-bottom:0.2rem;}
        .signature-name-display{font-family:'Dancing Script','Brush Script MT',cursive;font-size:1.4rem;color:#1a1a4e;border-bottom:1px solid #333;min-height:1.8rem;padding:0.1rem 0;}
        .signature-date-display{font-size:0.85rem;border-bottom:1px solid #ccc;min-height:1.2rem;padding:0.1rem 0;max-width:220px;}
        .doc-status-banner,.contract-action-bar{display:none;}
    </style>
    </head><body>${body.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
}

// ==================== Helpers ====================

function bodInitials(name) {
    if (!name) return '?';
    const parts = name.trim().replace(/^Dr\.?\s+/i, '').split(/\s+/);
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name[0].toUpperCase();
}

function formatBODDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
}
