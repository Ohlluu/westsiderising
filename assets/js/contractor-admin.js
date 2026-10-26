// Contractors Tab — superadmin only.
//
// Mirrors bod-admin.js, with one addition: Dr. Orr countersigns the Service
// Agreement and the Conflict of Interest here. She cannot edit anything the
// contractor entered; documents render read-only and she only adds a signature.

let contractorMembers = [];
let contractorContracts = {};     // keyed by access code
let contractorCurrentCode = null;

// ==================== Entry Point ====================

function initializeContractors() {
    const container = document.getElementById('contractors-tab');
    if (!container) return;

    if (userRole !== 'superadmin') {
        container.innerHTML = `
            <div class="contracts-empty">
                <i class="fas fa-lock"></i> This section is restricted.
            </div>`;
        return;
    }

    renderContractorRoster();
}

// ==================== Roster ====================

async function renderContractorRoster() {
    const container = document.getElementById('contractors-tab');
    contractorCurrentCode = null;

    container.innerHTML = `
        <div class="contracts-container">
            <div class="bod-header">
                <div>
                    <h2 class="bod-title">Contractors</h2>
                    <p class="bod-subtitle">
                        Signed contractor agreements. Each contractor receives a private link,
                        and these pages are not linked anywhere on the website.
                    </p>
                </div>
                <button class="bod-add-btn" onclick="showContractorAddForm()">
                    <i class="fas fa-plus"></i> Add Contractor
                </button>
            </div>

            <div id="contractor-add-form" class="bod-add-form" style="display:none;">
                <label for="contractor-new-name">Contractor name</label>
                <input type="text" id="contractor-new-name" placeholder="Full name" autocomplete="off">
                <div class="bod-add-actions">
                    <button class="bod-cancel-btn" onclick="hideContractorAddForm()">Cancel</button>
                    <button class="bod-save-btn" onclick="createContractorMember()">
                        <i class="fas fa-key"></i> Generate Access Link
                    </button>
                </div>
                <div id="contractor-add-error" class="bod-add-error" style="display:none;"></div>
            </div>

            <div id="contractor-list" class="staff-contracts-list">
                <div class="contracts-loading"><i class="fas fa-spinner fa-spin"></i> Loading contractors…</div>
            </div>
        </div>
    `;

    try {
        const [memberSnap, contractSnap] = await Promise.all([
            db.collection('contractorMembers').get(),
            db.collection('contractorContracts').get()
        ]);

        contractorMembers = [];
        memberSnap.forEach(doc => contractorMembers.push({ code: doc.id, ...doc.data() }));
        contractorMembers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        contractorContracts = {};
        contractSnap.forEach(doc => { contractorContracts[doc.id] = doc.data(); });

        renderContractorRows();
    } catch (err) {
        console.error('Error loading contractors:', err);
        document.getElementById('contractor-list').innerHTML =
            '<div class="contracts-empty">Error loading contractors.</div>';
    }
}

function contractorOverallStatus(data) {
    const docs = (data && data.documents) || {};
    const signed = CONTRACTOR_DOCS.filter(d => docs[d.id]?.contractorSigned);
    if (!signed.length) return 'not-started';

    const fullyDone = CONTRACTOR_DOCS.every(d => {
        const dd = docs[d.id] || {};
        return dd.contractorSigned && (!d.wrCountersign || dd.wrSigned);
    });
    if (fullyDone) return 'complete';

    // Anything the contractor has signed that still needs a WR signature.
    const awaitingWR = CONTRACTOR_DOCS.some(d =>
        d.wrCountersign && docs[d.id]?.contractorSigned && !docs[d.id]?.wrSigned);
    return awaitingWR ? 'awaiting-wr' : 'in-progress';
}

function renderContractorRows() {
    const list = document.getElementById('contractor-list');
    if (!list) return;

    if (!contractorMembers.length) {
        list.innerHTML = `
            <div class="contracts-empty">
                No contractors yet. Use <strong>Add Contractor</strong> to generate a private
                signing link.
            </div>`;
        return;
    }

    list.innerHTML = contractorMembers.map(m => {
        const data = contractorContracts[m.code] || { documents: {} };
        const signedCount = CONTRACTOR_DOCS.filter(d => data.documents?.[d.id]?.contractorSigned).length;
        const status = m.revoked ? 'revoked' : contractorOverallStatus(data);

        return `
            <div class="staff-contract-row bod-row">
                <div class="staff-contract-info" onclick="openContractorMember('${m.code}')">
                    <div class="staff-contract-avatar">${bdEscape(bodInitials(m.name))}</div>
                    <div>
                        <div class="staff-contract-name">${bdEscape(m.name || 'Unnamed')}</div>
                        <div class="staff-contract-email">
                            ${signedCount} of ${CONTRACTOR_DOCS.length} documents signed
                        </div>
                    </div>
                </div>
                <div class="staff-contract-status">
                    ${contractorStatusBadge(status)}
                    <button class="bod-icon-btn" title="Copy private link"
                            onclick="copyContractorLink(event, '${m.code}')">
                        <i class="fas fa-link"></i>
                    </button>
                    <button class="bod-icon-btn ${m.revoked ? 'restore' : 'danger'}"
                            title="${m.revoked ? 'Reactivate access' : 'Revoke access'}"
                            onclick="toggleContractorRevoked(event, '${m.code}', ${!m.revoked})">
                        <i class="fas fa-${m.revoked ? 'rotate-left' : 'ban'}"></i>
                    </button>
                    <button class="bod-icon-btn danger" title="Delete contractor"
                            onclick="deleteContractorMember(event, '${m.code}')">
                        <i class="fas fa-trash"></i>
                    </button>
                    <i class="fas fa-chevron-right bod-chevron" onclick="openContractorMember('${m.code}')"></i>
                </div>
            </div>
        `;
    }).join('');
}

function contractorStatusBadge(status) {
    const map = {
        'not-started': ['badge-not-started',  'Not Started'],
        'in-progress': ['badge-wr-signed',    'In Progress'],
        'awaiting-wr': ['badge-staff-signed', 'Awaiting Your Signature'],
        'complete':    ['badge-complete',     '<i class="fas fa-check"></i> Fully Executed'],
        'revoked':     ['badge-revoked',      'Access Revoked'],
    };
    const [cls, label] = map[status] || map['not-started'];
    return `<span class="contract-status-badge ${cls}">${label}</span>`;
}

// ==================== Add / Revoke ====================

function showContractorAddForm() {
    document.getElementById('contractor-add-form').style.display = 'block';
    document.getElementById('contractor-new-name').focus();
}

function hideContractorAddForm() {
    document.getElementById('contractor-add-form').style.display = 'none';
    document.getElementById('contractor-new-name').value = '';
    document.getElementById('contractor-add-error').style.display = 'none';
}

async function createContractorMember() {
    const nameInput = document.getElementById('contractor-new-name');
    const errorEl = document.getElementById('contractor-add-error');
    const name = nameInput.value.trim();

    if (!name) {
        errorEl.textContent = 'Please enter the contractor\'s name.';
        errorEl.style.display = 'block';
        return;
    }

    const code = generateBODCode();

    try {
        await db.collection('contractorMembers').doc(code).set({
            name,
            revoked: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid
        });

        hideContractorAddForm();
        await renderContractorRoster();
        showContractorLinkModal(name, code);
    } catch (err) {
        console.error('Error creating contractor:', err);
        errorEl.textContent = 'Could not create the access link. Please try again.';
        errorEl.style.display = 'block';
    }
}

async function toggleContractorRevoked(event, code, revoked) {
    event.stopPropagation();
    const member = contractorMembers.find(m => m.code === code);
    const name = member ? member.name : 'this contractor';

    const msg = revoked
        ? `Revoke access for ${name}?\n\nTheir link will stop working. Documents they have already signed are kept.`
        : `Reactivate access for ${name}?\n\nTheir original link will work again.`;
    if (!confirm(msg)) return;

    try {
        await db.collection('contractorMembers').doc(code).update({ revoked });
        await renderContractorRoster();
    } catch (err) {
        console.error('Error updating contractor:', err);
        alert('Could not update access. Please try again.');
    }
}

// Deletes the contractor and their documents outright. Intended for fixing a
// mistyped name right after creating it. If the agreement has been signed, the
// confirmation escalates to typing the name, because this destroys an executed
// contract rather than just cutting off access — revoke does that.
async function deleteContractorMember(event, code) {
    event.stopPropagation();

    const member = contractorMembers.find(m => m.code === code);
    const name = (member && member.name) || 'this contractor';
    const data = contractorContracts[code] || { documents: {} };
    const hasSigned = !!data.documents?.service?.contractorSigned;
    const wrSigned = !!data.documents?.service?.wrSigned;

    if (hasSigned) {
        const state = wrSigned
            ? 'This agreement is FULLY EXECUTED — both parties have signed.'
            : 'This contractor has already signed. Your countersignature is still pending.';
        const typed = prompt(
            `WARNING: ${state}\n\n` +
            `Deleting removes the signed Service Agreement, NDA, and Conflict of Interest ` +
            `permanently. This cannot be undone.\n` +
            `If you only want to stop their access, cancel and use Revoke instead.\n\n` +
            `To delete anyway, type the name exactly: ${name}`
        );
        if (typed === null) return;
        if (typed.trim() !== name.trim()) {
            alert('The name did not match. Nothing was deleted.');
            return;
        }
    } else if (!confirm(`Delete ${name}?\n\nThey have not signed anything yet. Their link will stop working. This cannot be undone.`)) {
        return;
    }

    try {
        await db.collection('contractorContracts').doc(code).delete();
        await db.collection('contractorMembers').doc(code).delete();
        await renderContractorRoster();
    } catch (err) {
        console.error('Error deleting contractor:', err);
        alert('Could not delete this contractor. Please try again.');
    }
}

function contractorLinkFor(code) {
    return `${window.location.origin}/contractor.html?c=${code}`;
}

function copyContractorLink(event, code) {
    event.stopPropagation();
    const member = contractorMembers.find(m => m.code === code);
    showContractorLinkModal(member ? member.name : '', code);
}

function showContractorLinkModal(name, code) {
    const link = contractorLinkFor(code);
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
                as this contractor, so do not post it or forward it to a group.
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

// ==================== Contractor Document (single packet) ====================

async function openContractorMember(code) {
    contractorCurrentCode = code;

    const member = contractorMembers.find(m => m.code === code) || { name: '' };
    const container = document.getElementById('contractors-tab');

    container.innerHTML = `
        <div class="contracts-container">
            <button class="contracts-back-btn" onclick="renderContractorRoster()">
                <i class="fas fa-arrow-left"></i> Back to Contractors
            </button>
            <div class="contracts-header-bar">
                <div>
                    <div class="contracts-header-name">${bdEscape(member.name || 'Contractor')}</div>
                    <div class="contracts-header-sub">Contractor &bull; Service Agreement, NDA, Conflict of Interest</div>
                </div>
            </div>
            <div id="contractor-admin-content">
                <div class="contracts-loading"><i class="fas fa-spinner fa-spin"></i> Loading documents…</div>
            </div>
        </div>
    `;

    try {
        const snap = await db.collection('contractorContracts').doc(code).get();
        contractorContracts[code] = snap.exists ? snap.data() : { documents: {} };
        if (!contractorContracts[code].documents) contractorContracts[code].documents = {};
    } catch (e) {
        contractorContracts[code] = { documents: {} };
    }

    renderContractorAdminDocument();
}

function contractorAdminSection(docId) {
    const data = contractorContracts[contractorCurrentCode] || { documents: {} };
    return data.documents?.[docId] || {};
}

function renderContractorAdminDocument() {
    const content = document.getElementById('contractor-admin-content');
    if (!content) return;

    const signed = !!contractorAdminSection('service').contractorSigned;
    const wrSigned = !!contractorAdminSection('service').wrSigned;
    const sig = contractorAdminSection('service').contractorSignature || {};
    const wrSig = contractorAdminSection('service').wrSignature || {};

    let banner;
    if (!signed) {
        banner = `<div class="doc-status-banner pending-staff"><i class="fas fa-clock"></i> Not yet signed by the contractor.</div>`;
    } else if (!wrSigned) {
        banner = `<div class="doc-status-banner pending-wr"><i class="fas fa-pen"></i> Signed by the contractor on ${formatBODDate(sig.date)}. Your signature puts the Service Agreement and Conflict of Interest into effect.</div>`;
    } else {
        banner = `<div class="doc-status-banner fully-signed"><i class="fas fa-lock"></i> Fully executed on ${formatBODDate(wrSig.date)}.</div>`;
    }

    // Documents always render read-only here. Dr. Orr countersigns; she never edits
    // what the contractor submitted.
    const packet = CONTRACTOR_DOCS.map((d, i) => {
        const data = contractorAdminSection(d.id);
        return `
            ${i > 0 ? '<div class="doc-page-break"></div>' : ''}
            <section class="doc-section">
                <div class="doc-page-label">Page ${i + 1} of ${CONTRACTOR_DOCS.length}</div>
                ${buildContractorDocument(d.id, data.fields || {}, false)}
                ${renderContractorAdminSignature(d, data, signed, wrSigned)}
            </section>
        `;
    }).join('');

    content.innerHTML = `
        <div class="document-card">
            ${banner}
            <div class="document-body" id="contractor-admin-body">
                ${packet}
            </div>
            <div class="contract-action-bar">
                <button class="contract-save-btn print-doc-btn"><i class="fas fa-print"></i> Print</button>
                <button class="contract-save-btn download-doc-btn"><i class="fas fa-download"></i> Download PDF</button>
                ${signed && !wrSigned ? `
                    <div class="contractor-sign-area">
                        <label for="contractor-wr-sig-input">Countersign as Westside Rising</label>
                        <input class="signature-name-input" id="contractor-wr-sig-input"
                               placeholder="Type full name to sign" autocomplete="off">
                    </div>
                    <button class="contract-sign-btn" onclick="submitContractorWRSignature()"><i class="fas fa-pen-nib"></i> Sign as Westside Rising</button>
                ` : ''}
            </div>
        </div>
    `;

    const printBtn = content.querySelector('.print-doc-btn');
    if (printBtn) printBtn.addEventListener('click', printContractorAdminDocument);

    const downloadBtn = content.querySelector('.download-doc-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const member = contractorMembers.find(m => m.code === contractorCurrentCode) || { name: '' };
            const body = document.getElementById('contractor-admin-body');
            bdDownloadPDF(body, bdFilename('Contractor Agreement', member.name, 'pdf'), downloadBtn);
        });
    }
}

function renderContractorAdminSignature(doc, data, signed, wrSigned) {
    const sig = data.contractorSignature || {};
    const wrSig = data.wrSignature || {};
    const pending = '<div class="signature-name-display" style="color:#bbb;font-size:1rem;">Pending</div>';

    const wrParty = doc.wrCountersign ? `
        <div class="signature-party">
            <div class="signature-party-label">WESTSIDE RISING</div>
            <div class="signature-row">
                <label>Authorized signature (typed)</label>
                ${wrSigned ? `<div class="signature-name-display">${bdEscape(wrSig.name)}</div>` : pending}
            </div>
            <div class="signature-row">
                <label>Date</label>
                <div class="signature-date-display">${wrSigned ? formatBODDate(wrSig.date) : ''}</div>
            </div>
            ${wrSigned && wrSig.nameTitle ? `<div class="signature-row"><label>Name &amp; Title</label><div class="signature-date-display">${bdEscape(wrSig.nameTitle)}</div></div>` : ''}
        </div>
    ` : '';

    return `
        <div class="signature-block">
            <div class="${doc.wrCountersign ? 'signature-grid' : ''}">
                <div class="signature-party">
                    <div class="signature-party-label">CONTRACTOR</div>
                    <div class="signature-row">
                        <label>Signature (typed)</label>
                        ${data.contractorSigned ? `<div class="signature-name-display">${bdEscape(sig.name)}</div>` : pending}
                    </div>
                    <div class="signature-row">
                        <label>Date signed</label>
                        <div class="signature-date-display">${data.contractorSigned ? formatBODDate(sig.date) : ''}</div>
                    </div>
                </div>
                ${wrParty}
            </div>
        </div>
    `;
}

// ==================== Countersign ====================

async function submitContractorWRSignature() {
    const sigInput = document.getElementById('contractor-wr-sig-input');
    if (!sigInput || !sigInput.value.trim()) {
        alert('Please type your full name in the signature field before signing.');
        if (sigInput) sigInput.focus();
        return;
    }

    const nameTitle = prompt('Enter your name and title (e.g. Dr. Angelique Orr, Executive Director):');
    if (!nameTitle) return;

    if (!confirm(
        'Countersign this agreement on behalf of Westside Rising?\n\n' +
        'This signs the Service Agreement and the Conflict of Interest, putting the ' +
        'agreement into effect. It cannot be undone.'
    )) return;

    const signedAt = new Date().toISOString();
    const wrSignature = {
        name: sigInput.value.trim(),
        nameTitle: nameTitle.trim(),
        date: signedAt,
        signedBy: currentUser.uid
    };

    const payload = { updatedAt: firebase.firestore.FieldValue.serverTimestamp(), documents: {} };
    CONTRACTOR_DOCS.filter(d => d.wrCountersign).forEach(d => {
        payload.documents[d.id] = { wrSigned: true, wrSignature };
    });

    try {
        await db.collection('contractorContracts').doc(contractorCurrentCode).set(payload, { merge: true });
        const snap = await db.collection('contractorContracts').doc(contractorCurrentCode).get();
        contractorContracts[contractorCurrentCode] = snap.data();
        renderContractorAdminDocument();
    } catch (err) {
        console.error('Error saving WR signature:', err);
        alert('Could not save your signature. Please try again.');
    }
}

// ==================== Print ====================

function printContractorAdminDocument() {
    const body = document.getElementById('contractor-admin-body');
    if (!body) return;
    const member = contractorMembers.find(m => m.code === contractorCurrentCode) || { name: '' };

    const win = window.open('', '_blank');
    if (!win) {
        alert('Please allow popups for this site to print documents.');
        return;
    }

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Contractor Agreement — ${bdEscape(member.name)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap" rel="stylesheet">
    <style>
        body{font-family:Arial,Helvetica,sans-serif;padding:2rem 3rem;color:#222;font-size:11pt;line-height:1.7;margin:0;}
        .doc-section{page-break-after:always;}
        .doc-section:last-child{page-break-after:auto;}
        .doc-page-break,.doc-page-label{display:none;}
        .doc-title{font-weight:700;font-size:1.1rem;color:#5B1A6B;margin-bottom:0.3rem;}
        .doc-subtitle{font-size:0.9rem;color:#666;margin-bottom:1.2rem;border-bottom:1px solid #ccc;padding-bottom:0.6rem;}
        .doc-section-heading{font-weight:700;margin:1.2rem 0 0.4rem;color:#5B1A6B;}
        .doc-paragraph{margin-bottom:0.8rem;}
        .doc-rows{margin-bottom:1rem;}
        .doc-row{display:flex;gap:1rem;margin-bottom:0.5rem;align-items:baseline;}
        .doc-row-label{flex:0 0 200px;font-size:0.85rem;color:#444;}
        .doc-row-field{flex:1;border-bottom:1px solid #333;min-height:1.3rem;}
        .doc-field{border:none;background:transparent;font-family:inherit;font-size:inherit;color:#222;}
        .doc-textarea{display:block;width:100%;border:1px solid #999;padding:0.6rem;min-height:4rem;white-space:pre-wrap;}
        .signature-block{margin-top:2rem;padding-top:1.2rem;border-top:2px solid #ddd;page-break-inside:avoid;}
        .signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:2rem;}
        .signature-party-label{font-weight:700;font-size:0.85rem;border-bottom:1px solid #ddd;padding-bottom:0.4rem;margin-bottom:0.8rem;}
        .signature-row{margin-bottom:0.6rem;}
        .signature-row label{display:block;font-size:0.75rem;font-weight:600;color:#555;text-transform:uppercase;margin-bottom:0.2rem;}
        .signature-name-display{font-family:'Dancing Script','Brush Script MT',cursive;font-size:1.4rem;color:#5B1A6B;border-bottom:1px solid #333;min-height:1.8rem;padding:0.1rem 0;}
        .signature-name-input,.contractor-sign-area{display:none;}
        .signature-date-display{font-size:0.85rem;border-bottom:1px solid #ccc;min-height:1.2rem;padding:0.1rem 0;max-width:220px;}
        .doc-status-banner,.contract-action-bar{display:none;}
    </style>
    </head><body>${bdStaticHTML(body)}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
}
