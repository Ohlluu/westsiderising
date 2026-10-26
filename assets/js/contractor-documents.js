// Contractor Documents
// Transcribed from WESTSIDE_RISING_Contractor_Agreement_Fillable.pdf, field names
// kept identical to the PDF's form fields so the two stay traceable.
//
// Shared helpers (bdEscape, bdField, bdDateField, bdStaticHTML, bdDownloadPDF…)
// come from board-documents.js, which must load first.

const CONTRACTOR_DOCS = [
    { id: 'service', label: 'Service Agreement',       wrCountersign: true  },
    { id: 'nda',     label: 'Non-Disclosure Agreement', wrCountersign: false },
    { id: 'coi',     label: 'Conflict of Interest',     wrCountersign: true  },
];

function contractorDocLabel(docId) {
    const d = CONTRACTOR_DOCS.find(x => x.id === docId);
    return d ? d.label : docId;
}

function contractorDocNeedsWR(docId) {
    const d = CONTRACTOR_DOCS.find(x => x.id === docId);
    return !!(d && d.wrCountersign);
}

// ==================== Field Helpers ====================

// Label / field pair, mirroring the two-column rows in the PDF.
function cdRow(label, fieldHtml) {
    return `<div class="doc-row">
        <span class="doc-row-label">${label}</span>
        <span class="doc-row-field">${fieldHtml}</span>
    </div>`;
}

function cdTextArea(id, saved, canEdit, placeholder, rows) {
    const val = bdEscape(saved[id] || '');
    if (!canEdit) {
        return `<div class="doc-field doc-textarea signed-field" id="${id}" data-value="${val}">${val || '&nbsp;'}</div>`;
    }
    return `<textarea class="doc-field doc-textarea" id="${id}" rows="${rows || 4}"
             placeholder="${bdEscape(placeholder || '')}">${val}</textarea>`;
}

// ==================== Dispatch ====================

function buildContractorDocument(docId, saved, canEdit) {
    switch (docId) {
        case 'service': return buildContractorServiceAgreement(saved, canEdit);
        case 'nda':     return buildContractorNDA(saved, canEdit);
        case 'coi':     return buildContractorCOI(saved, canEdit);
        default:        return '<p>Unknown document.</p>';
    }
}

// ==================== 1. Contractors Service Agreement ====================

function buildContractorServiceAgreement(saved, canEdit) {
    return `
    <div class="doc-title">CONTRACTORS SERVICE AGREEMENT</div>
    <div class="doc-subtitle">Contractor information and scope of services</div>

    <p class="doc-paragraph">Thank you for supporting Westside Rising as a contractor. Supporting contractors play a critical role in advancing our mission of strengthening Chicago's West Side communities through leadership, advocacy, and community investment.</p>

    <p class="doc-paragraph">This agreement provides a snapshot of the contracted relationship. Accompanying documents outline goods/services and expectations for both parties during the agreement.</p>

    <div class="doc-rows">
        ${cdRow('Agreement effective date', bdDateField('service_effective_date', saved, canEdit))}
        ${cdRow('Contractor / individual name', bdField('contractor_name', saved, canEdit, 'Full name', 'doc-field-wide'))}
        ${cdRow('Company name (or N/A)', bdField('company_name', saved, canEdit, 'Company name or N/A', 'doc-field-wide'))}
        ${cdRow('Street address', bdField('contractor_address', saved, canEdit, 'Street, city, state, ZIP', 'doc-field-wide'))}
        ${cdRow('Phone', bdField('contractor_phone', saved, canEdit, 'Phone number'))}
        ${cdRow('Email', bdField('contractor_email', saved, canEdit, 'Email address', 'doc-field-wide'))}
        ${cdRow('Agreement entered on (date)', bdDateField('agreement_entered_date', saved, canEdit))}
    </div>

    <div class="doc-section-heading doc-heading-accent">Brief description of services (2&ndash;3 sentences):</div>
    ${cdTextArea('services_description', saved, canEdit, 'Describe the goods or services you will provide.', 5)}

    <p class="doc-paragraph">I understand that submitting this form does not authorize work or guarantee payment. This agreement is approved and in effect once signed by both parties.</p>

    <p class="doc-paragraph">By signing and submitting, I acknowledge these terms and consent to using electronic records and signatures for this submission.</p>
    `;
}

// ==================== 2. Non-Disclosure Agreement ====================

function buildContractorNDA(saved, canEdit) {
    return `
    <div class="doc-title">NON-DISCLOSURE AGREEMENT</div>
    <div class="doc-subtitle">Confidentiality obligations for contracted services</div>

    <div class="doc-rows">
        ${cdRow('Effective date', bdDateField('nda_effective_date', saved, canEdit))}
        ${cdRow('Contractor name', bdField('nda_contractor_name', saved, canEdit, 'Full name', 'doc-field-wide'))}
        ${cdRow('Company name (or N/A)', bdField('nda_company_name', saved, canEdit, 'Company name or N/A', 'doc-field-wide'))}
    </div>

    <p class="doc-paragraph">WESTSIDE RISING, an Illinois not-for-profit corporation located in Chicago, Illinois (Organization), and the Contractor identified above agree that the Contractor will protect nonpublic information accessed while providing services.</p>

    <p class="doc-paragraph">Confidential Information includes participant and personnel information, donor records, financial information, contracts, strategic plans, internal discussions, technical information, and confidential third-party information.</p>

    <p class="doc-paragraph">The Contractor will use confidential information only to perform authorized services, apply reasonable safeguards, and disclose it only to persons authorized by the Organization who need access and are bound by equivalent confidentiality obligations.</p>

    <p class="doc-paragraph">Upon request or completion of services, the Contractor will promptly return or securely destroy confidential materials and, if requested, certify compliance within ten days; legally required retained copies remain protected.</p>

    <p class="doc-paragraph">These obligations continue for five years after services end, and trade secrets remain protected for as long as they qualify as trade secrets under applicable law. Nothing prohibits legally required disclosures or protected reporting; when legally permitted, the Contractor will give advance notice of compelled disclosure and disclose only what is required.</p>

    <p class="doc-paragraph">Illinois law governs this Agreement; the Organization may seek available legal remedies, including injunctive relief.</p>
    `;
}

// ==================== 3. Contractor Conflict of Interest ====================

function buildContractorCOI(saved, canEdit) {
    return `
    <div class="doc-title">CONTRACTOR CONFLICT OF INTEREST AGREEMENT</div>
    <div class="doc-subtitle">Disclosure and acknowledgement</div>

    <div class="doc-rows">
        ${cdRow('Effective date', bdDateField('coi_effective_date', saved, canEdit))}
        ${cdRow('Contractor name', bdField('coi_contractor_name', saved, canEdit, 'Full name', 'doc-field-wide'))}
        ${cdRow('Company name (or N/A)', bdField('coi_company_name', saved, canEdit, 'Company name or N/A', 'doc-field-wide'))}
    </div>

    <p class="doc-paragraph">WESTSIDE RISING (Organization) and the Contractor identified above agree that the Contractor will provide services honestly and disclose any actual, potential, or reasonably perceived conflict that could affect impartial performance or decisions made concerning the Organization.</p>

    <p class="doc-paragraph">The Contractor will not use the Organization's confidential information, funds, property, or relationships for unauthorized personal benefit, accept gifts or payments intended to influence decisions, or participate in selecting or approving transactions from which the Contractor or a related person would benefit without disclosure and appropriate authorization.</p>

    <p class="doc-paragraph">Work with other organizations is not automatically prohibited, but conflicts affecting this engagement must be disclosed and managed. Failure to comply may result in corrective action or termination consistent with the services contract and applicable law.</p>

    <p class="doc-paragraph">Illinois law governs this Agreement, and neither this Agreement nor approval of a conflict authorizes otherwise unlawful conduct.</p>

    <div class="doc-section-heading doc-heading-accent">Current disclosures (enter "None" if none):</div>
    ${cdTextArea('coi_disclosures', saved, canEdit, 'Enter "None" if you have nothing to disclose.', 4)}

    <div class="doc-rows">
        ${cdRow('Contractor / representative', bdField('coi_representative', saved, canEdit, 'Name and title', 'doc-field-wide'))}
    </div>
    `;
}
