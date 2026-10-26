// Contractor Document Signing Page (contractor.html)
//
// The source PDF is one 3-page document, so this renders as one continuous
// document rather than separate tabs: Service Agreement, NDA, Conflict of
// Interest, each with its own signature block, and a single sign action at the
// bottom that executes all three.
//
// Storage still keys sections as service / nda / coi so the Firestore rules can
// freeze each one independently.
//
// Access model matches the board portal: unlisted page, one private code per
// contractor, code is the document ID. Anonymous Auth exists only to satisfy
// `request.auth != null`.

const contractorFirebaseConfig = {
    apiKey: "AIzaSyAhlVGI_uyVoNGVaTHhEE5QgiRqC5VOnVc",
    authDomain: "westside-rising.firebaseapp.com",
    projectId: "westside-rising",
    storageBucket: "westside-rising.firebasestorage.app",
    messagingSenderId: "444755248691",
    appId: "1:444755248691:web:5e9fea91b2d088096ec546",
    measurementId: "G-0Z08M3RW6T"
};

const contractorApp = firebase.initializeApp(contractorFirebaseConfig, 'contractor');
const contractorAuth = contractorApp.auth();
const contractorDb = contractorApp.firestore();

contractorAuth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(err => {
    console.error('Contractor auth persistence error:', err);
});

const CONTRACTOR_CODE_KEY = 'wr_contractor_code';

let contractorCode = null;
let contractorMember = null;
let contractorData = { documents: {} };

// ==================== Entry Point ====================

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = (params.get('c') || '').trim();

    const form = document.getElementById('contractor-code-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const entered = document.getElementById('contractor-code-input').value.trim();
            if (!entered) {
                showContractorCodeError('Please enter your access code.');
                return;
            }
            unlockContractorPortal(entered);
        });
    }

    if (codeFromUrl) {
        window.history.replaceState({}, document.title, window.location.pathname);
        unlockContractorPortal(codeFromUrl);
        return;
    }

    let storedCode = null;
    try {
        storedCode = sessionStorage.getItem(CONTRACTOR_CODE_KEY);
    } catch (e) { /* private browsing can block sessionStorage */ }

    if (storedCode) {
        unlockContractorPortal(storedCode);
    } else {
        showContractorGate();
    }
});

function rememberContractorCode(code) {
    try { sessionStorage.setItem(CONTRACTOR_CODE_KEY, code); } catch (e) { /* non-fatal */ }
}

function forgetContractorCode() {
    try { sessionStorage.removeItem(CONTRACTOR_CODE_KEY); } catch (e) { /* non-fatal */ }
}

function showContractorGate() {
    document.getElementById('contractor-gate').style.display = 'block';
    document.getElementById('contractor-loading').style.display = 'none';
    document.getElementById('contractor-portal').style.display = 'none';
}

function showContractorCodeError(msg) {
    const el = document.getElementById('contractor-code-error');
    el.textContent = msg;
    el.style.display = 'block';
    const btn = document.getElementById('contractor-code-submit');
    if (btn) { btn.disabled = false; btn.textContent = 'Continue'; }
}

// ==================== Unlock ====================

async function unlockContractorPortal(code) {
    const btn = document.getElementById('contractor-code-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Verifying…'; }

    document.getElementById('contractor-gate').style.display = 'none';
    document.getElementById('contractor-loading').style.display = 'block';

    try {
        await contractorAuth.signInAnonymously();

        const snap = await contractorDb.collection('contractorMembers').doc(code).get();
        if (!snap.exists) {
            forgetContractorCode();
            showContractorGate();
            showContractorCodeError('That access code was not recognized. Please check the link you were sent.');
            return;
        }

        const member = snap.data();
        if (member.revoked === true) {
            forgetContractorCode();
            showContractorGate();
            showContractorCodeError('This access code is no longer active. Please contact Westside Rising.');
            return;
        }

        contractorCode = code;
        contractorMember = member;
        rememberContractorCode(code);

        const contractSnap = await contractorDb.collection('contractorContracts').doc(code).get();
        contractorData = contractSnap.exists ? contractSnap.data() : { documents: {} };
        if (!contractorData.documents) contractorData.documents = {};

        renderContractorPortal();
    } catch (err) {
        console.error('Contractor unlock error:', err);
        showContractorGate();
        showContractorCodeError('We could not verify your access code. Please try again, or contact Westside Rising.');
    }
}

// ==================== State Helpers ====================

// The packet is signed as a unit, so the Service Agreement's state speaks for all.
function contractorHasSigned() {
    return !!contractorData.documents?.service?.contractorSigned;
}

function contractorWRHasSigned() {
    return !!contractorData.documents?.service?.wrSigned;
}

function contractorSectionData(docId) {
    return contractorData.documents?.[docId] || {};
}

// ==================== Portal ====================

function renderContractorPortal() {
    document.getElementById('contractor-loading').style.display = 'none';
    document.getElementById('contractor-gate').style.display = 'none';

    const portal = document.getElementById('contractor-portal');
    portal.style.display = 'block';

    const signed = contractorHasSigned();
    const wrSigned = contractorWRHasSigned();

    let statusChip, banner;
    if (signed && wrSigned) {
        statusChip = '<i class="fas fa-check-circle"></i> Fully executed';
        banner = `<div class="contractor-banner complete">
            <i class="fas fa-check-circle"></i>
            This agreement is fully executed. Westside Rising countersigned on
            ${formatContractorDate(contractorSectionData('service').wrSignature?.date)}.
            You can print or download a copy for your records.
        </div>`;
    } else if (signed) {
        statusChip = '<i class="fas fa-clock"></i> Awaiting Westside Rising';
        banner = `<div class="contractor-banner complete">
            <i class="fas fa-check-circle"></i>
            Thank you. You signed on ${formatContractorDate(contractorSectionData('service').contractorSignature?.date)}.
            The Service Agreement and Conflict of Interest take effect once Westside Rising countersigns.
        </div>`;
    } else {
        statusChip = 'Not yet signed';
        banner = `<div class="contractor-banner">
            <i class="fas fa-info-circle"></i>
            This is one agreement in three parts. Please read all three, complete the
            highlighted fields, then sign once at the bottom. Your entries save as you go,
            so you can finish later using the same link.
        </div>`;
    }

    portal.innerHTML = `
        <div class="contractor-container">
            <div class="contractor-header">
                <div>
                    <div class="contractor-welcome">Welcome, ${bdEscape(contractorMember.name || 'Contractor')}</div>
                    <div class="contractor-subtitle">Westside Rising &bull; Contractor Agreement</div>
                </div>
                <div class="contractor-progress ${signed && wrSigned ? 'complete' : ''}">${statusChip}</div>
            </div>

            ${banner}

            <div class="document-card">
                <div class="document-body" id="contractor-doc-body">
                    ${renderContractorPacket(!signed)}
                </div>
                <div class="contract-action-bar">
                    ${renderContractorActions(signed)}
                </div>
            </div>
        </div>
    `;

    const printBtn = portal.querySelector('.print-doc-btn');
    if (printBtn) printBtn.addEventListener('click', printContractorPacket);

    const downloadBtn = portal.querySelector('.download-doc-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const body = document.getElementById('contractor-doc-body');
            bdDownloadPDF(body, bdFilename('Contractor Agreement', contractorMember.name, 'pdf'), downloadBtn);
        });
    }

    if (!signed) {
        portal.querySelectorAll('.doc-field').forEach(el => {
            el.addEventListener('change', autoSaveContractorFields);
            el.addEventListener('blur', autoSaveContractorFields);
        });
    }
}

// Builds all three sections in PDF page order, each followed by its signature block.
function renderContractorPacket(canEdit) {
    return CONTRACTOR_DOCS.map((d, i) => {
        const data = contractorSectionData(d.id);
        const saved = data.fields || {};
        return `
            ${i > 0 ? '<div class="doc-page-break"></div>' : ''}
            <section class="doc-section" id="section-${d.id}">
                <div class="doc-page-label">Page ${i + 1} of ${CONTRACTOR_DOCS.length}</div>
                ${buildContractorDocument(d.id, saved, canEdit)}
                ${renderContractorSectionSignature(d, data)}
            </section>
        `;
    }).join('');
}

function renderContractorSectionSignature(doc, data) {
    const signed = !!data.contractorSigned;
    const wrSigned = !!data.wrSigned;
    const sig = data.contractorSignature || {};
    const wrSig = data.wrSignature || {};

    const pending = '<div class="signature-name-display" style="color:#bbb;font-size:1rem;">Pending</div>';

    const contractorParty = `
        <div class="signature-party">
            <div class="signature-party-label">CONTRACTOR</div>
            <div class="signature-row">
                <label>Signature (typed)</label>
                ${signed ? `<div class="signature-name-display">${bdEscape(sig.name)}</div>` : pending}
            </div>
            <div class="signature-row">
                <label>Date signed</label>
                <div class="signature-date-display">${signed ? formatContractorDate(sig.date) : ''}</div>
            </div>
        </div>
    `;

    const wrParty = doc.wrCountersign ? `
        <div class="signature-party">
            <div class="signature-party-label">WESTSIDE RISING</div>
            <div class="signature-row">
                <label>Authorized signature (typed)</label>
                ${wrSigned ? `<div class="signature-name-display">${bdEscape(wrSig.name)}</div>` : pending}
            </div>
            <div class="signature-row">
                <label>Date</label>
                <div class="signature-date-display">${wrSigned ? formatContractorDate(wrSig.date) : ''}</div>
            </div>
            ${wrSigned && wrSig.nameTitle ? `<div class="signature-row"><label>Name &amp; Title</label><div class="signature-date-display">${bdEscape(wrSig.nameTitle)}</div></div>` : ''}
        </div>
    ` : '';

    return `
        <div class="signature-block">
            <div class="${doc.wrCountersign ? 'signature-grid' : ''}">
                ${contractorParty}
                ${wrParty}
            </div>
        </div>
    `;
}

function renderContractorActions(signed) {
    const printBtn = `<button class="contract-save-btn print-doc-btn"><i class="fas fa-print"></i> Print</button>`;
    const downloadBtn = `<button class="contract-save-btn download-doc-btn"><i class="fas fa-download"></i> Download PDF</button>`;

    if (signed) {
        return `${printBtn}${downloadBtn}<div class="contract-locked-notice"><i class="fas fa-check-circle"></i> Signed and submitted</div>`;
    }

    return `
        <div class="contractor-sign-area">
            <label for="contractor-sig-input">Sign all three documents</label>
            <input class="signature-name-input" id="contractor-sig-input"
                   placeholder="Type your full name to sign" autocomplete="off">
            <p class="contractor-sign-note">
                By signing, you confirm you have read and agree to the Service Agreement,
                Non-Disclosure Agreement, and Conflict of Interest Agreement above, and you
                consent to the use of electronic records and signatures.
            </p>
        </div>
        <div class="contractor-action-buttons">
            ${printBtn}
            ${downloadBtn}
            <button class="contract-save-btn" onclick="autoSaveContractorFields()"><i class="fas fa-save"></i> Save Progress</button>
            <button class="contract-sign-btn" onclick="submitContractorSignature()"><i class="fas fa-pen-nib"></i> Sign &amp; Submit</button>
        </div>
    `;
}

// ==================== Saving & Signing ====================

// Collects every field on the page and sorts it back into its own section, so one
// save writes all three without the contractor having to switch anywhere.
const CONTRACTOR_FIELD_SECTION = {
    service: ['service_effective_date', 'contractor_name', 'company_name', 'contractor_address',
              'contractor_phone', 'contractor_email', 'agreement_entered_date', 'services_description'],
    nda:     ['nda_effective_date', 'nda_contractor_name', 'nda_company_name'],
    coi:     ['coi_effective_date', 'coi_contractor_name', 'coi_company_name',
              'coi_disclosures', 'coi_representative'],
};

function collectContractorSections() {
    const byId = {};
    document.querySelectorAll('#contractor-doc-body .doc-field').forEach(el => {
        if (!el.id) return;
        const isControl = el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA';
        byId[el.id] = isControl ? el.value : (el.dataset.value || '');
    });

    const sections = {};
    for (const [docId, ids] of Object.entries(CONTRACTOR_FIELD_SECTION)) {
        const fields = {};
        ids.forEach(id => { if (id in byId) fields[id] = byId[id]; });
        sections[docId] = fields;
    }
    return sections;
}

async function autoSaveContractorFields() {
    if (!contractorCode || contractorHasSigned()) return;

    const sections = collectContractorSections();
    const payload = { documents: {} };
    for (const [docId, fields] of Object.entries(sections)) {
        payload.documents[docId] = { fields };
    }
    payload.contractorName = contractorMember.name || '';
    payload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    try {
        await contractorDb.collection('contractorContracts').doc(contractorCode).set(payload, { merge: true });
        for (const [docId, fields] of Object.entries(sections)) {
            contractorData.documents[docId] = Object.assign({}, contractorData.documents[docId], { fields });
        }
    } catch (err) {
        console.error('Contractor auto-save error:', err);
    }
}

const CONTRACTOR_REQUIRED = [
    ['service_effective_date', 'Agreement effective date'],
    ['contractor_name',        'Contractor / individual name'],
    ['contractor_address',     'Street address'],
    ['contractor_phone',       'Phone'],
    ['contractor_email',       'Email'],
    ['services_description',   'Brief description of services'],
    ['nda_effective_date',     'Effective date (Non-Disclosure Agreement)'],
    ['nda_contractor_name',    'Contractor name (Non-Disclosure Agreement)'],
    ['coi_effective_date',     'Effective date (Conflict of Interest)'],
    ['coi_contractor_name',    'Contractor name (Conflict of Interest)'],
    ['coi_disclosures',        'Current disclosures (enter "None" if none)'],
    ['coi_representative',     'Contractor / representative'],
];

async function submitContractorSignature() {
    const sigInput = document.getElementById('contractor-sig-input');
    if (!sigInput || !sigInput.value.trim()) {
        alert('Please type your full name in the signature field before signing.');
        if (sigInput) sigInput.focus();
        return;
    }

    for (const [id, label] of CONTRACTOR_REQUIRED) {
        const el = document.getElementById(id);
        if (!el || !String(el.value || '').trim()) {
            alert(`Please complete "${label}" before signing.`);
            if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
            return;
        }
    }

    const typedName = sigInput.value.trim();
    if (!confirm(
        `You are about to sign all three documents as ${typedName}:\n\n` +
        `  • Contractors Service Agreement\n` +
        `  • Non-Disclosure Agreement\n` +
        `  • Contractor Conflict of Interest Agreement\n\n` +
        `This cannot be undone. The Service Agreement and Conflict of Interest take ` +
        `effect once Westside Rising countersigns them.`
    )) return;

    const sections = collectContractorSections();
    const signedAt = new Date().toISOString();
    const signature = { name: typedName, date: signedAt, userAgent: navigator.userAgent };

    const payload = {
        contractorName: contractorMember.name || '',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        documents: {}
    };
    for (const [docId, fields] of Object.entries(sections)) {
        payload.documents[docId] = {
            fields,
            contractorSigned: true,
            contractorSignature: signature
        };
    }

    try {
        await contractorDb.collection('contractorContracts').doc(contractorCode).set(payload, { merge: true });

        for (const [docId, fields] of Object.entries(sections)) {
            contractorData.documents[docId] = Object.assign({}, contractorData.documents[docId], {
                fields,
                contractorSigned: true,
                contractorSignature: { name: typedName, date: signedAt }
            });
        }

        renderContractorPortal();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        console.error('Contractor signature error:', err);
        alert('We could not save your signature. Please check your connection and try again.');
    }
}

// ==================== Print ====================

function contractorPrintStyles() {
    return `
        body{font-family:Arial,Helvetica,sans-serif;padding:2rem 3rem;color:#222;font-size:11pt;line-height:1.7;margin:0;}
        .doc-section{page-break-after:always;}
        .doc-section:last-child{page-break-after:auto;}
        .doc-page-break{display:none;}
        .doc-page-label{display:none;}
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
        .signature-name-input,.contractor-sign-area,.contractor-action-buttons{display:none;}
        .signature-date-display{font-size:0.85rem;border-bottom:1px solid #ccc;min-height:1.2rem;padding:0.1rem 0;max-width:220px;}
        .doc-status-banner,.contract-action-bar{display:none;}
    `;
}

function printContractorPacket() {
    const body = document.getElementById('contractor-doc-body');
    if (!body) return;

    const win = window.open('', '_blank');
    if (!win) {
        alert('Please allow popups for this site to print documents.');
        return;
    }

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Contractor Agreement — ${bdEscape(contractorMember.name || '')}</title>
    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap" rel="stylesheet">
    <style>${contractorPrintStyles()}</style>
    </head><body>${bdStaticHTML(body)}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
}

// ==================== Helpers ====================

function formatContractorDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
}
