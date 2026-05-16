// Contracts Module
// Handles onboarding contract management for superadmin and staff

let contractsCurrentStaffId = null;
let contractsCurrentDoc = 'pp'; // pp | nda | equip | sev | coi | service
let contractsAllUsers = [];
let contractsData = {}; // keyed by staffUid
let contractsListenerUnsubscribe = null;

const NKOYA_UID = 'VZdD61oB7daZay6Ywp930xsUQod2';

const KENDRA_UID = '4MgSx1ni3xYYaiGV5ZLC5JEpwuf2';

const SUMMER_YOUTH_UIDS = new Set([
    'WbyPWW3M2adPCxW427OgccobV512',
    'bnxVbku9G6Q4uLa0p4J8GfvPfm33',
    'KD8JLN2ZALTJXbU7iCadbsodi1t2',
    'inNsPd91xoXzzhp01Xk9id3deAn1',
]);

const DISPLAY_NAME_OVERRIDES = {
    'VZdD61oB7daZay6Ywp930xsUQod2': 'Nkoya Kidd',
    '4MgSx1ni3xYYaiGV5ZLC5JEpwuf2': 'Kendra Clayton',
    'b8DV9T7zHLbRlLQmuS6nQcbDxI73': 'Dijana Reedfields',
    'WbyPWW3M2adPCxW427OgccobV512': 'Franklyn Hughes',
    'bnxVbku9G6Q4uLa0p4J8GfvPfm33': 'Mariah Jordan',
    'KD8JLN2ZALTJXbU7iCadbsodi1t2': 'Ivan Grant',
    'inNsPd91xoXzzhp01Xk9id3deAn1': 'Mekylah Endsley',
};

const BASE_CONTRACT_DOCS = [
    { id: 'pp',      label: 'Policies & Procedures' },
    { id: 'nda',     label: 'Non-Disclosure Agreement' },
    { id: 'equip',   label: 'Equipment Agreement' },
    { id: 'sev',     label: 'Severance Agreement' },
    { id: 'coi',     label: 'Conflict of Interest' },
    { id: 'media',   label: 'Media Release Agreement' },
    { id: 'email',   label: 'Email Use Policy' },
    { id: 'service', label: 'Service Agreement' },
];

function getDocList(staffUid) {
    return [...BASE_CONTRACT_DOCS];
}

// ==================== Entry Point ====================

function initializeContracts() {
    const container = document.getElementById('contracts-tab');
    if (!container) return;

    if (userRole === 'superadmin') {
        renderSuperadminContractsList();
    } else {
        renderStaffContractView(currentUser.uid);
    }
}

// ==================== Superadmin: Staff List ====================

async function renderSuperadminContractsList() {
    const container = document.getElementById('contracts-tab');
    container.innerHTML = `
        <div class="contracts-container">
            <div style="margin-bottom:1.5rem;">
                <h2 style="font-size:1.4rem;font-weight:700;color:#222;">Staff Contracts</h2>
                <p style="color:#888;font-size:0.9rem;">Select a staff member to view or sign their onboarding documents.</p>
            </div>
            <div id="staff-contracts-list" class="staff-contracts-list">
                <div class="contracts-loading"><i class="fas fa-spinner fa-spin"></i> Loading staff...</div>
            </div>
        </div>
    `;

    try {
        const snapshot = await db.collection('users').get();
        const users = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.role !== 'superadmin') {
                users.push({ uid: doc.id, ...data });
            }
        });

        contractsAllUsers = users.sort((a, b) => {
            const nameA = (a.displayname || a.email || '').toLowerCase();
            const nameB = (b.displayname || b.email || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        // Load all contract statuses
        const contractSnap = await db.collection('contracts').get();
        contractsData = {};
        contractSnap.forEach(doc => {
            contractsData[doc.id] = doc.data();
        });

        renderStaffContractRows();
    } catch (err) {
        console.error('Error loading staff:', err);
        document.getElementById('staff-contracts-list').innerHTML =
            '<div class="contracts-empty">Error loading staff list.</div>';
    }
}

function renderStaffContractRows() {
    const list = document.getElementById('staff-contracts-list');
    if (!contractsAllUsers.length) {
        list.innerHTML = '<div class="contracts-empty">No staff found.</div>';
        return;
    }

    list.innerHTML = contractsAllUsers.map(user => {
        const data = contractsData[user.uid] || {};
        const status = getOverallStatus(data, user.uid);
        const name = DISPLAY_NAME_OVERRIDES[user.uid] || user.displayname || user.email;
        const initials = getInitials(name);
        return `
            <div class="staff-contract-row" onclick="openStaffContracts('${user.uid}')">
                <div class="staff-contract-info">
                    <div class="staff-contract-avatar">${initials}</div>
                    <div>
                        <div class="staff-contract-name">${name}</div>
                        <div class="staff-contract-email">${user.email || ''}</div>
                    </div>
                </div>
                <div class="staff-contract-status">
                    ${renderStatusBadge(status)}
                    <i class="fas fa-chevron-right" style="color:#ccc;margin-left:0.5rem;"></i>
                </div>
            </div>
        `;
    }).join('');
}

function getOverallStatus(data, staffUid) {
    if (!data || !data.documents) return 'not-started';
    const docs = data.documents;
    const docList = getDocList(staffUid);
    const allSigned = docList.every(d => docs[d.id]?.wrSigned && docs[d.id]?.staffSigned);
    if (allSigned) return 'complete';
    const wrSigned = docList.some(d => docs[d.id]?.wrSigned);
    const staffSigned = docList.some(d => docs[d.id]?.staffSigned);
    if (staffSigned) return 'staff-signed';
    if (wrSigned) return 'wr-signed';
    return 'not-started';
}

function renderStatusBadge(status) {
    const map = {
        'not-started': ['badge-not-started', 'Not Started'],
        'wr-signed':   ['badge-wr-signed',   'WR Signed — Awaiting Staff'],
        'staff-signed':['badge-staff-signed', 'Staff Signed — Awaiting WR'],
        'complete':    ['badge-complete',     '<i class="fas fa-check"></i> Complete'],
    };
    const [cls, label] = map[status] || map['not-started'];
    return `<span class="contract-status-badge ${cls}">${label}</span>`;
}

// ==================== Open Staff Contract Documents ====================

async function openStaffContracts(staffUid) {
    contractsCurrentStaffId = staffUid;
    contractsCurrentDoc = 'pp';

    const user = contractsAllUsers.find(u => u.uid === staffUid) || { uid: staffUid, displayname: '', email: '' };
    const name = user.displayname || user.email;

    const container = document.getElementById('contracts-tab');
    container.innerHTML = `
        <div class="contracts-container">
            <button class="contracts-back-btn" onclick="renderSuperadminContractsList()">
                <i class="fas fa-arrow-left"></i> Back to Staff List
            </button>
            <div class="contracts-header-bar">
                <div>
                    <div class="contracts-header-name">${name}</div>
                    <div class="contracts-header-sub">${user.email || ''} &bull; Onboarding Documents</div>
                </div>
                <div id="contracts-overall-badge"></div>
            </div>
            <div class="doc-tabs" id="doc-tabs"></div>
            <div id="doc-content"></div>
        </div>
    `;

    // Load contract data for this staff
    try {
        const docSnap = await db.collection('contracts').doc(staffUid).get();
        contractsData[staffUid] = docSnap.exists ? docSnap.data() : { documents: {} };
    } catch (e) {
        contractsData[staffUid] = { documents: {} };
    }

    renderDocTabs();
    renderDocument(contractsCurrentDoc);
}

function renderDocTabs() {
    const tabs = document.getElementById('doc-tabs');
    if (!tabs) return;
    const data = contractsData[contractsCurrentStaffId] || { documents: {} };

    tabs.innerHTML = getDocList(contractsCurrentStaffId).map(d => {
        const docData = (data.documents || {})[d.id] || {};
        const wrSigned = !!docData.wrSigned;
        const staffSigned = !!docData.staffSigned;
        const bothSigned = wrSigned && staffSigned;
        const checkIcon = bothSigned
            ? '<i class="fas fa-check-circle doc-tab-check"></i>'
            : wrSigned ? '<i class="fas fa-signature doc-tab-check" style="color:#f0ad4e;"></i>'
            : '';
        return `
            <button class="doc-tab-btn ${d.id === contractsCurrentDoc ? 'active' : ''}"
                onclick="switchDocTab('${d.id}')">
                ${checkIcon}${d.label}
            </button>
        `;
    }).join('');
}

function switchDocTab(docId) {
    contractsCurrentDoc = docId;
    renderDocTabs();
    renderDocument(docId);
}

// ==================== Staff: Own Contract View ====================

async function renderStaffContractView(staffUid) {
    contractsCurrentStaffId = staffUid;
    contractsCurrentDoc = 'pp';

    const container = document.getElementById('contracts-tab');
    container.innerHTML = `
        <div class="contracts-container">
            <div style="margin-bottom:1.5rem;">
                <h2 style="font-size:1.4rem;font-weight:700;color:#222;">My Contracts</h2>
                <p style="color:#888;font-size:0.9rem;">Review and sign your onboarding documents. You can complete these over multiple sessions.</p>
            </div>
            <div class="doc-tabs" id="doc-tabs"></div>
            <div id="doc-content"></div>
        </div>
    `;

    try {
        const docSnap = await db.collection('contracts').doc(staffUid).get();
        if (!docSnap.exists || !docSnap.data()?.documents?.pp?.wrSigned) {
            // WR hasn't signed yet
            document.querySelector('.contracts-container').innerHTML = `
                <div style="text-align:center;padding:4rem 2rem;">
                    <i class="fas fa-file-contract" style="font-size:3rem;color:#ccc;margin-bottom:1rem;display:block;"></i>
                    <h3 style="color:#555;margin-bottom:0.5rem;">Documents Not Ready Yet</h3>
                    <p style="color:#888;font-size:0.9rem;">Your onboarding documents are being prepared. Check back soon.</p>
                </div>
            `;
            return;
        }
        contractsData[staffUid] = docSnap.data();
    } catch (e) {
        contractsData[staffUid] = { documents: {} };
    }

    renderDocTabs();
    renderDocument(contractsCurrentDoc);
}

// ==================== Document Renderer ====================

function renderDocument(docId) {
    const docContent = document.getElementById('doc-content');
    if (!docContent) return;

    const data = contractsData[contractsCurrentStaffId] || { documents: {} };
    const docData = (data.documents || {})[docId] || {};
    const wrSigned = !!docData.wrSigned;
    const staffSigned = !!docData.staffSigned;
    const bothSigned = wrSigned && staffSigned;
    const isAdmin = userRole === 'superadmin';

    // Determine who can edit what
    const adminCanEdit = isAdmin && !wrSigned;
    const staffCanEdit = !isAdmin && wrSigned && !staffSigned;
    const locked = bothSigned;

    let statusBanner = '';
    if (locked) {
        statusBanner = `<div class="doc-status-banner fully-signed"><i class="fas fa-lock"></i> This document has been fully signed and is locked.</div>`;
    } else if (!wrSigned && isAdmin) {
        statusBanner = `<div class="doc-status-banner pending-wr"><i class="fas fa-pen"></i> Complete the highlighted fields and sign below to send to staff.</div>`;
    } else if (wrSigned && !staffSigned && isAdmin) {
        statusBanner = `<div class="doc-status-banner pending-staff"><i class="fas fa-clock"></i> Awaiting staff signature.</div>`;
    } else if (wrSigned && !staffSigned && !isAdmin) {
        statusBanner = `<div class="doc-status-banner pending-staff"><i class="fas fa-pen"></i> Complete the highlighted fields and sign below.</div>`;
    } else if (!wrSigned && !isAdmin) {
        statusBanner = `<div class="doc-status-banner pending-wr"><i class="fas fa-clock"></i> Waiting for Westside Rising to prepare your document.</div>`;
    }

    const savedFields = docData.fields || {};
    const wrSignature = docData.wrSignature || {};
    const staffSignature = docData.staffSignature || {};

    let docHTML = '';
    switch (docId) {
        case 'pp':    docHTML = buildPPDoc(savedFields, adminCanEdit, staffCanEdit, locked); break;
        case 'nda':   docHTML = buildNDADoc(savedFields, adminCanEdit, staffCanEdit, locked); break;
        case 'equip': docHTML = buildEquipDoc(savedFields, adminCanEdit, staffCanEdit, locked); break;
        case 'sev':   docHTML = buildSevDoc(savedFields, adminCanEdit, staffCanEdit, locked); break;
        case 'coi':     docHTML = buildCOIDoc(savedFields, adminCanEdit, staffCanEdit, locked); break;
        case 'media':   docHTML = buildMediaReleaseDoc(savedFields, adminCanEdit, staffCanEdit, locked); break;
        case 'email':   docHTML = buildEmailPolicyDoc(savedFields, adminCanEdit, staffCanEdit, locked); break;
        case 'service': docHTML = contractsCurrentStaffId === NKOYA_UID
            ? buildServiceAgreementDoc(savedFields, adminCanEdit, staffCanEdit, locked)
            : contractsCurrentStaffId === KENDRA_UID
                ? buildKendraServiceAgreementDoc(savedFields, adminCanEdit, staffCanEdit, locked)
                : SUMMER_YOUTH_UIDS.has(contractsCurrentStaffId)
                    ? buildSummerYouthServiceAgreementDoc(savedFields, adminCanEdit, staffCanEdit, locked)
                    : buildStaffServiceAgreementDoc(savedFields, adminCanEdit, staffCanEdit, locked); break;
    }

    docContent.innerHTML = `
        <div class="document-card">
            ${statusBanner}
            <div class="document-body">
                ${docHTML}
                ${renderSignatureBlock(docId, wrSignature, staffSignature, locked, wrSigned, isAdmin, staffCanEdit)}
            </div>
            <div class="contract-action-bar">
                ${renderActionButtons(docId, locked, wrSigned, staffSigned, isAdmin, adminCanEdit, staffCanEdit)}
            </div>
        </div>
    `;

    // Print button
    const printBtn = docContent.querySelector('.print-doc-btn');
    if (printBtn) {
        printBtn.addEventListener('click', () => printDocument());
    }

    // Auto-save on field change
    if (!locked) {
        docContent.querySelectorAll('.doc-field, .signature-name-input').forEach(input => {
            input.addEventListener('change', () => autoSaveFields(docId));
            input.addEventListener('blur', () => autoSaveFields(docId));
        });
    }
}

// ==================== Signature Block ====================

function renderSignatureBlock(docId, wrSig, staffSig, locked, wrSigned, isAdmin, staffCanEdit) {
    const wrDate = wrSig.date ? new Date(wrSig.date).toLocaleDateString() : '';
    const staffDate = staffSig.date ? new Date(staffSig.date).toLocaleDateString() : '';

    const wrSigDisplay = wrSig.name
        ? `<div class="signature-name-display">${wrSig.name}</div>`
        : (isAdmin && !wrSigned ? `<input class="signature-name-input" id="wr-sig-input" placeholder="Type full name to sign" autocomplete="off">` : '<div class="signature-name-display" style="color:#bbb;font-size:1rem;">Pending</div>');

    const staffSigDisplay = staffSig.name
        ? `<div class="signature-name-display">${staffSig.name}</div>`
        : (staffCanEdit ? `<input class="signature-name-input" id="staff-sig-input" placeholder="Type full name to sign" autocomplete="off">` : '<div class="signature-name-display" style="color:#bbb;font-size:1rem;">Pending</div>');

    return `
        <div class="signature-block">
            <div class="signature-grid">
                <div class="signature-party">
                    <div class="signature-party-label">WESTSIDE RISING</div>
                    <div class="signature-row">
                        <label>Signature</label>
                        ${wrSigDisplay}
                    </div>
                    <div class="signature-row">
                        <label>Date</label>
                        <div class="signature-date-display">${wrDate}</div>
                    </div>
                    ${wrSig.name ? `<div class="signature-row"><label>Name & Title</label><div class="signature-date-display">${wrSig.nameTitle || ''}</div></div>` : ''}
                </div>
                <div class="signature-party">
                    <div class="signature-party-label">EMPLOYEE / CONTRACTOR</div>
                    <div class="signature-row">
                        <label>Signature</label>
                        ${staffSigDisplay}
                    </div>
                    <div class="signature-row">
                        <label>Date</label>
                        <div class="signature-date-display">${staffDate}</div>
                    </div>
                    ${staffSig.name ? `<div class="signature-row"><label>Print Name</label><div class="signature-date-display">${staffSig.printName || ''}</div></div>` : ''}
                </div>
            </div>
            ${locked ? `<div style="margin-top:1rem;"><span class="signature-locked-badge"><i class="fas fa-lock"></i> Fully Executed — Locked</span></div>` : ''}
        </div>
    `;
}

function renderActionButtons(docId, locked, wrSigned, staffSigned, isAdmin, adminCanEdit, staffCanEdit) {
    const printBtn = `<button class="contract-save-btn print-doc-btn"><i class="fas fa-print"></i> Print / Save PDF</button>`;
    if (locked) {
        return `${printBtn}<div class="contract-locked-notice"><i class="fas fa-check-circle"></i> Fully signed and locked</div>`;
    }
    if (isAdmin && adminCanEdit) {
        return `
            ${printBtn}
            <button class="contract-save-btn" onclick="autoSaveFields('${docId}')"><i class="fas fa-save"></i> Save Progress</button>
            <button class="contract-sign-btn" onclick="submitWRSignature('${docId}')"><i class="fas fa-pen-nib"></i> Sign as Westside Rising</button>
        `;
    }
    if (isAdmin && wrSigned && !staffSigned) {
        return `${printBtn}<div style="color:#888;font-size:0.9rem;"><i class="fas fa-clock"></i> Waiting for staff to sign</div>`;
    }
    if (!isAdmin && staffCanEdit) {
        return `
            ${printBtn}
            <button class="contract-save-btn" onclick="autoSaveFields('${docId}')"><i class="fas fa-save"></i> Save Progress</button>
            <button class="contract-sign-btn" onclick="submitStaffSignature('${docId}')"><i class="fas fa-pen-nib"></i> Sign Document</button>
        `;
    }
    return printBtn;
}

// ==================== Print ====================

function printDocument() {
    const docBody = document.querySelector('.document-body');
    if (!docBody) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
        alert('Please allow popups for this site to print documents.');
        return;
    }

    printWin.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Document</title>
    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap" rel="stylesheet">
    <style>
        body{font-family:Arial,Helvetica,sans-serif;padding:2rem 3rem;color:#222;font-size:11pt;line-height:1.7;margin:0;}
        .doc-title{text-align:center;font-weight:700;font-size:1rem;text-decoration:underline;margin-bottom:1.2rem;}
        .doc-section-heading{font-weight:700;margin:1.2rem 0 0.4rem;}
        .doc-sub-heading{font-weight:700;margin:0.8rem 0 0.3rem;}
        .doc-paragraph{margin-bottom:0.8rem;}
        .doc-list{margin:0.4rem 0 0.8rem 1.5rem;padding:0;}
        .doc-list li{margin-bottom:0.3rem;}
        .doc-sub-list{margin:0.3rem 0 0.3rem 1.5rem;list-style-type:circle;}
        .doc-field{display:inline-block;border:none;border-bottom:1px solid #333;background:transparent;font-family:inherit;font-size:inherit;color:#222;min-width:120px;padding:0 2px;}
        .doc-field-wide{min-width:220px;}
        .doc-field-narrow{min-width:80px;}
        table{width:100%;border-collapse:collapse;margin-bottom:1rem;font-size:10.5pt;}
        td{padding:0.4rem 0.5rem;border-bottom:1px solid #ddd;}
        .signature-block{margin-top:2rem;padding-top:1.2rem;border-top:2px solid #ddd;page-break-inside:avoid;}
        .signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:2rem;}
        .signature-party-label{font-weight:700;font-size:0.85rem;border-bottom:1px solid #ddd;padding-bottom:0.4rem;margin-bottom:0.8rem;}
        .signature-row{margin-bottom:0.6rem;}
        .signature-row label{display:block;font-size:0.75rem;font-weight:600;color:#555;text-transform:uppercase;margin-bottom:0.2rem;}
        .signature-name-display{font-family:'Dancing Script','Brush Script MT',cursive;font-size:1.4rem;color:#1a1a4e;border-bottom:1px solid #333;min-height:1.8rem;padding:0.1rem 0;}
        .signature-name-input{font-family:'Dancing Script','Brush Script MT',cursive;font-size:1.4rem;color:#1a1a4e;border:none;border-bottom:1px solid #333;background:transparent;width:100%;}
        .signature-date-display{font-size:0.85rem;border-bottom:1px solid #ccc;min-height:1.2rem;padding:0.1rem 0;}
        .signature-locked-badge{display:none;}
        .contract-action-bar{display:none;}
        .doc-status-banner{display:none;}
    </style>
    </head><body>${docBody.innerHTML}</body></html>`);
    printWin.document.close();
    printWin.focus();
    printWin.print();
}

// ==================== Auto-Save ====================

async function autoSaveFields(docId) {
    if (!contractsCurrentStaffId) return;
    const fields = collectFields(docId);
    try {
        await db.collection('contracts').doc(contractsCurrentStaffId).set({
            documents: { [docId]: { fields } }
        }, { merge: true });
    } catch (e) {
        console.error('Auto-save error:', e);
    }
}

function collectFields(docId) {
    const fields = {};
    document.querySelectorAll('.doc-field').forEach(input => {
        if (input.id) fields[input.id] = input.value;
    });
    return fields;
}

// ==================== WR Signature Submission ====================

async function submitWRSignature(docId) {
    const sigInput = document.getElementById('wr-sig-input');
    if (!sigInput || !sigInput.value.trim()) {
        alert('Please type your full name in the signature field before signing.');
        return;
    }

    const wrNameTitle = prompt('Enter your name and title (e.g. Jane Smith, Executive Director):');
    if (!wrNameTitle) return;

    if (!confirm(`Sign this document as Westside Rising? This will send it to the staff member for their signature.`)) return;

    const fields = collectFields(docId);

    try {
        await db.collection('contracts').doc(contractsCurrentStaffId).set({
            staffUid: contractsCurrentStaffId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            documents: {
                [docId]: {
                    fields,
                    wrSigned: true,
                    wrSignature: {
                        name: sigInput.value.trim(),
                        nameTitle: wrNameTitle.trim(),
                        date: new Date().toISOString(),
                        signedBy: currentUser.uid,
                    }
                }
            }
        }, { merge: true });

        // Refresh
        const docSnap = await db.collection('contracts').doc(contractsCurrentStaffId).get();
        contractsData[contractsCurrentStaffId] = docSnap.data();
        renderDocTabs();
        renderDocument(docId);
    } catch (e) {
        console.error('Error saving WR signature:', e);
        alert('Error saving signature. Please try again.');
    }
}

// ==================== Staff Signature Submission ====================

async function submitStaffSignature(docId) {
    const sigInput = document.getElementById('staff-sig-input');
    if (!sigInput || !sigInput.value.trim()) {
        alert('Please type your full name in the signature field before signing.');
        return;
    }

    const printName = prompt('Please type your full printed name:');
    if (!printName) return;

    if (!confirm('By signing, you confirm you have read and agree to this document. This action cannot be undone.')) return;

    const fields = collectFields(docId);

    try {
        await db.collection('contracts').doc(contractsCurrentStaffId).set({
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            documents: {
                [docId]: {
                    fields,
                    staffSigned: true,
                    staffSignature: {
                        name: sigInput.value.trim(),
                        printName: printName.trim(),
                        date: new Date().toISOString(),
                        signedBy: currentUser.uid,
                    }
                }
            }
        }, { merge: true });

        const docSnap = await db.collection('contracts').doc(contractsCurrentStaffId).get();
        contractsData[contractsCurrentStaffId] = docSnap.data();
        renderDocTabs();
        renderDocument(docId);
    } catch (e) {
        console.error('Error saving staff signature:', e);
        alert('Error saving signature. Please try again.');
    }
}

// ==================== Helpers ====================

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name[0].toUpperCase();
}

function field(id, savedFields, canEdit, placeholder, extraClass) {
    const val = savedFields[id] || '';
    const cls = `doc-field${extraClass ? ' ' + extraClass : ''}`;
    if (!canEdit) {
        return `<input class="${cls} signed-field" id="${id}" value="${val.replace(/"/g, '&quot;')}" disabled>`;
    }
    return `<input class="${cls}" id="${id}" value="${val.replace(/"/g, '&quot;')}" placeholder="${placeholder || '________________'}" autocomplete="off">`;
}

// ==================== Document Builders ====================

function buildPPDoc(saved, adminEdit, staffEdit, locked) {
    const canEdit = adminEdit || staffEdit;
    return `
<div class="doc-title">POLICIES & PROCEDURES GUIDE</div>

<div class="doc-section-heading">1. Introduction</div>

<div class="doc-sub-heading">A. Purpose of This Guide</div>
<p class="doc-paragraph">This guide provides employees, contractors, and interns with an overview of WESTSIDE RISING (WR) policies and procedures. It ensures that all team members understand expectations, legal compliance, and ethical responsibilities. Employees must review and acknowledge this document to confirm their understanding.</p>

<div class="doc-sub-heading">B. About WESTSIDE RISING!</div>
<p class="doc-paragraph">Founded in 2018 and incorporated in 2021 as a 501 C3 nonprofit organization, WR is a social justice organization that works to unify and empower residents through leadership development, capacity building, training, and advocacy to work in solidarity to build a just, livable, and vibrant Greater West Side of Chicago, IL.</p>

<div class="doc-sub-heading">C. Policy Updates</div>
<p class="doc-paragraph">Policies are subject to change by the WR Board of Directors. Employees/Contractors will be notified of any updates in writing or via email. It is the responsibility of each employee/contractor to remain informed of any policy changes.</p>

<div class="doc-section-heading">2. Employment Policies</div>

<div class="doc-sub-heading">A. Illinois Work at Will Policy</div>
<p class="doc-paragraph">In accordance with Illinois state law, employment with WR is considered "at-will." This means that either the employee or the organization may terminate employment at any time, with or without cause or notice, if it does not violate any applicable laws or contractual agreements.</p>

<div class="doc-sub-heading">B. Equal Employment Opportunity and Anti-Harassment</div>
<p class="doc-paragraph">WR prohibits discrimination and harassment based on race, gender, religion, disability, or any other protected status. Employees must treat each other with respect and professionalism. Complaints should be reported to the Executive Director or Human Resource representatives.</p>

<div class="doc-sub-heading">C. Reasonable Accommodation</div>
<p class="doc-paragraph">WR provides reasonable accommodations for employees with disabilities. Requests should be submitted to management in writing, and accommodations will be determined based on business needs and compliance with the Americans with Disabilities Act (ADA).</p>

<div class="doc-sub-heading">D. Drug-Free Workplace</div>
<p class="doc-paragraph">The use of illegal drugs, alcohol, or being under the influence while working is strictly prohibited. Violations may result in disciplinary action, including termination.</p>

<div class="doc-sub-heading">E. Weapon-Free Workplace</div>
<p class="doc-paragraph">No weapons or firearms are permitted to be carried during work hours or on WR work sites at any time. Violations may result in disciplinary action, including termination. No weapons or firearms are permitted on WR premises.</p>

<div class="doc-sub-heading">F. Workplace Conduct</div>
<p class="doc-paragraph">Employees are expected to act professionally, ethically, and with integrity. Inappropriate behavior, including harassment or misconduct, will not be tolerated and may result in disciplinary action or termination.</p>
<p class="doc-paragraph">Employees are also expected to represent the organization appropriately and in the best light. If unsure about whether representation of the organization in certain spaces or environments would be a conflict of interest, please check with the Executive Director before engaging.</p>

<div class="doc-sub-heading">G. Political Activity</div>
<p class="doc-paragraph">As a 501(c)(3) nonprofit organization, WR prohibits employees from engaging in political campaigning during work hours or using company resources for political purposes.</p>

<div class="doc-sub-heading">H. Special Populations</div>
<p class="doc-paragraph">WESTSIDE RISING does not discriminate in its hiring practices. We welcome populations from all backgrounds. Justice-impacted individuals are required to provide a written statement explaining the situation and outlining their intentions and goals as an employee of WESTSIDE RISING.</p>

<div class="doc-section-heading">3. Work Protocols</div>

<div class="doc-sub-heading">A. Attendance &amp; Punctuality</div>
<ul class="doc-list">
    <li>Employees must sign in at the start and end of their shift. Employees are prohibited from signing in or out for another worker.</li>
    <li>Provide 24-hour notice for absences whenever possible.</li>
    <li>Provide a 4-hour notice for late arrivals to work whenever possible.</li>
    <li>Absence without documented notice can result in immediate termination.</li>
</ul>

<div class="doc-sub-heading">B. Work Hours and Breaks</div>
<ul class="doc-list">
    <li>WR primarily operates during business hours (9:00 AM to 5:00 PM), Monday to Friday. Additionally, WR operates evenings and weekends as needed.</li>
    <li>Employees working 4+ hours receive a 15-minute break.</li>
    <li>Full-time employees receive a 1-hour lunch break.</li>
</ul>

<div class="doc-sub-heading">C. Intellectual Property</div>
<ul class="doc-list">
    <li>All documents and information created, collected, and generated on behalf of Westside Rising is the organization's intellectual property.</li>
    <li>All contacts acquired during this role is also categorized as sensitive information protected for Westside Rising's use only and may not be transferred or distributed for any other purposes without expressed written consent from individuals and Westside Rising.</li>
    <li>Misuse or redistribution of this and any other organizational information may warrant legal actions.</li>
</ul>

<div class="doc-sub-heading">D. Uniform and Identification</div>
<ul class="doc-list">
    <li>WR employees and team members must wear appropriate work attire.</li>
    <li>Uniforms are required for outreach efforts. Team members must wear approved WR T-shirt, vest, and name tags etc.</li>
    <li>Outreach uniforms are returned each day. A $50 fine will be assessed for lost or misplaced vests/materials.</li>
    <li>WR merch may be worn outside of work hours and or as a non-employee.</li>
    <li>Wearing WR merch as a non-employee or volunteer is encouraged, however representing WR without consent is prohibited and may result in legal action.</li>
</ul>

<div class="doc-sub-heading">E. Safety and Security</div>
<ul class="doc-list">
    <li>Report any security concerns to supervisors.</li>
</ul>

<div class="doc-section-heading">4. Compensation and Benefits</div>

<div class="doc-sub-heading">A. Paid Holidays</div>
<p class="doc-paragraph">WR recognizes the following paid holidays, in alignment with common public and private sector standards:</p>
<ul class="doc-list">
    <li>New Year's Day (January 1)</li>
    <li>Martin Luther King Jr. Day (Third Monday in January)</li>
    <li>Presidents' Day (Third Monday in February)</li>
    <li>Memorial Day (Last Monday in May)</li>
    <li>Juneteenth National Independence Day (June 19)</li>
    <li>Independence Day (July 4)</li>
    <li>Labor Day (First Monday in September)</li>
    <li>Veterans Day (November 11)</li>
    <li>Thanksgiving Day (Fourth Thursday in November)</li>
    <li>Day after Thanksgiving</li>
    <li>Christmas Eve (December 24)</li>
    <li>Christmas Day (December 25)</li>
</ul>
<p class="doc-paragraph">If a recognized holiday falls on a weekend, WR may observe the holiday on the closest weekday. Employees required to work on a holiday may be eligible for additional pay or a substitute day off, subject to approval.</p>

<div class="doc-sub-heading">B. Employment Classification</div>
<ul class="doc-list">
    <li>Full-time (32-40 hours/week).</li>
    <li>Part-time (less than 32 hours/week) with prorated benefits, as agreed upon hiring.</li>
    <li>Temporary employees are ineligible for benefits.</li>
</ul>

<div class="doc-sub-heading">C. Pay Periods &amp; Overtime</div>
<ul class="doc-list">
    <li>Employees are paid bi-weekly. The pay schedule may change with notice.</li>
    <li>Overtime (1.5x hourly wage) requires prior approval.</li>
</ul>

<div class="doc-sub-heading">D. Leave Policies</div>
<ul class="doc-list">
    <li><strong>Vacation:</strong>
        <ul class="doc-sub-list">
            <li>Employees with 6-11 months of service receive 5 days.</li>
            <li>Employees with 1-2 years receive 14 days.</li>
            <li>Employees with 3+ years receive 20 days.</li>
            <li>A maximum of 5 unused vacation days may be carried over into the next calendar year.</li>
        </ul>
    </li>
    <li><strong>Sick Leave:</strong> Employees accrue 1 sick day per month, which may be used for personal illness or to care for an immediate family member.</li>
    <li><strong>Personal Days:</strong> 4 per year, subject to approval.</li>
    <li><strong>Medical Leave:</strong> Up to 4 weeks unpaid, per the Family and Medical Leave Act (FMLA), with continued health insurance coverage.</li>
    <li><strong>Jury Duty:</strong> Up to 1 day of paid leave.</li>
    <li><strong>Funeral Leave:</strong> 2 days of paid leave for immediate family members.</li>
    <li><strong>Voting Leave:</strong> 2 hours of paid time if needed.</li>
</ul>

<div class="doc-section-heading">5. Technology &amp; Data Security</div>

<div class="doc-sub-heading">A. Equipment Usage</div>
<ul class="doc-list">
    <li>Company devices are for work purposes only.</li>
    <li>Employees must store devices securely.</li>
    <li>Only approved software can be installed on WR devices.</li>
    <li>Employees that lose or damage equipment will be fined the cost of the value of the equipment.</li>
</ul>

<div class="doc-sub-heading">B. Internet &amp; Email Usage</div>
<ul class="doc-list">
    <li>Work email should be used for professional communication only.</li>
    <li>WR email accounts should not be used for personal purposes.</li>
    <li>Misrepresentation of WR while using WR email accounts is prohibited.</li>
    <li>WR reserves the right to monitor internet and email activity.</li>
</ul>

<div class="doc-sub-heading">C. Use of AI (Artificial Intelligence)</div>
<ul class="doc-list">
    <li>AI tools make full use of the internet. Use of AI for general information is acceptable. Approval is needed to upload or use sensitive organizational information to generate information or content due to the high level of exposure.</li>
</ul>

<div class="doc-sub-heading">D. Password Security</div>
<ul class="doc-list">
    <li>Passwords must be at least 8 characters, include uppercase/lowercase letters, numbers, and symbols.</li>
    <li>It is recommended to change passwords every 60 days.</li>
    <li>Multi-factor authentication (MFA) should be enabled where applicable.</li>
</ul>

<div class="doc-sub-heading">E. Reporting Security Incidents</div>
<ul class="doc-list">
    <li>Employees must report any incidents or suspicious activity immediately.</li>
    <li>Employees should complete incident reports when necessary.</li>
    <li>Violations may result in disciplinary action or termination.</li>
</ul>

<div class="doc-sub-heading">F. Lost, Stolen, or Damaged Equipment</div>
<ul class="doc-list">
    <li>Employees must report incidents immediately.</li>
    <li>A $200 replacement fee applies unless waived by WR leadership.</li>
</ul>

<div class="doc-section-heading">6. Confidentiality and non-disclosure</div>

<div class="doc-sub-heading">A. Confidential Information</div>
<p class="doc-paragraph">Confidential information includes, but is not limited to:</p>
<ul class="doc-list">
    <li>Employee records</li>
    <li>Donor and financial information</li>
    <li>Organizational strategies and business plans</li>
    <li>Proprietary technology and software</li>
</ul>

<div class="doc-sub-heading">B. Non-Disclosure Agreement</div>
<ul class="doc-list">
    <li>Employees must sign a Non-Disclosure Agreement (NDA) upon hiring.</li>
    <li>Confidential materials must not be shared outside the organization without written authorization.</li>
    <li>All confidential information must be returned or securely destroyed upon termination.</li>
</ul>

<div class="doc-sub-heading">C. Data Protection</div>
<ul class="doc-list">
    <li>Employees must not store sensitive information on personal devices.</li>
    <li>Confidential data should be encrypted where applicable.</li>
    <li>Secure disposal methods must be used for physical and digital records.</li>
</ul>

<div class="doc-sub-heading">D. Violations and Consequences</div>
<ul class="doc-list">
    <li>Unauthorized disclosure of confidential information may result in immediate termination and legal action.</li>
    <li>Employees should report any suspected breaches to their supervisor or the Executive Director.</li>
</ul>

<div class="doc-section-heading">7. Compliance and Enforcement</div>

<div class="doc-sub-heading">A. Reporting Violations</div>
<ul class="doc-list">
    <li>Employees should report violations to their supervisor or HR department.</li>
    <li>Anonymous reporting options may be available.</li>
    <li>Investigations will be conducted fairly, confidentially, and in accordance with applicable laws.</li>
</ul>

<div class="doc-sub-heading">B. Disciplinary Action</div>
<ul class="doc-list">
    <li>WR's disciplinary process:
        <ul class="doc-sub-list">
            <li>Verbal warning with suggested corrective actions</li>
            <li>Written warning with suggested written corrective actions</li>
            <li>Suspension when appropriate</li>
            <li>Termination</li>
        </ul>
    </li>
    <li>Some offenses, such as harassment, fraud, security violations, insubordination, excessive absenteeism, and other infractions may result in immediate termination.</li>
    <li>During probation disciplinary actions may result in termination.</li>
</ul>

<div class="doc-sub-heading">C. Grievances</div>
<ul class="doc-list">
    <li>Grievance process:
        <ul class="doc-sub-list">
            <li>Addressed by verbal communication with the appropriate supervisor.</li>
            <li>If the grievance is not resolved, follow-up with verbal and written communication to the appropriate supervisor.</li>
            <li>If then there's no resolution, the grievance may be presented to Human Resources.</li>
            <li>The grievance will be addressed accordingly.</li>
        </ul>
    </li>
</ul>

<div class="doc-sub-heading">D. Separation from WESTSIDE RISING</div>
<p class="doc-paragraph">In the case of termination or separation from WR, all equipment, supplies, and confidential documentation must be returned to WR. Also, the release documentation and process should be completed within 3-7 business days.</p>

<div class="doc-sub-heading">D. Policy Acknowledgment</div>
<p class="doc-paragraph">Employees must sign an acknowledgment form confirming their understanding of these policies. Failure to comply with these policies may lead to disciplinary action, up to and including termination.</p>

<p class="doc-paragraph" style="margin-top:1.5rem;">If you have additional questions, contact WESTSIDE RISING's administrators at WR.info@westsiderising.org or call 773.417.6605.</p>

<div style="margin-top:2rem;padding:1.25rem;border:1px solid #ddd;border-radius:8px;background:#f9f9f9;">
    <p style="margin:0 0 0.75rem;"><strong>I have received and read WESTSIDE RISING's Policies &amp; Procedures Guide</strong></p>
    <p style="margin:0 0 0.5rem;"># ${field('pp_number', saved, staffEdit, 'Document #')}</p>
    <p style="margin:0 0 0.5rem;">Name: ${field('pp_name', saved, staffEdit, 'Full name', 'doc-field-wide')}</p>
    <p style="margin:0 0 0.5rem;">Date: ${field('pp_date', saved, staffEdit, 'Date')}</p>
    <p style="margin:0 0 0.5rem;">Supervisor: ${field('pp_supervisor', saved, staffEdit, 'Supervisor name', 'doc-field-wide')}</p>
</div>
`;
}

function buildNDADoc(saved, adminEdit, staffEdit, locked) {
    const canEdit = adminEdit || staffEdit;
    return `
<div class="doc-title">NON-DISCLOSURE AGREEMENT</div>

<p class="doc-paragraph">This Non-Disclosure Agreement ("NDA") is made effective immediately as of ${field('nda_date', saved, adminEdit, 'Date')}, by and between WESTSIDE RISING ("WR"), an Illinois not-for profit corporation, and ${field('nda_employee_name', saved, staffEdit, 'Employee/Contractor full name', 'doc-field-wide')} ("The EMPLOYEE/CONTRACTOR").</p>

<p class="doc-paragraph">The Parties agree that the employment relationship between WESTSIDE RISING and ${field('nda_emp2', saved, staffEdit, 'Employee/Contractor name', 'doc-field-wide')} begins on ${field('nda_start_date', saved, adminEdit, 'Start date')}, between the EMPLOYEE/CONTRACTOR and WR, and that this NDA shall be incorporated into the Agreement and be binding on the parties. Therefore, the parties agree as follows:</p>

<p class="doc-paragraph"><strong>1. OWNER DEFINED.</strong> The term owner is defined as WESTSIDE RISING, an Illinois Not-For Profit Corporation.</p>

<p class="doc-paragraph"><strong>2. CONFIDENTIAL INFORMATION.</strong> The term "Confidential Information" means any information or material or data which is proprietary to the Owner, whether owned or developed by the Owner, which is not generally known other than by the Owner, and which The EMPLOYEE/CONTRACTOR may obtain through any direct or indirect contact with the Owner. Owner has made reasonable efforts to label or provide notice of which information is confidential or proprietary. Regardless of whether specifically identified as confidential or proprietary, Confidential Information shall include any information provided by the Owner concerning the business, membership, data, technology and information of the Owner and any third party with which the Owner deals, including, without limitation, software data, trade secrets, technical data, product ideas, sales leads, customer and client lists. The nature of the information and the manner of disclosure are such that a reasonable person would understand it to be confidential and would not be easily learned from third party sources.</p>

<p class="doc-paragraph"><strong>3. PROTECTION OF CONFIDENTIAL INFORMATION.</strong> The EMPLOYEE/CONTRACTOR understands and acknowledges that the Confidential Information has been developed or obtained by the Owner by the investment of significant time, effort and expense, and that the Confidential Information is a valuable, special and unique asset of the Owner which provides the Owner with a significant competitive advantage and needs to be protected from improper disclosure. In consideration of this, The EMPLOYEE/CONTRACTOR agrees to the following:</p>

<p class="doc-paragraph"><strong>A. No Disclosure.</strong> The EMPLOYEE/CONTRACTOR will hold the Confidential Information in confidence and will not disclose the Confidential Information to any person or entity without the prior written consent of the Owner, except when required by applicable laws.</p>

<p class="doc-paragraph"><strong>B. No Copyright Infringement.</strong> The EMPLOYEE/CONTRACTOR will not reproduce, copy, modify, distribute, display or sell (electronically, digitally, or by any other means) any Confidential Information without the prior written consent of the Owner.</p>

<p class="doc-paragraph"><strong>C. Unauthorized Use.</strong> The EMPLOYEE/CONTRACTOR shall promptly advise the Owner if he becomes aware of any possible unauthorized disclosure or use of the Confidential Information.</p>

<p class="doc-paragraph"><strong>D. Application to Advisor/Entity.</strong> The EMPLOYEE/CONTRACTOR shall not disclose any Confidential Information to any person outside of WESTSIDE RISING except when required by applicable laws.</p>

<p class="doc-paragraph"><strong>4. UNAUTHORIZED DISCLOSURE OF INFORMATION – INJUNCTION.</strong> If it appears that The EMPLOYEE/CONTRACTOR has disclosed (or has threatened to disclose) Confidential Information in violation of this NDA, the Owner shall be entitled to an injunction to restrain The EMPLOYEE/CONTRACTOR from disclosing the Confidential Information in whole or in part. The Owner shall not be prohibited by this provision from pursuing other remedies, including a claim for losses and damages.</p>

<p class="doc-paragraph"><strong>5. RETURN OF CONFIDENTIAL INFORMATION.</strong> The EMPLOYEE/CONTRACTOR shall return to the extent reasonably possible all information, including written materials (electronically, digitally, or by any other means) containing the Confidential Information on the day of termination. The EMPLOYEE/CONTRACTOR shall also deliver to the Owner written statements signed by him certifying that all materials have been returned within ten (10) days of receipt of the request.</p>

<p class="doc-paragraph"><strong>6. INDEMNITY.</strong> Each party agrees to defend, indemnify, and hold harmless the other party and its officers, directors, agents, affiliates, distributors, representatives, and EMPLOYEE/CONTRACTORs from all third party claims, demands, liabilities, costs and expenses, including reasonable attorney's fees, costs and expenses resulting from the indemnifying party's material breach or reckless negligence of the duty, representation, or warranty under this NDA.</p>

<p class="doc-paragraph"><strong>7. ATTORNEY'S FEES.</strong> In any legal action between the parties concerning this NDA, WESTSIDE RISING shall be entitled to recover reasonable attorney's fees and costs.</p>

<p class="doc-paragraph"><strong>8. GENERAL PROVISIONS.</strong> This NDA sets forth the entire understanding of the parties regarding confidentiality. The obligations of confidentiality shall survive indefinitely with regards to any trade secrets disclosed and for a term of five years for non-trade secret information from the date of disclosure of the Confidential Information. Any amendments must be in writing and signed by both parties. This NDA shall be construed under the laws of the State of Illinois. This NDA shall not be assignable by either party. Neither party may delegate its duties under this NDA without the prior written consent of the other party. The confidentiality provisions of this NDA shall remain in full force and effect at all times after the effective date of this NDA. If any provision of this NDA is held to be invalid, illegal or unenforceable, the remaining portions of this NDA shall remain in full force and effect and construed so as to best effectuate the original intent and purpose of this Agreement.</p>

<p class="doc-paragraph"><strong>9. SIGNATORIES.</strong> This NDA shall be executed by and delivered in the manner prescribed by law as of the date first written above.</p>
`;
}

function buildEquipDoc(saved, adminEdit, staffEdit, locked) {
    const canEdit = adminEdit || staffEdit;
    return `
<div class="doc-title">ACCEPTANCE &amp; USE OF EQUIPMENT AGREEMENT</div>

<ol class="doc-list" style="list-style-type:decimal;">
    <li style="margin-bottom:1rem;">
        ${field('equip_employee_name', saved, staffEdit, 'Employee/Contractor name', 'doc-field-wide')} The EMPLOYEE/CONTRACTOR represents and acknowledges that during his/her employment is loaned a Equipment/Laptop computer by WESTSIDE RISING ("WR") and is signing this Equipment/Laptop Acceptance Form.
    </li>
    <li style="margin-bottom:1rem;">
        In any case of separation from WR, The EMPLOYEE/CONTRACTOR will return the Equipment/Laptop within three (3) days of the Separation Date to WESTSIDE RISING all property of WESTSIDE RISING in his/her possession or under his control, including but not limited to files, Equipment/Laptop computer, all related software, data collected from canvassers, office keys and storage unit keys.
    </li>
    <li style="margin-bottom:1rem;">
        The EMPLOYEE/CONTRACTOR further represents that he/she will not keep any WESTSIDE RISING property including hard copy or electronically stored documents, computer disks, written policies or procedures or other documents pertaining to WESTSIDE RISING, and that he will not give/share these or similar items to any third party.
    </li>
    <li style="margin-bottom:1rem;">
        Per this Equipment/Laptop Acceptance Form, The EMPLOYEE/CONTRACTOR acknowledges personal and financial responsibility for any damage, theft, or loss of the Equipment/Laptop computer and/or related equipment and accessories due to negligence.
    </li>
    <li style="margin-bottom:1rem;">
        Any costs arising from a violation of the Equipment/Laptop Acceptance Form shall be deducted at WESTSIDE RISING's sole discretion from either The EMPLOYEE/CONTRACTOR's unpaid accrued wages &amp; bonuses OR from any Severance Pay; or both.
        <br><br>
        The EMPLOYEE/CONTRACTOR represents that he/she has received the following EQUIPMENT and is in working condition. It is further acknowledged that this EQUIPMENT is to be used ONLY for work related duties for WESTSIDE RISING.
        <br><br>
        THE ABOVE TERMS AND CONDITIONS ARE HEREBY AGREED TO BY THE UNDERSIGNED PARTIES.
    </li>
</ol>
`;
}

function buildSevDoc(saved, adminEdit, staffEdit, locked) {
    return `
<div class="doc-title">SEVERANCE AGREEMENT</div>

<p class="doc-paragraph">This Severance Agreement and Release of All Claims ("Agreement") between the Employee/Contractor and WESTSIDE RISING (WR), including any and all affiliated companies ("WR"), sets forth the agreed upon terms and conditions concerning the severance of the Employee/Contractor with the organization, WESTSIDE RISING.</p>

<ol class="doc-list" style="list-style-type:decimal;">
    <li style="margin-bottom:1rem;">
        <strong><u>Termination of Employment.</u></strong><br>
        By entering into this Agreement, hereby agrees and understands that employment with WR ends and is effective on the separation date.
    </li>
    <li style="margin-bottom:1rem;">
        <strong><u>Severance Pay and Final Compensation.</u></strong> Severance pay is determined on a case-by-case basis.<br>
        WR shall provide final pay compensation at the agreed upon pay rate based on the hours worked. Final payments are provided on the regular pay schedule.
    </li>
    <li style="margin-bottom:1.5rem;">
        <strong><u>Release and Discharge of Claims.</u></strong> In consideration for the premises and covenants contained herein, the Employee/Contractor irrevocably and unconditionally releases and discharges WESTSIDE RISING and all affiliated and related entities, and their respective directors, agents, officers, shareholders, employees, subsidiaries, predecessors, successors and assigns, from any and all claims, liabilities, obligations, promises, causes of actions, actions, suits, or demands, of whatsoever kind or character, known or unknown, suspected to exist or not suspected to exist, anticipated or not anticipated, arising from or related or attributable to the Employee/Contractor employment with WESTSIDE RISING, her separation from such employment ("Claims"). Such Claims include, but are not limited to, claims based upon any violation of WESTSIDE RISING's policies and regulations or any written or oral contract or agreement between WESTSIDE RISING and the Employee/Contractor, claims based upon employment discrimination or harassment of any kind or nature, and claims based upon alleged violation of Title VII of the Civil Rights Act of 1964 as Amended, 42 U.S. Code section 1983, the United States or Illinois Constitutions, the Americans With Disabilities Act, Federal or State wage and hour laws or any other State of Federal statutes or laws. Ms. Employee/Contractor further acknowledges that such Claims also include claims based on the Age Discrimination in Employment Act and the Older Workers' Benefit Protection Act. The Employee/Contractor further covenants and agrees not to sue WESTSIDE RISING and all affiliated and related entities, and their respective agents, officers, shareholders, employees, subsidiaries, predecessors, successors and assigns, in connection with any of the above-mentioned Claims.
    </li>
    <li style="margin-bottom:1rem;">
        <strong><u>General Release.</u></strong> Ms. Employee/Contractor understands that this Agreement extends to all claims of every nature and kind, known or unknown, suspected or unsuspected, past, present, or future, arising from or attributable to the above-referenced matters and disputes. It is the Employee/Contractor's intention to release all such claims.
    </li>
    <li style="margin-bottom:1rem;">
        <strong><u>No Admission of Liability.</u></strong> The parties understand, acknowledge and agree that this is a voluntary agreement, and that the furnishing of consideration for this Agreement shall not be deemed or construed at any time or for any purpose as an admission of liability by either party, each party expressly denying liability for any and all claims.
    </li>
    <li style="margin-bottom:1rem;">
        <strong><u>No Cooperation.</u></strong> The Employee/Contractor agrees that they will not act in any manner that might damage the business of WESTSIDE RISING. Ms. Employee/Contractor agrees that she will not counsel or assist any attorneys or their clients in the presentation or prosecution of any disputes, differences, grievances, claims, charges, or complaints by any third party against WESTSIDE RISING and/or any officer, director, employee, agent, representative, stockholder or attorney of WESTSIDE RISING, unless under a subpoena or other court order to do so.
    </li>
    <li style="margin-bottom:1rem;">
        <strong><u>Non Disparagement.</u></strong> Both parties mutually agree that neither they nor Associates will, directly or indirectly, in any capacity or manner, make, express, transmit speak, write, verbalize or otherwise communicate in any way (or cause, further, assist, solicit, encourage, support or participate in any of the foregoing), any remark, comment, message, information, declaration, communication or other statement of any kind, whether verbal, in writing, electronically transferred or otherwise, that might reasonably be construed to be derogatory or critical of, or negative toward WESTSIDE RISING, its officers and/or its employees, or the Employee/Contractor. Nor will either party engage in actions that reveal, discloses, incorporates, is based upon, discusses, includes or otherwise involves any confidential or proprietary information of WESTSIDE RISING or its subsidiaries or Affiliates, or to malign, harm, disparage, defame or damage the reputation or good name of WESTSIDE RISING or any of its officers or employees, or the Employee/Contractor.
    </li>
    <li style="margin-bottom:1rem;">
        <strong><u>Counterparts.</u></strong> This Agreement may be executed in any number of counterparts, each of which shall be deemed an original, but all of which together shall constitute one and the same instrument.
    </li>
    <li style="margin-bottom:1rem;">
        <strong><u>General Interpretation.</u></strong> The terms of this Agreement have been prepared by the parties to this Agreement and the language used in this Agreement shall be deemed to be the language chosen by the parties to express their mutual intent. This Agreement shall be construed without regard to any presumption or rule requiring construction against the party causing such instrument or any portion thereof to be drafted, or in favor of the party receiving a particular benefit under this Agreement. If any term, provision, covenant or condition of this Agreement shall be or become illegal, null, void or against public policy, or shall be held by any court of competent jurisdiction to be illegal, null or void or against public policy, the remaining provisions of this Agreement shall remain in full force and effect and shall not be affected, impaired or invalidated thereby.
    </li>
    <li style="margin-bottom:1rem;">
        <strong><u>Addendums Incorporated by Reference.</u></strong> The Parties acknowledge that this Agreement shall incorporate and include by reference the Non-Disclosure Agreement, signed by Ms. Employee/Contractor during the onboarding process.
    </li>
    <li style="margin-bottom:1rem;">
        <strong><u>Governing Law.</u></strong> This Agreement will be governed by the laws of the State of Illinois (with the exception of any Conflict of Law provisions).
    </li>
</ol>

<p class="doc-paragraph"><strong>THE ABOVE TERMS AND CONDITIONS ARE HEREBY AGREED TO BY THE UNDERSIGNED PARTIES.</strong></p>
`;
}

function buildCOIDoc(saved, adminEdit, staffEdit, locked) {
    const canEdit = adminEdit || staffEdit;
    return `
<div class="doc-title">CONFLICT OF INTEREST AND NON-COMPETE AGREEMENT</div>

<p class="doc-paragraph"><strong>This Conflict of Interest and Non-Compete Agreement</strong> ("Agreement") is entered into as of ${field('coi_date', saved, adminEdit, 'Date')} (date), between <strong>WESTSIDE RISING</strong> ("Organization"), located at 5100 W. Harrison, Chicago, IL, and ${field('coi_employee_name', saved, staffEdit, 'Employee/Contractor name', 'doc-field-wide')} ("Employee/Contractor").</p>

<div class="doc-section-heading">1. PURPOSE AND SCOPE</div>
<p class="doc-paragraph">This Agreement is designed to protect the Organization's interests, maintain the integrity of its operations, and ensure that the Employee/Contractor performs their duties with undivided loyalty and without competing interests.</p>
<p class="doc-paragraph">The Employee/Contractor acknowledges that this Agreement reflects industry best practices and is reasonable in scope and duration.</p>

<div class="doc-section-heading">2. CONFLICT OF INTEREST PROHIBITIONS</div>
<p class="doc-paragraph">The Employee/Contractor agrees that during the term of this contract and for the duration specified herein, they shall not engage in any of the following activities without prior written consent from the Executive Director.</p>

<div class="doc-sub-heading">2.1 Competing Business Activities</div>
<ul class="doc-list">
    <li>Provide services, consulting, or employment to any organization, business, or entity that competes directly or indirectly with the Organization's mission, programs, or services.</li>
    <li>Develop, create, or support competing programs or initiatives that serve the Same target population (youth ages 18 -24) or geographic area.</li>
    <li>Solicit or accept clients, participants, or partners that the Organization currently serves or has identified as potential partners.</li>
    <li>Establish or work with alternative community organizing platforms or civic engagement initiatives that would divert resources, attention, or relationships from the Organization.</li>
</ul>

<div class="doc-sub-heading">2.2 Outside Employment and Board Positions</div>
<ul class="doc-list">
    <li><strong>Accept employment or consulting positions</strong> with organizations whose Interest materially conflict with the Organization's work, mission, or strategic goals.</li>
    <li><strong>Serve on the boards of directors or advisory committees</strong> of competing organizations without prior written approval.</li>
    <li><strong>Hold leadership positions in organizations</strong> that directly compete for the same funding sources, grants, or donor relationships.</li>
</ul>

<div class="doc-sub-heading">2.3 Financial Conflicts</div>
<ul class="doc-list">
    <li><strong>Accept gifts, payments, loans, or financial benefits</strong> from vendors, Employee/Contractors, or service providers doing business with the Organization, except as permitted by Organization policy.</li>
    <li><strong>Engage in financial transactions or investments</strong> that create a personal interest in decisions the Employee/Contractor makes on behalf of the Organization.</li>
    <li><strong>Participate in procurement decisions, vendor selection, or contract negotiations</strong> involving organizations or individuals from whom the Employee/Contractor receives personal financial benefit.</li>
</ul>

<div class="doc-sub-heading">2.4 Vendor and Partner Relationships</div>
<ul class="doc-list">
    <li><strong>Recommend or influence the selection of vendors, consultants, or partners</strong> in which the Employee/Contractor has a direct or indirect financial interest.</li>
    <li><strong>Accept commissions, referral fees, or revenue-sharing arrangements</strong> from vendors or service providers used by the Organization.</li>
    <li><strong>Maintain undisclosed business relationships</strong> with organizations that supply goods or services to the Organization.</li>
</ul>

<div class="doc-sub-heading">2.5 Use of Organization Resources and Information</div>
<ul class="doc-list">
    <li><strong>Use Organization time, equipment, funds, or facilities</strong> for personal business ventures or competing activities.</li>
    <li><strong>Utilize the Organization's network, donor relationships, or community connections</strong> to develop or promote competing initiatives.</li>
    <li><strong>Leverage contacts made through Organization work</strong> to solicit business or support for competing entities without prior disclosure and approval.</li>
</ul>

<div class="doc-sub-heading">2.6 Multiple Roles and Divided Loyalty</div>
<ul class="doc-list">
    <li><strong>Maintain employment or significant consulting arrangements</strong> with other organizations that could impair judgment or divide loyalty to the Organization.</li>
    <li><strong>Represent conflicting interests</strong> in matters where the Organization and another entity have opposing goals or objectives.</li>
</ul>

<div class="doc-section-heading">3. NON-COMPETE CLAUSE</div>
<div class="doc-sub-heading">3.1 Duration and Scope</div>
<p class="doc-paragraph">The Employee/Contractor agrees that, following the termination or conclusion of this contract, they shall not:</p>
<ul class="doc-list">
    <li><strong>Solicit, recruit, or encourage participation</strong> of individuals who were engaged or recruited by the Organization for its programs during the Employee/Contractor's tenure.</li>
    <li><strong>Use or disclose proprietary program curricula, methods, strategies, or frameworks</strong> developed or utilized by the Organization to benefit competing entities.</li>
    <li><strong>Establish or support alternative programs</strong> that directly replicate or substantially copy the Organization's summer leadership development program or similar initiatives.</li>
</ul>

<div class="doc-section-heading">4. CONFIDENTIALITY AND PROTECTION OF PROPRIETARY INFORMATION</div>
<div class="doc-sub-heading">4.1 Definition of Confidential Information</div>
<p class="doc-paragraph"><strong>Confidential Information</strong> includes, but is not limited to:</p>
<ul class="doc-list">
    <li>Strategic plans, fundraising strategies, and budget information</li>
    <li>Donor and funder lists, giving histories, and relationship data</li>
    <li>Program curricula, training materials, and operational procedures</li>
    <li>Participant and community member contact information and personal data</li>
    <li>Evaluation results, metrics, and program outcome data</li>
    <li>Board meeting minutes, internal communications, and strategic discussions</li>
    <li>Partnership agreements, MOUs, and organizational relationships</li>
    <li>Technology systems, databases, and operational tools</li>
    <li>Any other information marked as confidential or understood to be proprietary</li>
</ul>

<div class="doc-sub-heading">4.2 Obligations During Employment/Contract</div>
<p class="doc-paragraph">During the term of this employment/contract, the Employee/Contractor agrees to:</p>
<ul class="doc-list">
    <li><strong>Protect all Confidential Information</strong> using the same degree of care used to protect their own confidential information, but no less than reasonable care.</li>
    <li><strong>Restrict access</strong> to Confidential Information to those with a legitimate need-to-know.</li>
    <li><strong>Not disclose Confidential Information</strong> to any third party, including family members, friends, or employees of other organizations, without prior written authorization.</li>
    <li><strong>Utilize Confidential Information solely</strong> for the purposes of performing contracted duties.</li>
    <li><strong>Maintain secure practices</strong> when handling, storing, and transmitting sensitive information.</li>
    <li><strong>Report any unauthorized access, disclosure, or loss</strong> of Confidential information immediately to the Executive Director.</li>
</ul>

<div class="doc-sub-heading">4.3 Obligations After Termination</div>
<p class="doc-paragraph">Upon termination or conclusion of this employment/contract, the Employee/Contractor agrees to:</p>
<ul class="doc-list">
    <li><strong>Return all Confidential Information</strong> in any form (physical documents, electronic files, notes, recordings, etc.) within <strong>five (5) business days</strong>.</li>
    <li><strong>Certify in writing</strong> that all Confidential Information has been returned or destroyed.</li>
    <li><strong>Continue to maintain confidentiality</strong> of all Confidential Information for a period of <strong>three (3) years</strong> following termination.</li>
    <li><strong>Refrain from using or disclosing</strong> Confidential Information for any personal, professional, or competitive purpose.</li>
    <li><strong>Cooperate with the Organization</strong> in preventing unauthorized disclosure by former colleagues or third parties.</li>
</ul>

<div class="doc-sub-heading">4.4 Exceptions to Confidentiality</div>
<p class="doc-paragraph">Confidential Information does not include information that:</p>
<ul class="doc-list">
    <li>Is publicly available through no breach of this Agreement</li>
    <li>Was known to the Employee/Contractor prior to engagement, as evidenced by written documentation</li>
    <li>Is independently developed by the Employee/Contractor without use of Organization information</li>
    <li>Is required to be disclosed by law, court order, or government agency, provided the Employee/Contractor gives the Organization prompt written notice to allow for protective measures</li>
</ul>

<div class="doc-section-heading">5. PROTECTION OF RELATIONSHIPS AND CONTACTS</div>
<div class="doc-sub-heading">5.1 Relationship Ownership</div>
<p class="doc-paragraph">The Employee/Contractor acknowledges that all relationships, connections, and contacts established or developed while working for the Organization belong to the Organization, including:</p>
<ul class="doc-list">
    <li><strong>Community leaders and residents</strong> in West Side communities</li>
    <li><strong>Government officials and policy advocates</strong> at federal, state, and local level</li>
    <li><strong>Foundation officers, donors, and funding partners</strong></li>
    <li><strong>Volunteer coordinators and volunteer participants</strong></li>
    <li><strong>Program participants and alumni</strong></li>
    <li><strong>Academic and research partners</strong></li>
    <li><strong>Media contacts and communications partners</strong></li>
</ul>

<div class="doc-sub-heading">5.2 Restrictions on Relationship Leverage</div>
<p class="doc-paragraph">The Employee/Contractor agrees not to:</p>
<ul class="doc-list">
    <li><strong>Solicit or encourage the participation</strong> of Organization participants, donors, or partners in competing initiatives without Organization consent.</li>
    <li><strong>Use contact information or relationship data</strong> obtained through Organization work for personal gain or to benefit competing entities.</li>
    <li><strong>Misrepresent prior work or relationships</strong> with the Organization in communications with former contacts.</li>
    <li><strong>Disparage the Organization</strong> in communications with community members, donors, or partners, which could damage relationships or reputation.</li>
</ul>

<div class="doc-sub-heading">5.3 Contact List and Database Access</div>
<p class="doc-paragraph">All contact lists, databases, participant information, donor records, and relationship documentation remain the exclusive property of the Organization.</p>
<p class="doc-paragraph">The Employee/Contractor may not:</p>
<ul class="doc-list">
    <li>Copy, download, or export contact information</li>
    <li>Retain personal copies of contact lists or relationship data</li>
    <li>Provide contact information to any unauthorized third party</li>
    <li>Use database information for any purpose beyond contracted work</li>
</ul>

<div class="doc-section-heading">6. INTELLECTUAL PROPERTY AND WORK PRODUCT</div>
<div class="doc-sub-heading">6.1 Work Product Ownership</div>
<p class="doc-paragraph">All work products, materials, documents, strategies, and creations developed by the Employee/Contractor during the contract period, including but not limited to:</p>
<ul class="doc-list">
    <li>Reports, analyses, and written materials</li>
    <li>Program designs and curricula</li>
    <li>Marketing and communications materials</li>
    <li>Data compilations and research findings</li>
    <li>Strategic recommendations and planning documents…</li>
</ul>
<p class="doc-paragraph">shall be the exclusive property of the Organization and may be used, modified, reproduced, and distributed by the Organization without compensation or approval from the Employee/Contractor.</p>

<div class="doc-sub-heading">6.2 Prior Work</div>
<p class="doc-paragraph">The Employee/Contractor retains ownership of work and materials created prior to this agreement, provided they do not utilize Organization resources, information, or relationships in their creation.</p>

<div class="doc-section-heading">7. DATA PROTECTION AND PRIVACY COMPLIANCE</div>
<div class="doc-sub-heading">7.1 Regulatory Compliance</div>
<p class="doc-paragraph">The Employee agrees to comply with all applicable data protection and privacy laws, including but not limited to the <strong>Illinois Personal Information Protection Act (PIPA)</strong>, <strong>Family Educational Rights and Privacy Act (FERPA)</strong> (if applicable), and other state and federal privacy regulations.</p>

<div class="doc-sub-heading">7.2 Participant and Community Privacy</div>
<p class="doc-paragraph">The Employee/Contractor shall:</p>
<ul class="doc-list">
    <li><strong>Protect the privacy and confidentiality</strong> of all program participants, community members, and individuals served by the Organization.</li>
    <li><strong>Not disclose personal information</strong> such as names, addresses, contact details, health information, or personal circumstances without proper authorization.</li>
    <li><strong>Comply with all data retention and deletion policies</strong> established by the Organization.</li>
    <li><strong>Report any data breaches or unauthorized access</strong> immediately to the Executive Director.</li>
</ul>

<div class="doc-section-heading">8. PERMITTED DISCLOSURES AND WHISTLEBLOWER PROTECTION</div>
<div class="doc-sub-heading">8.1 Legal and Regulatory Disclosure</div>
<p class="doc-paragraph">Nothing in this Agreement prohibits the Employee/Contractor from:</p>
<ul class="doc-list">
    <li><strong>Disclosing information as required by law</strong> or legal process, provided the Employee/Contractor notifies the Organization in advance to allow for protective measures.</li>
    <li><strong>Reporting illegal conduct or violations</strong> of law to government agencies or law enforcement.</li>
    <li><strong>Participating in investigations</strong> conducted by government agencies or regulatory bodies.</li>
</ul>

<div class="doc-sub-heading">8.2 Whistleblower Protection</div>
<p class="doc-paragraph">The Employee/Contractor disclose Confidential Information when necessary to report suspected violations of law, fraud, abuse, or ethical violations to appropriate government agencies or legal counsel without prior authorization from the Organization.</p>

<div class="doc-section-heading">9. REMEDIES FOR BREACH</div>
<div class="doc-sub-heading">9.1 Acknowledgment of Harm</div>
<p class="doc-paragraph">The Employee/Contractor acknowledges that:</p>
<ul class="doc-list">
    <li>Breach of this Agreement would cause irreparable harm to the Organization that cannot be adequately remedied by monetary damages alone.</li>
    <li>The Organization would be entitled to seek equitable relief, including injunctive relief and or legal actions.</li>
</ul>

<div class="doc-sub-heading">9.2 Available Remedies</div>
<p class="doc-paragraph">In the event of breach, the Organization may pursue:</p>
<ul class="doc-list">
    <li><strong>Injunctive relief</strong> to prevent unauthorized disclosure or competing activities</li>
    <li><strong>Monetary damages</strong> for losses resulting from breach</li>
    <li><strong>Recovery of attorney's fees and costs</strong> incurred in enforcing this Agreement</li>
    <li><strong>Specific performance</strong> requiring the Employee/Contractor to return Confidential Information ceases competing activities</li>
</ul>

<div class="doc-sub-heading">9.3 No Waiver</div>
<p class="doc-paragraph">The Organization's failure to enforce any provision does not constitute a waiver of that provision or the right to enforce it in the future.</p>

<div class="doc-section-heading">10. ACKNOWLEDGMENT OF RECEIPT AND UNDERSTANDING</div>
<p class="doc-paragraph">The Employee/Contractor certifies that:</p>
<ul class="doc-list">
    <li>They have read this entire Agreement and understand its terms and obligations</li>
    <li>They have had the opportunity to ask questions and seek legal counsel</li>
    <li>They understand the consequences of breach, including potential legal action</li>
    <li>They agree to comply with all provisions of this Agreement</li>
    <li>They acknowledge that this Agreement is a condition of their contract with the Organization</li>
</ul>

<div class="doc-section-heading">11. SEVERABILITY</div>
<p class="doc-paragraph">If any provision of this Agreement is found to be unenforceable, the remaining provisions shall continue in full force and effect. The parties agree to negotiate in good faith to replace any unenforceable provision with a similar provision that is enforceable.</p>

<div class="doc-section-heading">12. ENTIRE AGREEMENT</div>
<p class="doc-paragraph">This Agreement, together with the Internship Service Agreement and any other signed agreements, constitutes the entire agreement between the parties regarding conflicts of interest, non-compete obligations, and confidentiality. Any prior understandings or agreements are superseded by this Agreement.</p>

<div class="doc-section-heading">13. ACKNOWLEDGMENT AND SIGNATURE</div>
<p class="doc-paragraph">By signing below, the Employee/Contractor acknowledges receipt of this agreement, confirms understanding of all terms and conditions, and agrees to comply with all provisions during and after the contract period.</p>

<div style="margin-top:1rem;padding:1rem;background:#f9f9f9;border-radius:8px;border:1px solid #ddd;">
    <p style="margin:0 0 0.5rem;font-size:0.9rem;"><strong>EMPLOYEE/CONTRACTOR:</strong></p>
    <p style="margin:0 0 0.5rem;">Address: ${field('coi_address', saved, staffEdit, 'Your address', 'doc-field-wide')}</p>
</div>
`;
}

function buildServiceAgreementDoc(saved, adminEdit, staffEdit, locked) {
    return `
<div class="doc-title">SERVICE AGREEMENT CONTRACT</div>
<div class="doc-title">NKOYA KIDD</div>

<p class="doc-paragraph">Service Agreement is entered into as of ${field('svc_date', saved, adminEdit, 'Date')} (date), between WESTSIDE RISING Organization, located at 5100 W. Harrison, Chicago, IL 60644, and ${field('svc_employee_name', saved, staffEdit, 'Full name', 'doc-field-wide')} Young Leaders Coordinator/Contracted Paid Intern.</p>

<div class="doc-section-heading">1. POSITION AND DUTIES</div>
<p class="doc-paragraph">The Employee/Contractor agrees to serve in the capacity of Young Leaders Coordinator Employee/Contractor and Social Media Manager; and shall perform duties as assigned by the Supervisor/Executive Director, including but not limited to those outlined in the attached job description document.</p>

<div class="doc-section-heading">2. COMPENSATION AND HOURS</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:1rem;font-size:0.92rem;">
    <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:0.6rem 0.5rem;width:40%;color:#555;">Role</td>
        <td style="padding:0.6rem 0.5rem;">Young Leaders Coordinator/Contracted Paid Intern &amp; Social Media Manager</td>
    </tr>
    <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:0.6rem 0.5rem;color:#555;">Hourly Rate</td>
        <td style="padding:0.6rem 0.5rem;">$24.00 per hour/Contractor. Benefits are not provided, Taxes are contractor's responsibility</td>
    </tr>
    <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:0.6rem 0.5rem;color:#555;">Scheduled Hours</td>
        <td style="padding:0.6rem 0.5rem;">20 - 30 hours per week</td>
    </tr>
    <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:0.6rem 0.5rem;color:#555;">Additional Hours</td>
        <td style="padding:0.6rem 0.5rem;">Must be approved in advance by the Executive Director. Compensation at the same hourly rate applies</td>
    </tr>
    <tr>
        <td style="padding:0.6rem 0.5rem;color:#555;">Pay Period</td>
        <td style="padding:0.6rem 0.5rem;">To be determined by Organization</td>
    </tr>
</table>

<div class="doc-section-heading">3. CONTRACTOR/EMPLOYEES DURATION AND PROBATIONARY PERIOD</div>
<p class="doc-paragraph">Total Contractor/Employees Length: 90 days</p>
<p class="doc-paragraph">Probationary Orientation Period: 45 days (runs concurrent with Contractor/Employee)<br>
During the 45-day probationary orientation period, the Contractor/Employee must successfully complete the following tasks:</p>
<p class="doc-paragraph">Tasks During Probationary Period:</p>
<ul class="doc-list">
    <li>Learn about WESTSIDE RISING's mission, vision, history, and work (know it through and through).</li>
    <li>Submit a 45-day work plan – based on the role</li>
    <li>Sumit daily reports and reflections sharing highlights, lessons, curiosities, feedback, and next steps (as needed)</li>
    <li>Support all executive and administrative duties as assigned by Executive Director</li>
    <li>Review and learn Community Organizing concepts and terminology (provided)</li>
    <li>Learn and administer phone banking, outreach, and turnout efforts for meetings and events</li>
    <li>Provide support for WR meetings and events (mandatory attendance Monthly Partners &amp; Leaders (P &amp; L) meeting - the last Tuesday of each month, team meetings, etc.)</li>
    <li>Identify all the West Side Public Official: Alderpersons, Federal and State Representatives, Senators (how many, who they are, their office location, and all contact information).</li>
    <li>Research Community Organizing. Write 1.5-page report about your findings highlighting 3 elements involved in effective Community Organizing, and how you can use Community Organizing strategies</li>
    <li>Conduct 6 one-on-ones with key leaders (in-person preferred). Write a 1 – 2 paragraph write-up about your findings for each person (ID their self-interest, level of commitment to WR, point of alignment with WR work, area of engagement interest, volunteer time commitment, if any, and any other interesting fact, skill or ability.)</li>
    <li>Finally, compile ALL of the information you have gathered into 1 report. This report should include the write up about Community Organizing, the information about the West Side Public Officials, the compiled One-on-ones information, a summary of ALL of the work you have done during the orientation period. include your key accomplishments and your SMART goals for your role. The report should be a minimum of 4 pages. You will present your report to the Director, and then to key WR leaders.</li>
</ul>

<div class="doc-section-heading">4. EVALUATION AND CONTINUATION</div>
<p class="doc-paragraph">Upon completion of the 45-day probationary orientation period, the Contractor/Employee's performance will be evaluated by the Organization. Continuation in the Contractor/Employee beyond the probationary period is contingent upon satisfactory completion of all required tasks and demonstration of competency in the role.</p>
<p class="doc-paragraph">Following successful completion of the probationary period, the Contractor/Employee may continue for the remainder of the 90-day Contractor/Employees period under standard performance expectations.</p>

<div class="doc-section-heading">5. Young Leaders Coordinator Key Responsibilities</div>
<ul class="doc-list">
    <li>Plan, coordinate, and manage the overall logistics and execution of the summer leadership program.</li>
    <li>Implement and engage in curriculum and activities that foster civic engagement and leadership skills.</li>
    <li>Recruit, train, and supervise program participants and volunteer mentors.</li>
    <li>Collect and analyze program data to assess participant success and areas for improvement.</li>
    <li>Create and generate detailed reports on program outcomes and community impact.</li>
    <li>Build relationships with community partners and members</li>
    <li>Represent WR in meetings and at events using critical and strategic thinking, planning, and reporting to identify opportunities and connections</li>
    <li>Reports to the Director</li>
</ul>

<div class="doc-section-heading">6. Social Media Manager</div>
<ul class="doc-list">
    <li>Create content to promote the organization and its vision</li>
    <li>Post on all social media platforms</li>
    <li>Manage content and engagement</li>
    <li>Utilize email marketing platform to reach constituents</li>
    <li>Create and develop newsletter, press releases and other relevant marketing matrials</li>
    <li>Other related duties</li>
</ul>

<div class="doc-section-heading">7. AT-WILL EMPLOYMENT</div>
<p class="doc-paragraph">This Contractor/Employee is at-will, meaning either party may terminate the agreement with written notice. During the probationary period, the Organization may terminate the agreement with minimal notice if performance is unsatisfactory.</p>

<div class="doc-section-heading">8. CONFIDENTIALITY AND CONDUCT</div>
<p class="doc-paragraph">The Contractor/Employee agrees to maintain confidentiality regarding all proprietary Organization information and to conduct themselves professionally at all times. The Contractor/Employee is expected to adhere to all Organization policies and procedures.</p>

<div class="doc-section-heading">9. ACKNOWLEDGMENT</div>
<p class="doc-paragraph">By signing below, both parties acknowledge that they have read, understand, and agree to the terms and conditions outlined in this Agreement.</p>
`;
}

function buildMediaReleaseDoc(saved, adminEdit, staffEdit, locked) {
    return `
<div class="doc-title">Media Release Agreement</div>

<p class="doc-paragraph">I ${field('media_name', saved, staffEdit, 'Full Name', 'doc-field-wide')} hereby grant WESTSIDE RISING! and its representatives the irrevocable, perpetual, worldwide right to use, reproduce, edit, publish, distribute, and display my image, likeness, voice, name, and any quotes or statements I provide, in whole or in part, in any media format or platform now known or later developed, for any lawful purpose including but not limited to promotional, commercial, educational, or informational use.</p>
<p class="doc-paragraph">I waive any right to inspect or approve the finished product or any use to which it may be applied. I affirm that I am over 18 years of age and competent to sign this release (or that a legal guardian has signed on my behalf), and I release WESTSIDE RISING from any and all claims or liability arising from the use of the materials as described above.</p>
`;
}

function buildEmailPolicyDoc(saved, adminEdit, staffEdit, locked) {
    return `
<div class="doc-title">EMAIL USE POLICY AND PROTOCOL</div>

<div class="doc-section-heading">1. PURPOSE AND SCOPE</div>
<p class="doc-paragraph">This Email Use Policy ("Policy") establishes guidelines for the use of all email accounts issued by or associated with WESTSIDE RISING ("Organization"). This Policy applies to all employees, contractors, consultants, interns, volunteers, and any other individuals with access to Organization email systems.</p>
<p class="doc-paragraph">All email accounts issued by the Organization remain the exclusive property of the Organization.</p>

<div class="doc-section-heading">2. AUTHORIZED USE</div>
<div class="doc-sub-heading">2.1 Permitted Uses</div>
<p class="doc-paragraph">Organization email accounts may be used exclusively for authorized business purposes, including:</p>
<ul class="doc-list">
    <li>Communication related to assigned job responsibilities and duties</li>
    <li>Internal coordination with staff, volunteers, and contractors</li>
    <li>External communication with clients, partners, funders, and stakeholders on behalf of the Organization</li>
    <li>Scheduling meetings and events related to Organization business</li>
    <li>Sharing work documents and materials necessary for job performance</li>
    <li>Participation in authorized Organization mailing lists and groups</li>
</ul>

<div class="doc-sub-heading">2.2 Business Purpose Requirement</div>
<p class="doc-paragraph">Every email sent from an organization account must serve a legitimate business purpose. Personal use, even if occasional or brief, is strictly prohibited.</p>

<div class="doc-section-heading">3. PROHIBITED USES</div>
<p class="doc-paragraph">Organization email accounts shall NOT be used for:</p>

<div class="doc-sub-heading">3.1 Personal Communication</div>
<ul class="doc-list">
    <li>Personal correspondence with family, friends, or acquaintances unrelated to Organization business</li>
    <li>Personal shopping, banking, or financial transactions</li>
    <li>Social media account management or personal social networking</li>
    <li>Personal calendar or scheduling unrelated to work</li>
    <li>Personal entertainment or leisure activities</li>
</ul>

<div class="doc-sub-heading">3.2 Commercial and Business Activities</div>
<ul class="doc-list">
    <li>Conducting or promoting a personal business or side business</li>
    <li>Soliciting or selling products or services (personal or otherwise)</li>
    <li>Freelance work or consulting unrelated to the Organization</li>
    <li>Marketing personal services or credentials</li>
    <li>Operating an alternative business using Organization email</li>
</ul>

<div class="doc-sub-heading">3.3 Inappropriate Content</div>
<ul class="doc-list">
    <li>Harassing, threatening, or abusive communications directed at any individual</li>
    <li>Discriminatory content based on race, color, religion, gender, sexual orientation, national origin, age, disability, or any other protected characteristic</li>
    <li>Sexually explicit, obscene, or pornographic materials</li>
    <li>Defamatory or libelous statements</li>
    <li>Violence, hate speech, or extremist content</li>
    <li>Profane or vulgar language used to demean or insult others</li>
</ul>

<div class="doc-sub-heading">3.4 Confidential and Sensitive Information</div>
<ul class="doc-list">
    <li>Forwarding or disclosing Confidential Information to unauthorized recipients</li>
    <li>Sharing participant, client, or beneficiary data outside proper channels</li>
    <li>Revealing strategic plans, financial information, or donor data to external parties</li>
    <li>Transmitting sensitive personal information (Social Security numbers, bank account details, passwords) via email</li>
    <li>Discussing confidential matters in a manner visible to unauthorized parties</li>
</ul>

<div class="doc-sub-heading">3.5 Security Violations</div>
<ul class="doc-list">
    <li>Sharing passwords or login credentials with others</li>
    <li>Forwarding emails from Organization accounts to personal email accounts</li>
    <li>Downloading attachments from unknown or untrusted sources</li>
    <li>Clicking suspicious links or opening attachments from unfamiliar senders</li>
    <li>Accessing email accounts on unsecured public networks without VPN protection</li>
</ul>

<div class="doc-sub-heading">3.6 Competitive or Conflicted Activities</div>
<ul class="doc-list">
    <li>Marketing competing services or organizations</li>
    <li>Soliciting Organization clients, partners, or funders for personal or competing purposes using Organization email</li>
    <li>Recruiting Organization staff for competing organizations</li>
    <li>Promoting outside employment opportunities (unless authorized for recruitment purposes)</li>
    <li>Communicating with competitors in a manner that reveals Organization strategies or information</li>
</ul>

<div class="doc-sub-heading">3.7 Legal and Regulatory Violations</div>
<ul class="doc-list">
    <li>Fraud, misrepresentation, or deception</li>
    <li>Violation of intellectual property rights (copyrights, trademarks, patents)</li>
    <li>Violation of any applicable laws, regulations, or industry standards</li>
    <li>Chain letters, spam, or mass unsolicited communications</li>
    <li>Impersonation of others or misrepresentation of identity</li>
</ul>

<div class="doc-section-heading">4. EMAIL ACCOUNT OWNERSHIP AND ACCESS</div>
<div class="doc-sub-heading">4.1 Organization Property</div>
<p class="doc-paragraph">The email account, including all messages, attachments, folders, and data, is the exclusive property of WESTSIDE RISING. The individual user has no expectation of privacy with respect to Organization email accounts.</p>

<div class="doc-sub-heading">4.2 Monitoring and Inspection</div>
<p class="doc-paragraph">The Organization reserves the right to monitor, access, review, and inspect Organization email accounts at any time, with or without notice, including:</p>
<ul class="doc-list">
    <li>Reading sent and received messages</li>
    <li>Reviewing attachments and file transfers</li>
    <li>Checking forwarding rules and filters</li>
    <li>Monitoring email storage and backup systems</li>
    <li>Conducting forensic analysis if suspected of misconduct</li>
</ul>
<p class="doc-paragraph">This monitoring may be conducted by:</p>
<ul class="doc-list">
    <li>IT Department staff</li>
    <li>Human Resources</li>
    <li>Executive leadership</li>
    <li>Law enforcement or legal counsel (as legally permitted)</li>
</ul>

<div class="doc-sub-heading">4.3 No Personal Privacy Rights</div>
<p class="doc-paragraph">Users waive any expectation of privacy in Organization email accounts. Even if an email account is customized with a personal name or nickname, it remains Organization property subject to full monitoring and access.</p>

<div class="doc-sub-heading">4.4 Personal Email Accounts</div>
<p class="doc-paragraph">The Organization prohibits the use of personal email accounts (Gmail, Yahoo, Outlook, etc.) for Organization business. If you receive a request to use a personal email for Organization matters, do not comply — instead, report the request to ${field('email_hr_contact', saved, adminEdit, 'HR Contact Name')}.</p>

<div class="doc-section-heading">5. EMAIL SECURITY REQUIREMENTS</div>
<div class="doc-sub-heading">5.1 Password Protection</div>
<ul class="doc-list">
    <li>Create a strong, unique password containing at least 12 characters, including uppercase, lowercase, numbers, and special characters</li>
    <li>Change your password every 90 days</li>
    <li>Never share your password with anyone, including IT staff or supervisors (the Organization can reset your password without needing it)</li>
    <li>Never write down your password or store it in unsecured locations</li>
</ul>

<div class="doc-sub-heading">5.2 Logout and Device Security</div>
<ul class="doc-list">
    <li>Always logout of email when using shared or public computers</li>
    <li>Lock your computer when stepping away from your desk</li>
    <li>Do not access Organization email on unsecured public Wi-Fi networks without VPN protection</li>
    <li>Report suspected unauthorized access immediately to IT</li>
</ul>

<div class="doc-sub-heading">5.3 Phishing and Suspicious Messages</div>
<ul class="doc-list">
    <li>Do not click links or download attachments from unfamiliar senders</li>
    <li>Verify sender identity before opening attachments or clicking links, even if the message appears to be from a known contact</li>
    <li>Report suspicious emails immediately to Executives or Support</li>
    <li>Never provide passwords or credentials in response to email requests</li>
</ul>

<div class="doc-sub-heading">5.4 Secure Data Handling</div>
<ul class="doc-list">
    <li>Do not send sensitive information (passwords, financial data, SSNs) via email; Use encrypted channels</li>
    <li>Use encryption when sending Confidential Information outside the Organization</li>
    <li>Limit email attachments to necessary business documents only</li>
    <li>Delete sensitive information securely after use</li>
</ul>

<div class="doc-section-heading">6. APPROPRIATE TONE AND PROFESSIONALISM</div>
<div class="doc-sub-heading">6.1 Professional Communication Standards</div>
<p class="doc-paragraph">All Organization email communications must:</p>
<ul class="doc-list">
    <li>Reflect professional, respectful, and courteous tone</li>
    <li>Represent the Organization positively in all external communications</li>
    <li>Use clear, grammatically correct language</li>
    <li>Avoid slang, excessive informality, or unprofessional humor</li>
    <li>Maintain confidentiality and discretion when discussing sensitive matters</li>
</ul>

<div class="doc-sub-heading">6.2 External Communications</div>
<p class="doc-paragraph">When communicating with external parties (funders, partners, clients, government officials), email communications:</p>
<ul class="doc-list">
    <li>Must be reviewed and approved by the Executive Director or designated supervisor for important matters</li>
    <li>Should follow Organization templates and communication standards</li>
    <li>Must accurately represent Organization positions and information</li>
    <li>Should maintain professional boundaries and avoid personal commentary</li>
</ul>

<div class="doc-sub-heading">6.3 Internal Communications</div>
<p class="doc-paragraph">While internal email may be somewhat more casual, it must still:</p>
<ul class="doc-list">
    <li>Remain respectful and professional</li>
    <li>Avoid gossip, rumors, or derogatory comments about colleagues</li>
    <li>Not contain offensive humor or inappropriate jokes</li>
    <li>Maintain confidentiality of sensitive discussions</li>
</ul>

<div class="doc-section-heading">7. RETENTION AND DELETION OF EMAILS</div>
<div class="doc-sub-heading">7.1 Retention Requirements</div>
<p class="doc-paragraph">Users must retain all emails related to:</p>
<ul class="doc-list">
    <li>Funding agreements and grants</li>
    <li>Financial transactions and budgets</li>
    <li>Legal matters and compliance</li>
    <li>Program participant information</li>
    <li>Strategic planning and governance</li>
    <li>Donor communications</li>
    <li>Any emails specifically marked for retention</li>
</ul>
<p class="doc-paragraph">Users should retain emails for a minimum of seven (7) years unless otherwise instructed.</p>

<div class="doc-sub-heading">7.2 Deletion Guidelines</div>
<p class="doc-paragraph">Personal organizational emails (calendar invitations, casual internal communications) may be deleted once no longer needed, provided they do not contain:</p>
<ul class="doc-list">
    <li>Confidential Information</li>
    <li>Contractual or financial records</li>
    <li>Donor or participant data</li>
    <li>Strategic information</li>
</ul>

<div class="doc-sub-heading">7.3 Archiving</div>
<p class="doc-paragraph">The Organization may automatically archive emails after a designated period (typically 90 days). Archived emails remain accessible but may be subject to longer retrieval times.</p>

<div class="doc-sub-heading">7.4 Email Backup and Recovery</div>
<p class="doc-paragraph">The Organization maintains backup systems to protect against data loss. Users should not rely on the Organization's backup systems for personal data recovery. If you inadvertently delete an important email, contact support immediately.</p>

<div class="doc-section-heading">8. TERMINATION AND ACCOUNT DEACTIVATION</div>
<div class="doc-sub-heading">8.1 Upon Separation</div>
<p class="doc-paragraph">When an employee, contractor, or other user separates from the Organization, their email account will be:</p>
<ul class="doc-list">
    <li>Immediately deactivated or transferred to an archive status</li>
    <li>Transferred to the Organization for ongoing management and access as needed</li>
    <li>Monitored to prevent unauthorized forwarding of emails to personal accounts</li>
</ul>

<div class="doc-sub-heading">8.2 Data Transition</div>
<p class="doc-paragraph">Prior to account deactivation, the user must:</p>
<ul class="doc-list">
    <li>Notify all external contacts of their departure and, if applicable, provide a new contact for ongoing matters</li>
    <li>Transfer or delegate emails related to unfinished projects to designated staff members</li>
    <li>Delete personal information (if any exists) that is not business-related</li>
    <li>Provide IT with any forwarding preferences for critical business emails</li>
</ul>

<div class="doc-sub-heading">8.3 Access After Separation</div>
<p class="doc-paragraph">The Organization retains full access to all email accounts after a user's departure. Former users have no right to access their former Organization email accounts after separation.</p>

<div class="doc-section-heading">9. VIOLATION CONSEQUENCES</div>
<div class="doc-sub-heading">9.1 Serious Violations</div>
<p class="doc-paragraph">Serious violations may result in immediate termination, including:</p>
<ul class="doc-list">
    <li>Transmitting Confidential Information or trade secrets to unauthorized parties</li>
    <li>Harassment, discrimination, or threatening behavior via email</li>
    <li>Deliberate security breaches or password sharing</li>
    <li>Using email for illegal activities (fraud, threats, illegal business)</li>
    <li>Impersonation of other staff members or the Organization</li>
    <li>Soliciting Organization clients, partners, or funders for competitive purposes</li>
</ul>

<div class="doc-sub-heading">9.2 Legal Action</div>
<p class="doc-paragraph">In addition to disciplinary action, the Organization may pursue legal remedies, including:</p>
<ul class="doc-list">
    <li>Civil litigation for damages caused by email misuse</li>
    <li>Injunctive relief to prevent further violations</li>
    <li>Criminal prosecution if email misuse involves illegal activity</li>
    <li>Recovery of costs associated with investigating violations</li>
</ul>

<div class="doc-section-heading">10. LEGAL COMPLIANCE</div>
<div class="doc-sub-heading">10.1 Regulatory Requirements</div>
<p class="doc-paragraph">Use of Organization email systems must comply with all applicable laws and regulations, including:</p>
<ul class="doc-list">
    <li>Title VII of the Civil Rights Act (prohibition of discrimination)</li>
    <li>Americans with Disabilities Act (ADA) (accessibility requirements)</li>
    <li>Health Insurance Portability and Accountability Act (HIPAA) (if applicable)</li>
    <li>Family Educational Rights and Privacy Act (FERPA) (if applicable)</li>
    <li>Illinois employment laws and privacy statutes</li>
</ul>

<div class="doc-sub-heading">10.2 Email as Evidence</div>
<p class="doc-paragraph">Users acknowledge that Organization emails may be discoverable in legal proceedings, audits, or investigations. The Organization may be required to produce emails in response to subpoenas or legal discovery requests.</p>

<div class="doc-sub-heading">10.3 Records Retention</div>
<p class="doc-paragraph">The Organization maintains email archiving and backup systems to ensure compliance with legal retention requirements. Users should not attempt to circumvent these systems through deletion or forwarding to personal accounts.</p>

<div class="doc-section-heading">11. TECHNOLOGY AND SYSTEM REQUIREMENTS</div>
<div class="doc-sub-heading">11.1 Approved Devices</div>
<p class="doc-paragraph">Organization email may only be accessed on:</p>
<ul class="doc-list">
    <li>Organization-issued computers and laptops</li>
    <li>Organization-approved mobile devices</li>
    <li>Organization-approved secure systems</li>
    <li>Personal devices only with prior written approval and security compliance</li>
</ul>

<div class="doc-sub-heading">11.2 Approved Email Clients</div>
<p class="doc-paragraph">Email must be accessed through:</p>
<ul class="doc-list">
    <li>Outlook Web Access (OWA)</li>
    <li>Organization-approved email clients (Google, Microsoft Outlook, Apple Mail, etc.)</li>
    <li>Not through forwarding to personal email accounts or unauthorized services</li>
</ul>

<div class="doc-sub-heading">11.3 Multi-Factor Authentication</div>
<p class="doc-paragraph">Users with access to sensitive information must enable multi-factor authentication (MFA) on their email accounts.</p>

<div class="doc-sub-heading">11.4 Updates and Security Patches</div>
<p class="doc-paragraph">Users must:</p>
<ul class="doc-list">
    <li>Install security updates promptly when notified by IT</li>
    <li>Update passwords after any security incidents</li>
    <li>Report any suspected compromises immediately to IT</li>
</ul>

<div class="doc-sub-heading">12.2 Legal Holds and Litigation</div>
<p class="doc-paragraph">If the Organization is involved in litigation, regulatory investigation, or legal dispute, users must:</p>
<ul class="doc-list">
    <li>Preserve all relevant emails (do not delete)</li>
    <li>Notify IT and legal counsel of the situation</li>
    <li>Comply with any "litigation hold" notices issued by legal counsel</li>
    <li>Continue to use email normally (avoid attempts to conceal or destroy evidence)</li>
</ul>

<div class="doc-section-heading">13. ACKNOWLEDGMENT AND AGREEMENT</div>
<div class="doc-sub-heading">13.1 Agreement to Policy</div>
<p class="doc-paragraph">By signing below, you acknowledge that you:</p>
<ul class="doc-list">
    <li>Have read and understood this Email Use Policy in its entirety</li>
    <li>Agree to comply with all terms and conditions outlined herein</li>
    <li>Understand the consequences of violating this policy</li>
    <li>Acknowledge that Organization email accounts are Organization property with no expectation of privacy</li>
    <li>Consent to monitoring and inspection of email accounts as described</li>
    <li>Understand that violations may result in discipline, termination, and legal action</li>
</ul>

<div class="doc-sub-heading">13.2 Continued Employment/Engagement</div>
<p class="doc-paragraph">Continued employment or engagement with the Organization is contingent upon compliance with this Email Use Policy. The Organization reserves the right to update or modify this policy at any time, and users will be notified of material changes.</p>

<div class="doc-section-heading" style="text-decoration:underline;">SIGNATURE PAGE</div>
<div class="doc-sub-heading">ACKNOWLEDGMENT AND AGREE TO THIS ORGANIZATIONAL EMAIL USE POLICY</div>
<p class="doc-paragraph">I acknowledge that I have received, read, and fully understand the Organizational Email Use Policy for WESTSIDE RISING. I agree to comply with all terms and conditions outlined in this policy and acknowledge my understanding of the consequences of non-compliance.</p>
<p class="doc-paragraph">I further acknowledge that:</p>
<ul class="doc-list">
    <li>I understand that Organization email accounts are organizational property with no personal privacy rights</li>
    <li>I will use my email account exclusively for authorized business purposes</li>
    <li>I understand the prohibited uses outlined in Section 3</li>
    <li>I will comply with all security requirements outlined in Section 5</li>
    <li>I understand that my email may be monitored, accessed, and inspected without notice</li>
    <li>I understand that violations may result in discipline, termination, and legal action</li>
    <li>I will immediately report any suspected security breaches or email misuse</li>
</ul>

<div class="doc-section-heading">USER INFORMATION:</div>
<div style="display:grid;grid-template-columns:160px 1fr;gap:0.6rem 1rem;align-items:center;margin-bottom:1.5rem;">
    <label style="font-weight:600;font-size:0.9rem;">Name (Print):</label>
    ${field('email_name', saved, staffEdit, 'Full Name', 'doc-field-wide')}
    <label style="font-weight:600;font-size:0.9rem;">Email Address:</label>
    ${field('email_address', saved, staffEdit, 'Email Address', 'doc-field-wide')}
    <label style="font-weight:600;font-size:0.9rem;">Position/Title:</label>
    ${field('email_position', saved, staffEdit, 'Position/Title', 'doc-field-wide')}
    <label style="font-weight:600;font-size:0.9rem;">Department:</label>
    ${field('email_department', saved, staffEdit, 'Department', 'doc-field-wide')}
    <label style="font-weight:600;font-size:0.9rem;">Start Date:</label>
    ${field('email_start_date', saved, staffEdit, 'Start Date', 'doc-field-wide')}
</div>

<div class="doc-section-heading">APPENDIX: QUICK REFERENCE GUIDE</div>
<div class="doc-sub-heading">DO:</div>
<ul class="doc-list">
    <li>✅ Use Organization email for authorized business purposes only</li>
    <li>✅ Maintain strong, unique passwords and update every 90 days</li>
    <li>✅ Report suspicious emails or security concerns immediately</li>
    <li>✅ Logout when using shared computers</li>
    <li>✅ Verify sender identity before opening attachments</li>
    <li>✅ Retain emails related to significant business matters</li>
    <li>✅ Communicate professionally and respectfully</li>
    <li>✅ Follow all Organization email policies and procedures</li>
</ul>
<div class="doc-sub-heading">DON'T:</div>
<ul class="doc-list">
    <li>❌ Use Organization email for personal communication</li>
    <li>❌ Share passwords with anyone</li>
    <li>❌ Forward Organization emails to personal accounts</li>
    <li>❌ Access email on unsecured public Wi-Fi</li>
    <li>❌ Share Confidential Information with unauthorized parties</li>
    <li>❌ Click links or download attachments from unknown senders</li>
    <li>❌ Use email for harassing, discriminatory, or inappropriate communications</li>
    <li>❌ Conduct personal business using Organization email</li>
</ul>
`;
}

function buildStaffServiceAgreementDoc(saved, adminEdit, staffEdit, locked) {
    return `
<div class="doc-title">Community Engagement Ambassador (CEA)</div>
<div class="doc-title">SERVICE AGREEMENT</div>

<p class="doc-paragraph">Service Agreement is entered into as of ${field('svc_date', saved, adminEdit, 'Date')} (date), between WESTSIDE RISING Organization, located at 5100 W. Harrison, Chicago, IL 60644, and ${field('svc_employee_name', saved, staffEdit, 'Full name', 'doc-field-wide')} Community Engagement Ambassador.</p>

<div class="doc-section-heading">1. POSITION AND DUTIES</div>
<p class="doc-paragraph">The Employee/Contractor agrees to serve in the capacity of Community Engagement Ambassador for WESTSIDE RISING and shall perform duties as assigned by the Supervisor/Executive Director, including but not limited to those outlined in the attached job description document.</p>

<div class="doc-section-heading">2. COMPENSATION AND HOURS</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:1rem;font-size:0.92rem;">
    <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:0.6rem 0.5rem;width:40%;color:#555;">Role</td>
        <td style="padding:0.6rem 0.5rem;">Community Engagement Ambassador</td>
    </tr>
    <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:0.6rem 0.5rem;color:#555;">Hourly Rate</td>
        <td style="padding:0.6rem 0.5rem;">$18.00 per hour/Contractor. Benefits are not provided, Taxes are contractor's responsibility</td>
    </tr>
    <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:0.6rem 0.5rem;color:#555;">Scheduled Hours</td>
        <td style="padding:0.6rem 0.5rem;">10 – 12 hours per week</td>
    </tr>
    <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:0.6rem 0.5rem;color:#555;">Additional Hours</td>
        <td style="padding:0.6rem 0.5rem;">Must be approved in advance by the Executive Director. Compensation at the same hourly rate applies</td>
    </tr>
    <tr>
        <td style="padding:0.6rem 0.5rem;color:#555;">Pay Period</td>
        <td style="padding:0.6rem 0.5rem;">To be determined by Organization</td>
    </tr>
</table>

<p class="doc-paragraph">About the Role: WESTSIDE RISING is offering a contracted Community Engagement Ambassador position. This position provides direct support to the YL Coordinator and Organizer. The preferred person has basic knowledge of community outreach and engagement practices and will have a key role in the life cycle of WR organizing campaigns.</p>

<p class="doc-paragraph">Responsibilities:</p>
<ul class="doc-list">
    <li>Work with the YL Coordinator, WR Organizer and other support staff to assist with external activities.</li>
    <li>Conduct boots-on-the-ground and other outreach and engagement efforts in the community.</li>
    <li>Attend events, conduct door-knocking, flyering, surveying, phone banking, etc.</li>
    <li>Support Fundraising efforts</li>
    <li>Assist with the life cycle of a community organizing campaign, from identification, base-building, and conducting action to beneficial resolutions.</li>
    <li>Conduct one-on-ones</li>
    <li>Recruit and engage community members and leaders to work with WESTSIDE RISING.</li>
    <li>Establishing and building working reciprocating relationships with community members, leaders, and organizations to develop partnerships</li>
    <li>Help conduct issue-based research.</li>
    <li>Provide turnout, phone banking, advocacy, engagement and other organizing efforts</li>
    <li>Submit brief reports about work and progress</li>
    <li>Must be able to work some evenings and some weekends</li>
    <li>Other duties, as requested</li>
</ul>
`;
}

function buildSummerYouthServiceAgreementDoc(saved, adminEdit, staffEdit, locked) {
    return `
<div class="doc-title">Summer Youth Ambassador</div>
<div class="doc-title">SERVICE AGREEMENT</div>

<p class="doc-paragraph">Service Agreement is entered into as of ${field('svc_date', saved, adminEdit, 'Date')} (date), between WESTSIDE RISING Organization, located at 5100 W. Harrison, Chicago, IL 60644, and ${field('svc_employee_name', saved, staffEdit, 'Full name', 'doc-field-wide')} Community Engagement Ambassador.</p>

<div class="doc-section-heading">1. POSITION AND DUTIES</div>
<p class="doc-paragraph">The Employee/Contractor agrees to serve in the capacity of Community Engagement Ambassador for WESTSIDE RISING and shall perform duties as assigned by the Supervisor/Executive Director, including but not limited to those outlined in the attached job description document.</p>

<div class="doc-section-heading">2. COMPENSATION AND HOURS</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:1rem;font-size:0.92rem;">
    <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:0.6rem 0.5rem;width:40%;color:#555;">Role</td>
        <td style="padding:0.6rem 0.5rem;">Community Engagement Ambassador</td>
    </tr>
    <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:0.6rem 0.5rem;color:#555;">Hourly Rate</td>
        <td style="padding:0.6rem 0.5rem;">$16.00 per hour/Contractor. Benefits are not provided, Taxes are contractor's responsibility</td>
    </tr>
    <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:0.6rem 0.5rem;color:#555;">Scheduled Hours</td>
        <td style="padding:0.6rem 0.5rem;">10 – 12 hours per week</td>
    </tr>
    <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:0.6rem 0.5rem;color:#555;">Additional Hours</td>
        <td style="padding:0.6rem 0.5rem;">Must be approved in advance by the Executive Director. Compensation at the same hourly rate applies</td>
    </tr>
    <tr>
        <td style="padding:0.6rem 0.5rem;color:#555;">Pay Period</td>
        <td style="padding:0.6rem 0.5rem;">To be determined by Organization</td>
    </tr>
</table>

<p class="doc-paragraph">About the Role: WESTSIDE RISING is offering a Summer Youth Ambassador position. This position provides direct support to the Young Leaders Coordinator and the Community Organizer. The preferred person is passionate about Social Justice, has basic knowledge of their community and has interest in participating in outreach and engagement practices to support the life cycle of WR organizing campaigns.</p>

<p class="doc-paragraph">Responsibilities:</p>
<ul class="doc-list">
    <li>Must learn about and be able to present information about Westside Rising</li>
    <li>Work with the WR YL Coordinator, Organizer, a other support staff to assist with external activities.</li>
    <li>Conduct boots-on-the-ground and other outreach and engagement efforts in the community.</li>
    <li>Conduct community surveys, polling, and interviews</li>
    <li>Conduct 2  one-on-ones per month</li>
    <li>Attend and support community meetings and events</li>
    <li>Provide turnout, phone banking and engagement efforts</li>
    <li>Conduct door-knocking, flyering, surveying, phone banking, etc.</li>
    <li>Submit brief reports about work and progress</li>
    <li>Must be able to work some evenings and some weekends</li>
    <li>Must attend and recruit people for the WR mandatory monthly meeting on the last Tuesday of each month</li>
    <li>Other duties, as requested</li>
</ul>
`;
}

function buildKendraServiceAgreementDoc(saved, adminEdit, staffEdit, locked) {
    return `
<div class="doc-title">SERVICE AGREEMENT CONTRACT</div>

<p class="doc-paragraph">Service Agreement is entered into as of ${field('svc_date', saved, adminEdit, 'Date')} (date), between WESTSIDE RISING Organization, located at 5100 W. Harrison, Chicago, IL 60644, and ${field('svc_employee_name', saved, staffEdit, 'Full name', 'doc-field-wide')} to serve as the Young Leaders Summer Support.</p>

<div class="doc-section-heading">1. POSITION AND DUTIES</div>
<p class="doc-paragraph">The Employee/Contractor agrees to serve in the capacity of Young Leaders Summer Support Employee/Contractor and shall perform duties as assigned by the Supervisor/Executive Director, including but not limited to those outlined in the attached job description document.</p>

<div class="doc-section-heading">2. COMPENSATION AND HOURS</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:1rem;font-size:0.92rem;">
    <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:0.6rem 0.5rem;width:40%;color:#555;">Role</td>
        <td style="padding:0.6rem 0.5rem;">Young Leaders Summer Support</td>
    </tr>
    <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:0.6rem 0.5rem;color:#555;">Hourly Rate</td>
        <td style="padding:0.6rem 0.5rem;">$20.00 per hour/Contractor. Benefits are not provided, Taxes are contractor's responsibility</td>
    </tr>
    <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:0.6rem 0.5rem;color:#555;">Scheduled Hours</td>
        <td style="padding:0.6rem 0.5rem;">10 - 12 hours per week</td>
    </tr>
    <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:0.6rem 0.5rem;color:#555;">Additional Hours</td>
        <td style="padding:0.6rem 0.5rem;">Must be approved in advance by the Executive Director. Compensation at the same hourly rate applies</td>
    </tr>
    <tr>
        <td style="padding:0.6rem 0.5rem;color:#555;">Pay Period</td>
        <td style="padding:0.6rem 0.5rem;">To be determined by Organization</td>
    </tr>
</table>

<div class="doc-section-heading">3. CONTRACTOR/EMPLOYEES DURATION AND PROBATIONARY PERIOD</div>

<div class="doc-section-heading">5. Young Leaders Summer Support Key Responsibilities</div>
<ul class="doc-list">
    <li>Provide support in planning, coordinating, and managing the logistics summer leadership program.</li>
    <li>Engage and support training sessions and activities that foster civic engagement and leadership skills.</li>
    <li>Provide support in collecting program data</li>
    <li>Create reports on program activities and outcomes.</li>
    <li>Build relationships and partnerships with community members</li>
    <li>Represent WR in meetings and at events using critical and strategic thinking, planning, and reporting to identify opportunities and connections</li>
    <li>Conduct 5 one-on -ones with community leaders</li>
    <li>Reports to the Young Leaders Coordinator and Executive Director</li>
</ul>

<div class="doc-section-heading">6. AT-WILL EMPLOYMENT</div>
<p class="doc-paragraph">This Contractor/Employee is at-will, meaning either party may terminate the agreement with written notice. During the probationary period, the Organization may terminate the agreement with minimal notice if performance is unsatisfactory.</p>

<div class="doc-section-heading">7. CONFIDENTIALITY AND CONDUCT</div>
<p class="doc-paragraph">The Contractor/Employee agrees to maintain confidentiality regarding all proprietary Organization information and to conduct themselves professionally at all times. The Contractor/Employee is expected to adhere to all Organization policies and procedures.</p>

<div class="doc-section-heading">8. ACKNOWLEDGMENT</div>
<p class="doc-paragraph">By signing below, both parties acknowledge that they have read, understand, and agree to the terms and conditions outlined in this Agreement.</p>
`;
}
