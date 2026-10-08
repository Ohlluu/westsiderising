// Board of Directors — Document Signing Page (board.html)
//
// Access model: this page is not linked from anywhere on the site. Each director
// receives a private link containing their own single-use access code. The code is
// the document ID in `boardMembers`, so it acts as an unguessable capability —
// Firestore rules grant anonymous users `get` (single document) but never `list`,
// so codes cannot be enumerated.
//
// Auth: directors have no accounts. We sign in with Firebase Anonymous Auth purely
// to satisfy `request.auth != null` in the rules. This runs on a SECONDARY Firebase
// app instance with SESSION persistence so the anonymous session never leaks into
// the staff portal's LOCAL-persistence session on time-clock.html.

const boardFirebaseConfig = {
    apiKey: "AIzaSyAhlVGI_uyVoNGVaTHhEE5QgiRqC5VOnVc",
    authDomain: "westside-rising.firebaseapp.com",
    projectId: "westside-rising",
    storageBucket: "westside-rising.firebasestorage.app",
    messagingSenderId: "444755248691",
    appId: "1:444755248691:web:5e9fea91b2d088096ec546",
    measurementId: "G-0Z08M3RW6T"
};

const boardApp = firebase.initializeApp(boardFirebaseConfig, 'board');
const boardAuth = boardApp.auth();
const boardDb = boardApp.firestore();

boardAuth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(err => {
    console.error('Board auth persistence error:', err);
});

// ==================== State ====================

let boardCode = null;        // access code === boardMembers doc id
let boardMember = null;      // { name, revoked, ... }
let boardData = { documents: {} };
let boardCurrentDoc = BOARD_DOCS[0].id;

// ==================== Entry Point ====================

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = (params.get('c') || '').trim();

    const form = document.getElementById('board-code-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const entered = document.getElementById('board-code-input').value.trim();
            if (!entered) {
                showCodeError('Please enter your access code.');
                return;
            }
            unlockBoardPortal(entered);
        });
    }

    if (codeFromUrl) {
        // Strip the code from the address bar so it is not left in history or
        // leaked via the Referer header on any outbound link.
        window.history.replaceState({}, document.title, window.location.pathname);
        unlockBoardPortal(codeFromUrl);
    } else {
        showGate();
    }
});

function showGate() {
    document.getElementById('board-gate').style.display = 'block';
    document.getElementById('board-loading').style.display = 'none';
    document.getElementById('board-portal').style.display = 'none';
}

function showCodeError(msg) {
    const el = document.getElementById('board-code-error');
    el.textContent = msg;
    el.style.display = 'block';
    const btn = document.getElementById('board-code-submit');
    if (btn) { btn.disabled = false; btn.textContent = 'Continue'; }
}

// ==================== Unlock ====================

async function unlockBoardPortal(code) {
    const btn = document.getElementById('board-code-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Verifying…'; }

    document.getElementById('board-gate').style.display = 'none';
    document.getElementById('board-loading').style.display = 'block';

    try {
        await boardAuth.signInAnonymously();

        const snap = await boardDb.collection('boardMembers').doc(code).get();
        if (!snap.exists) {
            showGate();
            showCodeError('That access code was not recognized. Please check the link you were sent.');
            return;
        }

        const member = snap.data();
        if (member.revoked === true) {
            showGate();
            showCodeError('This access code is no longer active. Please contact Westside Rising.');
            return;
        }

        boardCode = code;
        boardMember = member;

        const contractSnap = await boardDb.collection('boardContracts').doc(code).get();
        boardData = contractSnap.exists ? contractSnap.data() : { documents: {} };
        if (!boardData.documents) boardData.documents = {};

        renderBoardPortal();
    } catch (err) {
        console.error('Board unlock error:', err);
        showGate();
        showCodeError('We could not verify your access code. Please try again, or contact Westside Rising.');
    }
}

// ==================== Portal Shell ====================

function renderBoardPortal() {
    document.getElementById('board-loading').style.display = 'none';
    document.getElementById('board-gate').style.display = 'none';

    const portal = document.getElementById('board-portal');
    portal.style.display = 'block';

    const signedCount = BOARD_DOCS.filter(d => boardData.documents[d.id]?.signed).length;
    const allSigned = signedCount === BOARD_DOCS.length;

    portal.innerHTML = `
        <div class="board-container">
            <div class="board-header">
                <div>
                    <div class="board-welcome">Welcome, ${bdEscape(boardMember.name || 'Board Member')}</div>
                    <div class="board-subtitle">Westside Rising &bull; Board of Directors Documents</div>
                </div>
                <div class="board-progress ${allSigned ? 'complete' : ''}">
                    ${allSigned
                        ? '<i class="fas fa-check-circle"></i> All documents signed'
                        : `${signedCount} of ${BOARD_DOCS.length} signed`}
                </div>
            </div>

            ${allSigned ? `
                <div class="board-banner complete">
                    <i class="fas fa-check-circle"></i>
                    Thank you. All of your documents have been signed and submitted to Westside Rising.
                    You may print a copy of any document for your records.
                </div>` : `
                <div class="board-banner">
                    <i class="fas fa-info-circle"></i>
                    Please review and sign each document below. You can complete these over multiple
                    visits using the same link, and your entries are saved as you go.
                </div>`}

            <div class="doc-tabs" id="board-doc-tabs"></div>
            <div id="board-doc-content"></div>
        </div>
    `;

    renderBoardTabs();
    renderBoardDocument(boardCurrentDoc);
}

function renderBoardTabs() {
    const tabs = document.getElementById('board-doc-tabs');
    if (!tabs) return;

    tabs.innerHTML = BOARD_DOCS.map(d => {
        const signed = !!boardData.documents[d.id]?.signed;
        const icon = signed ? '<i class="fas fa-check-circle doc-tab-check"></i>' : '';
        return `<button class="doc-tab-btn ${d.id === boardCurrentDoc ? 'active' : ''}"
                    onclick="switchBoardDoc('${d.id}')">${icon}${d.label}</button>`;
    }).join('');
}

function switchBoardDoc(docId) {
    boardCurrentDoc = docId;
    renderBoardTabs();
    renderBoardDocument(docId);
}

// ==================== Document Rendering ====================

function renderBoardDocument(docId) {
    const content = document.getElementById('board-doc-content');
    if (!content) return;

    const docData = boardData.documents[docId] || {};
    const signed = !!docData.signed;
    const saved = docData.fields || {};
    const sig = docData.signature || {};

    const banner = signed
        ? `<div class="doc-status-banner fully-signed"><i class="fas fa-lock"></i> Signed on ${formatBoardDate(sig.date)}. This document is locked.</div>`
        : `<div class="doc-status-banner pending-staff"><i class="fas fa-pen"></i> Complete the highlighted fields, then sign at the bottom.</div>`;

    content.innerHTML = `
        <div class="document-card">
            ${banner}
            <div class="document-body">
                ${buildBoardDocument(docId, saved, !signed)}
                ${renderBoardSignatureBlock(docId, sig, signed)}
            </div>
            <div class="contract-action-bar">
                ${renderBoardActions(docId, signed)}
            </div>
        </div>
    `;

    const printBtn = content.querySelector('.print-doc-btn');
    if (printBtn) printBtn.addEventListener('click', () => printBoardDocument(docId));

    if (!signed) {
        content.querySelectorAll('.doc-field').forEach(input => {
            input.addEventListener('change', () => autoSaveBoardFields(docId));
            input.addEventListener('blur', () => autoSaveBoardFields(docId));
        });
    }
}

function renderBoardSignatureBlock(docId, sig, signed) {
    const display = signed
        ? `<div class="signature-name-display">${bdEscape(sig.name)}</div>`
        : `<input class="signature-name-input" id="board-sig-input" placeholder="Type your full name to sign" autocomplete="off">`;

    const dateDisplay = signed ? formatBoardDate(sig.date) : '';

    return `
        <div class="signature-block">
            <div class="signature-party single">
                <div class="signature-party-label">BOARD MEMBER</div>
                <div class="signature-row">
                    <label>Signature</label>
                    ${display}
                </div>
                <div class="signature-row">
                    <label>Date</label>
                    <div class="signature-date-display">${dateDisplay}</div>
                </div>
            </div>
            ${signed ? '<div style="margin-top:1rem;"><span class="signature-locked-badge"><i class="fas fa-lock"></i> Signed and Locked</span></div>' : ''}
        </div>
    `;
}

function renderBoardActions(docId, signed) {
    const printBtn = `<button class="contract-save-btn print-doc-btn"><i class="fas fa-print"></i> Print / Save PDF</button>`;
    if (signed) {
        return `${printBtn}<div class="contract-locked-notice"><i class="fas fa-check-circle"></i> Signed and submitted</div>`;
    }
    return `
        ${printBtn}
        <button class="contract-save-btn" onclick="autoSaveBoardFields('${docId}')"><i class="fas fa-save"></i> Save Progress</button>
        <button class="contract-sign-btn" onclick="submitBoardSignature('${docId}')"><i class="fas fa-pen-nib"></i> Sign Document</button>
    `;
}

// ==================== Saving & Signing ====================

function collectBoardFields() {
    const fields = {};
    document.querySelectorAll('#board-doc-content .doc-field').forEach(el => {
        if (!el.id) return;
        fields[el.id] = el.tagName === 'INPUT' ? el.value : (el.dataset.value || '');
    });
    return fields;
}

async function autoSaveBoardFields(docId) {
    if (!boardCode) return;
    if (boardData.documents[docId]?.signed) return;  // never touch a signed document

    const fields = collectBoardFields();
    try {
        await boardDb.collection('boardContracts').doc(boardCode).set({
            memberName: boardMember.name || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            documents: { [docId]: { fields } }
        }, { merge: true });

        boardData.documents[docId] = Object.assign({}, boardData.documents[docId], { fields });
    } catch (err) {
        console.error('Board auto-save error:', err);
    }
}

async function submitBoardSignature(docId) {
    const sigInput = document.getElementById('board-sig-input');
    if (!sigInput || !sigInput.value.trim()) {
        alert('Please type your full name in the signature field before signing.');
        return;
    }

    const typedName = sigInput.value.trim();
    const confirmed = confirm(
        `You are about to sign the ${boardDocLabel(docId)} as ${typedName}.\n\n` +
        `By signing, you confirm that you have read and agree to this document. ` +
        `This action cannot be undone.`
    );
    if (!confirmed) return;

    const fields = collectBoardFields();
    const signedAt = new Date().toISOString();

    try {
        await boardDb.collection('boardContracts').doc(boardCode).set({
            memberName: boardMember.name || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            documents: {
                [docId]: {
                    fields,
                    signed: true,
                    signature: {
                        name: typedName,
                        date: signedAt,
                        userAgent: navigator.userAgent
                    }
                }
            }
        }, { merge: true });

        boardData.documents[docId] = {
            fields,
            signed: true,
            signature: { name: typedName, date: signedAt }
        };

        renderBoardPortal();
        switchBoardDoc(docId);
    } catch (err) {
        console.error('Board signature error:', err);
        alert('We could not save your signature. Please check your connection and try again.');
    }
}

// ==================== Print ====================

function printBoardDocument(docId) {
    const body = document.querySelector('#board-doc-content .document-body');
    if (!body) return;

    const win = window.open('', '_blank');
    if (!win) {
        alert('Please allow popups for this site to print documents.');
        return;
    }

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${bdEscape(boardDocLabel(docId))} — ${bdEscape(boardMember.name || '')}</title>
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
        .doc-checklist li{margin-bottom:0.3rem;}
        .doc-checklist li:before{content:"\\2610  ";}
        .doc-field{display:inline-block;border:none;border-bottom:1px solid #333;background:transparent;font-family:inherit;font-size:inherit;color:#222;min-width:140px;padding:0 2px;}
        .doc-field-wide{min-width:260px;}
        .doc-field-block{display:block;width:100%;margin-bottom:0.6rem;min-height:1.4rem;}
        .doc-disclosure-box{border:1px solid #999;padding:0.8rem;margin-bottom:1rem;}
        .doc-closing{margin-top:2rem;}
        .signature-block{margin-top:2rem;padding-top:1.2rem;border-top:2px solid #ddd;page-break-inside:avoid;}
        .signature-party-label{font-weight:700;font-size:0.85rem;border-bottom:1px solid #ddd;padding-bottom:0.4rem;margin-bottom:0.8rem;}
        .signature-row{margin-bottom:0.6rem;}
        .signature-row label{display:block;font-size:0.75rem;font-weight:600;color:#555;text-transform:uppercase;margin-bottom:0.2rem;}
        .signature-name-display{font-family:'Dancing Script','Brush Script MT',cursive;font-size:1.4rem;color:#1a1a4e;border-bottom:1px solid #333;min-height:1.8rem;padding:0.1rem 0;}
        .signature-name-input{display:none;}
        .signature-date-display{font-size:0.85rem;border-bottom:1px solid #ccc;min-height:1.2rem;padding:0.1rem 0;max-width:220px;}
        .signature-locked-badge,.doc-status-banner,.contract-action-bar{display:none;}
    </style>
    </head><body>${body.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
}

// ==================== Helpers ====================

function formatBoardDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
}
