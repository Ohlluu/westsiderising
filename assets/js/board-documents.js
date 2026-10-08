// Board of Directors — Document Definitions
// Shared by board.html (director signing page) and the BOD tab (superadmin view).
//
// Each document is a builder function returning HTML. Fields are produced by
// bdField() so they render as inputs when editable and as plain filled-in text
// once signed. To add a document: write a builder, add an entry to BOARD_DOCS.

const BOARD_DOCS = [
    { id: 'bsa',    label: 'Board Member Service Agreement' },
    { id: 'nda',    label: 'Non-Disclosure Agreement' },
    { id: 'coi',    label: 'Conflict of Interest Agreement' },
];

function boardDocLabel(docId) {
    const d = BOARD_DOCS.find(x => x.id === docId);
    return d ? d.label : docId;
}

// ==================== Field Helper ====================

function bdEscape(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function bdField(id, saved, canEdit, placeholder, extraClass) {
    const val = bdEscape(saved[id] || '');
    const cls = `doc-field${extraClass ? ' ' + extraClass : ''}`;
    if (!canEdit) {
        return `<span class="${cls} signed-field" id="${id}" data-value="${val}">${val || '&nbsp;'}</span>`;
    }
    return `<input class="${cls}" id="${id}" value="${val}" placeholder="${bdEscape(placeholder || '________________')}" autocomplete="off">`;
}

// Dates use a native picker so directors tap a calendar instead of typing a date.
// The stored value is always YYYY-MM-DD; it is only formatted for display.
function bdDateField(id, saved, canEdit) {
    const raw = saved[id] || '';
    if (!canEdit) {
        return `<span class="doc-field doc-date-field signed-field" id="${id}" data-value="${bdEscape(raw)}">${bdEscape(bdFormatDateValue(raw)) || '&nbsp;'}</span>`;
    }
    return `<input type="date" class="doc-field doc-date-field" id="${id}" value="${bdEscape(raw)}">`;
}

const BSA_ROLE_OPTIONS = [
    'Director',
    'President',
    'Vice President',
    'Chairman',
    'Co-chairman',
    'Secretary',
    'Treasurer',
    'Other',
];

// Role picker for the Service Agreement. Choosing "Other" reveals a free-text box.
function bdRoleField(saved, canEdit) {
    const role = saved['bsa_role'] || '';
    const other = saved['bsa_role_other'] || '';

    if (!canEdit) {
        const shown = role === 'Other' ? (other || 'Other') : role;
        return `<span class="doc-field doc-role-field signed-field" id="bsa_role" data-value="${bdEscape(role)}">${bdEscape(shown) || '&nbsp;'}</span>`
             + `<span class="doc-field bd-hidden" id="bsa_role_other" data-value="${bdEscape(other)}"></span>`;
    }

    const options = ['<option value="">Select your role</option>']
        .concat(BSA_ROLE_OPTIONS.map(o =>
            `<option value="${bdEscape(o)}"${o === role ? ' selected' : ''}>${bdEscape(o)}</option>`))
        .join('');

    return `
        <select class="doc-field doc-role-field" id="bsa_role" onchange="bdToggleRoleOther()">${options}</select>
        <span id="bsa_role_other_wrap" class="bd-role-other-wrap${role === 'Other' ? '' : ' bd-hidden'}">
            <input class="doc-field doc-field-wide" id="bsa_role_other" value="${bdEscape(other)}"
                   placeholder="Please specify your role" autocomplete="off">
        </span>
    `;
}

function bdToggleRoleOther() {
    const select = document.getElementById('bsa_role');
    const wrap = document.getElementById('bsa_role_other_wrap');
    if (!select || !wrap) return;
    wrap.classList.toggle('bd-hidden', select.value !== 'Other');
}

// Parsed as local time on purpose. `new Date('2026-06-03')` is treated as UTC and
// renders as June 2 for anyone west of Greenwich, which includes Chicago.
function bdFormatDateValue(value) {
    if (!value) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return value;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
}

// ==================== PDF Download ====================
//
// Renders the on-screen document to a canvas and slices it across A4 pages.
// The result is a visual copy, so its text is not selectable — Print > Save as PDF
// produces selectable text if that matters. This exists because "Download" should
// hand you a file directly instead of routing through a print dialog.

function bdFilename(docLabel, memberName, ext) {
    const slug = s => String(s || '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const parts = [slug(docLabel), slug(memberName)].filter(Boolean);
    return `${parts.join('-')}.${ext}`;
}

// Returns the document's HTML with every <input> replaced by its rendered value.
// Both print and PDF need this: a live `<input type="date">` would otherwise print
// as a calendar widget showing "mm/dd/yyyy" instead of the date the director picked.
function bdStaticHTML(bodyEl) {
    // Read the live values first. cloneNode copies attributes, not current state:
    // a <select> loses whatever the user picked, and a typed-but-unsaved <input>
    // loses its text. Both would otherwise print blank.
    const values = {};
    bodyEl.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id) values[el.id] = el.value;
    });

    const clone = bodyEl.cloneNode(true);

    clone.querySelectorAll('input, select, textarea').forEach(el => {
        const raw = (el.id && el.id in values) ? values[el.id] : el.value;
        const span = document.createElement('span');
        span.className = el.className;
        span.textContent = (el.tagName === 'INPUT' && el.type === 'date')
            ? bdFormatDateValue(raw)
            : raw;
        if (!span.textContent) span.innerHTML = '&nbsp;';
        el.parentNode.replaceChild(span, el);
    });

    clone.querySelectorAll('.doc-status-banner, .contract-action-bar, .bd-hidden').forEach(el => el.remove());
    return clone.innerHTML;
}

async function bdDownloadPDF(bodyEl, filename, btn) {
    if (typeof html2canvas !== 'function' || !window.jspdf || !window.jspdf.jsPDF) {
        alert('The PDF library did not load. Please refresh the page and try again, or use Print and choose "Save as PDF".');
        return;
    }

    const original = btn ? btn.innerHTML : null;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing…';
    }

    // Render off-screen at a fixed width so the PDF does not inherit the
    // viewport width of whatever device the director happens to be using.
    const stage = document.createElement('div');
    stage.style.cssText = 'position:fixed;left:-10000px;top:0;width:820px;background:#fff;padding:40px;';
    stage.className = 'bd-pdf-stage';
    stage.innerHTML = bdStaticHTML(bodyEl);

    document.body.appendChild(stage);

    try {
        const canvas = await html2canvas(stage, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false
        });

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pageW = 210, pageH = 297, margin = 12;
        const usableW = pageW - margin * 2;
        const usableH = pageH - margin * 2;
        const imgH = (canvas.height * usableW) / canvas.width;
        const imgData = canvas.toDataURL('image/jpeg', 0.92);

        pdf.addImage(imgData, 'JPEG', margin, margin, usableW, imgH);

        let heightLeft = imgH - usableH;
        while (heightLeft > 0) {
            pdf.addPage();
            // Shift the same image up so the next slice lands in the page window.
            pdf.addImage(imgData, 'JPEG', margin, margin - (imgH - heightLeft), usableW, imgH);
            heightLeft -= usableH;
        }

        pdf.save(filename);
    } catch (err) {
        console.error('PDF download error:', err);
        alert('We could not build the PDF. Please try Print and choose "Save as PDF" instead.');
    } finally {
        stage.remove();
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
}

// ==================== Document Builder Dispatch ====================

function buildBoardDocument(docId, saved, canEdit) {
    switch (docId) {
        case 'bsa': return buildBoardServiceAgreement(saved, canEdit);
        case 'nda': return buildBoardNDA(saved, canEdit);
        case 'coi': return buildBoardCOI(saved, canEdit);
        default:    return '<p>Unknown document.</p>';
    }
}

// ==================== 1. Board Member Service Agreement ====================
// Source: "Expectation Form.docx" — actual title is
// "Board Member Service Agreement / Commitment & Expectations".

function buildBoardServiceAgreement(saved, canEdit) {
    return `
    <div class="doc-title">BOARD MEMBER SERVICE AGREEMENT</div>
    <div class="doc-subtitle">Commitment &amp; Expectations</div>

    <p class="doc-paragraph">Thank you for your willingness to serve on the Board of Directors for Westside Rising.</p>

    <p class="doc-paragraph">Board members play a critical role in advancing our mission of strengthening Chicago's West Side communities through leadership, advocacy, and community investment. As a board member, you are both a steward of the organization's mission and an ambassador who helps cultivate the relationships and resources necessary for our long-term success.</p>

    <p class="doc-paragraph">The following commitments outline the expectations of all Westside Rising Board Members.</p>

    <div class="doc-section-heading">Fundamental Duties of Board Members</div>
    <div class="doc-sub-heading">(In Accordance with Illinois State Law)</div>

    <div class="doc-sub-heading">1. Duty of Care</div>
    <p class="doc-paragraph">The duty of care requires board members to be actively engaged and make informed, prudent decisions. Directors must exercise the same level of care and diligence that an ordinarily prudent person would use in similar circumstances.</p>
    <p class="doc-paragraph"><em>Key Practices:</em> Attending board meetings regularly, reading and analyzing reports (like financial statements), asking pertinent questions, and ensuring the organization has the resources it needs.</p>

    <div class="doc-sub-heading">2. Duty of Loyalty</div>
    <p class="doc-paragraph">The duty of loyalty demands that directors put the interests of the organization above their own personal or professional interests. Board members must act with undivided allegiance, avoiding any conflicts of interest&mdash;or even the appearance of a conflict.</p>
    <p class="doc-paragraph"><em>Key Practices:</em> Disclosing any potential conflicts of interest immediately, recusing oneself from discussions and voting when a conflict arises, and never using the board position for personal gain.</p>

    <div class="doc-sub-heading">3. Duty of Obedience</div>
    <p class="doc-paragraph">The duty of obedience requires board members to remain faithful with fidelity to the organization's core mission and purpose. Directors are responsible for ensuring the entity operates strictly within the bounds of the law.</p>
    <p class="doc-paragraph"><em>Key Practices:</em> Adhering strictly and complying with all relevant local, state, and federal regulations, and ensuring activities align directly with the stated mission.</p>

    <div class="doc-section-heading">Operational No-Nos</div>
    <ul class="doc-list">
        <li><strong>Don't micromanage:</strong> Board members are responsible for oversight. They should not direct staff, alter daily procedures, or handle day-to-day operations.</li>
        <li><strong>Don't bypass the chain of command:</strong> Individual board members do not have the authority to make operational demands of staff. All concerns or directives should go through the full board and the chief executive.</li>
        <li><strong>Don't act as a lone ranger:</strong> An individual board member has no legal authority outside of official board meetings. You cannot make unilateral promises, commit the organization to contracts, or speak on behalf of the board without prior authorization.</li>
    </ul>

    <div class="doc-section-heading">Ethical &amp; Legal Pitfalls</div>
    <ul class="doc-list">
        <li><strong>Don't ignore conflicts of interest:</strong> Avoid self-dealing. Board members should not use their position to secure contracts, favors, or favorable business terms for themselves or their personal businesses with the organization they serve.</li>
        <li><strong>Don't breach confidentiality:</strong> Never disclose sensitive information discussed in executive sessions, internal meetings or other such activities. This includes legal strategies, personnel issues, and private financial or health data.</li>
        <li><strong>Don't neglect fiduciary duties:</strong> Board members must be actively engaged. Failing to read financial statements, rubber-stamping proposals without asking questions, or failing to enforce term limits is a major breach of fiduciary care.</li>
    </ul>

    <div class="doc-section-heading">Boardroom Culture &amp; Meetings</div>
    <ul class="doc-list">
        <li><strong>Don't play politics:</strong> Decisions should be driven by the organization's mission and best interests, not by personal agendas, political machinations, or behind-the-scenes vote-whipping.</li>
        <li><strong>Don't keep quiet when necessary:</strong> A silent board member is not doing their job. If indicators point to organizational trouble or questionable actions, it is your responsibility to speak up, ask tough questions, and voice dissenting opinions in the boardroom.</li>
    </ul>

    <div class="doc-section-heading">Fundraising Responsibilities</div>
    <p class="doc-paragraph">A nonprofit board of directors is legally and ethically required to ensure the organization has the financial resources to fulfill its mission. This does not mean every member must make "the ask," but all board members must actively support fundraising by giving personally, engaging their networks, and supporting development strategies.</p>
    <p class="doc-paragraph">The board's fundraising responsibilities break down into three primary categories:</p>

    <div class="doc-sub-heading">1. The Fiduciary Duty of Resource Development</div>
    <ul class="doc-list">
        <li><strong>Give a Personal Gift:</strong> Board members are expected to make a meaningful, personal financial contribution. This shows prospective donors and grant makers that the organization's leaders are fully invested.</li>
        <li><strong>Adopt a "Give or Get" Policy:</strong> Many nonprofits implement a formal expectation where directors either donate a specific amount themselves or secure that amount through sponsorships and donations.</li>
        <li><strong>Approve and Monitor Fiscal Strategies:</strong> The board is responsible for reviewing and approving the annual fundraising plan, setting realistic goals, and ensuring the development staff has the budget and resources needed to execute the strategy.</li>
    </ul>

    <div class="doc-sub-heading">2. Cultivation and "Opening Doors"</div>
    <ul class="doc-list">
        <li><strong>Expand the Network:</strong> Board members are essentially the bridge to the community. They are expected to introduce staff to prospective donors, corporate sponsors, and community leaders.</li>
        <li><strong>Tell the Story:</strong> Serve as passionate ambassadors for the mission by educating the public, speaking positively about the organization, and dispelling myths.</li>
        <li><strong>Host and Attend Events:</strong> Actively participate in agency events, bring guests, and help thank existing donors for their continued support.</li>
    </ul>

    <div class="doc-sub-heading">3. Oversight and Ethics</div>
    <ul class="doc-list">
        <li><strong>Oversee Compliance:</strong> Ensure that the organization follows all legal requirements for charitable solicitation, protects donor privacy, and adheres to strict ethical guidelines.</li>
        <li><strong>Set Policies:</strong> Establish clear, documented policies regarding gift acceptance, donor recognition, and the handling of restricted funds.</li>
        <li><strong>Support and Evaluate the Executive Director:</strong> Ensure that the Executive Director has the resources to lead and operate the organization's activities. Provide feedback and evaluation of the Executive Director's performance.</li>
    </ul>

    <div class="doc-section-heading">WESTSIDE RISING Board Member Commitment Agreement</div>

    <div class="doc-sub-heading">1. Serve as an Ambassador</div>
    <p class="doc-paragraph">Board members are expected to actively represent Westside Rising in the community by:</p>
    <ul class="doc-list">
        <li>Promoting and championing the mission and impact of the organization.</li>
        <li>Speaking positively about Westside Rising within their professional and personal networks.</li>
        <li>Identifying opportunities to increase visibility and community engagement.</li>
        <li>Inviting prospective supporters to events and programs.</li>
    </ul>

    <div class="doc-sub-heading">2. Make a Personal Financial Commitment</div>
    <p class="doc-paragraph">Every board member is expected to make Westside Rising one of their philanthropic priorities. Each board member will:</p>
    <ul class="doc-list">
        <li>Make or secure a minimum annual contribution of $500 or more ("Give or Get"). This amount may be changed at any time by a resolution of the Board of Directors.</li>
    </ul>
    <p class="doc-paragraph">This commitment may be fulfilled through personal giving, securing gifts from others, sponsorships, corporate matching gifts, or fundraising activities. Contributions may be made throughout the calendar year.</p>

    <div class="doc-sub-heading">3. Open Doors for the Organization</div>
    <p class="doc-paragraph">One of the Board's greatest responsibilities is expanding Westside Rising's network. Each board member agrees to:</p>
    <ul class="doc-list">
        <li>Introduce at least 5 new prospective donors, sponsors, or executive level leaders each year.</li>
        <li>Facilitate introductory meetings when appropriate.</li>
        <li>Share opportunities that may lead to grants, sponsorships, or strategic partnerships.</li>
    </ul>
    <p class="doc-paragraph">Board members are expected to help open doors and build relationships to support the Executive Director.</p>

    <div class="doc-sub-heading">4. Participate in Fundraising</div>
    <p class="doc-paragraph">Each board member will actively support fundraising efforts by:</p>
    <ul class="doc-list">
        <li>Attending fundraising events.</li>
        <li>Inviting philanthropic guests to organizational events when appropriate.</li>
        <li>Assisting with sponsorship outreach when appropriate.</li>
        <li>Participating in donor stewardship activities.</li>
        <li>Making thank-you calls or notes when requested.</li>
    </ul>

    <div class="doc-sub-heading">5. Attend and Participate in Board Meetings</div>
    <p class="doc-paragraph">Board members agree to:</p>
    <ul class="doc-list">
        <li>Attend at least 75% of scheduled Board meetings annually.</li>
        <li>Participate in thoughtful discussion and decision-making.</li>
        <li>Serve on at least one committee or project team, as needed.</li>
    </ul>

    <div class="doc-sub-heading">6. Support Organizational Leadership</div>
    <p class="doc-paragraph">Board members will:</p>
    <ul class="doc-list">
        <li>Provide strategic guidance and support to the Executive Director.</li>
        <li>Help identify organizational opportunities and challenges.</li>
        <li>Uphold fiduciary responsibilities.</li>
        <li>Maintain confidentiality regarding sensitive organizational matters.</li>
        <li>Act in the best interest of Westside Rising at all times.</li>
    </ul>

    <div class="doc-sub-heading">7. Champion Equity and Community</div>
    <p class="doc-paragraph">As representatives of Westside Rising, Board members commit to:</p>
    <ul class="doc-list">
        <li>Respecting the lived experiences of West Side residents.</li>
        <li>Promoting equity, inclusion, and community voices in our work.</li>
        <li>Supporting and ensuring fidelity to the organization's mission, values, and strategic priorities.</li>
    </ul>

    <div class="doc-section-heading">Annual Board Member Commitments</div>
    <p class="doc-paragraph">Each Board Member agrees to:</p>
    <ul class="doc-checklist">
        <li>Make or secure a minimum annual gift of $500 or more</li>
        <li>Attend at least 75% of Board meetings</li>
        <li>Introduce 5 prospective donors, sponsors, or partners</li>
        <li>Attend at least 2 fundraising or community events</li>
        <li>Serve as an Ambassador for Westside Rising</li>
        <li>Participate in fundraising and stewardship activities</li>
        <li>Support the Executive Director in advancing the organization's mission</li>
    </ul>

    <div class="doc-section-heading">Board Member Agreement</div>
    <p class="doc-paragraph">I understand the responsibilities associated with serving on the Westside Rising Board of Directors and commit to fulfilling these expectations to the best of my ability.</p>

    <p class="doc-paragraph">Board Member Name: ${bdField('bsa_name', saved, canEdit, 'Full name', 'doc-field-wide')}</p>

    <p class="doc-paragraph">Role: ${bdRoleField(saved, canEdit)}</p>

    <p class="doc-paragraph">Date: ${bdDateField('bsa_date', saved, canEdit)}</p>

    <div class="doc-closing">
        <div>Executive Director</div>
        <div><strong>Dr. Angelique Orr</strong></div>
        <div>Westside Rising</div>
    </div>
    `;
}

// ==================== 2. Board of Directors NDA ====================
// Source: "Westside Rising - Board of Directors Non-Disclosure Agreement.docx"

function buildBoardNDA(saved, canEdit) {
    return `
    <div class="doc-title">BOARD OF DIRECTORS<br>NON-DISCLOSURE AGREEMENT</div>

    <p class="doc-paragraph">This Non-Disclosure Agreement ("Agreement") is made and effective as of
    ${bdDateField('nda_effective_date', saved, canEdit)},
    by and between <strong>WESTSIDE RISING</strong> ("Organization" or "Owner"), an Illinois not-for-profit
    corporation located in Chicago, IL, and
    ${bdField('nda_member_name', saved, canEdit, 'Board member name', 'doc-field-wide')},
    a member of the Board of Directors of the Organization.</p>

    <div class="doc-section-heading">1. FIDUCIARY DUTY AND PURPOSE</div>
    <p class="doc-paragraph">Pursuant to the Illinois General Not For Profit Corporation Act (805 ILCS 105/), members of the Board of Directors owe a fiduciary duty of confidentiality, loyalty, and care to the Organization. This Agreement establishes standards to safeguard the Organization's confidential, proprietary, and strategic information, protect participant privacy, and maintain operational integrity.</p>

    <div class="doc-section-heading">2. CONFIDENTIAL INFORMATION DEFINED</div>
    <p class="doc-paragraph">"Confidential Information" means all non-public, proprietary, or sensitive information or material disclosed to, obtained by, or accessed by the Board Member in connection with their governance service, whether orally, visually, in writing, or electronically. Confidential Information includes, without limitation:</p>
    <ul class="doc-list">
        <li><strong>Governance &amp; Strategy:</strong> Strategic plans, board meeting deliberations, executive session discussions, legal matters, and policy drafts.</li>
        <li><strong>Financial &amp; Donor Data:</strong> Budgets, financial statements, audit reports, fundraising strategies, donor lists, grant applications, and funder relationships.</li>
        <li><strong>Programs &amp; Operations:</strong> Software, technical data, product/program concepts, trade secrets, vendor contracts, community partner lists, and non-public data concerning program participants (including youth ages 18&ndash;24).</li>
        <li><strong>Third-Party Data:</strong> Confidential information belonging to third parties with whom the Organization conducts business.</li>
    </ul>
    <p class="doc-paragraph">Confidential Information does not include information that is or becomes publicly known through no breach of this Agreement by the Board Member, or information required to be disclosed by applicable law or court order.</p>

    <div class="doc-section-heading">3. OBLIGATIONS AND RESTRICTIONS</div>
    <p class="doc-paragraph">The Board Member agrees to hold all Confidential Information in strict confidence and shall:</p>
    <p class="doc-paragraph"><strong>A. Limit Use and Disclosure:</strong> Use Confidential Information solely to fulfill their fiduciary and governance duties as a Board Member, and not disclose any Confidential Information to any third party without prior written authorization from the Board Chair or Executive Director.</p>
    <p class="doc-paragraph"><strong>B. Safeguard Materials:</strong> Take all reasonable physical, digital, and technical precautions to prevent unauthorized access, copying, modification, or distribution of Confidential Information.</p>
    <p class="doc-paragraph"><strong>C. Report Breaches:</strong> Promptly notify the Board Chair and Executive Director in writing upon discovering any actual or suspected unauthorized disclosure or use of Confidential Information.</p>

    <div class="doc-section-heading">4. RETURN OF CONFIDENTIAL MATERIALS</div>
    <p class="doc-paragraph">Upon the conclusion or termination of the Board Member's service, or immediately upon request by the Organization, the Board Member shall promptly return or permanently destroy all physical and electronic materials, documents, notes, and records containing Confidential Information. If requested, the Board Member shall provide written certification of compliance within ten (10) days.</p>

    <div class="doc-section-heading">5. INJUNCTIVE RELIEF, INDEMNIFICATION, AND FEES</div>
    <p class="doc-paragraph"><strong>Injunction:</strong> The Board Member acknowledges that unauthorized disclosure of Confidential Information will cause irreparable harm. The Organization shall be entitled to seek injunctive relief to restrain any actual or threatened breach, in addition to all other available legal and equitable remedies.</p>
    <p class="doc-paragraph"><strong>Indemnification:</strong> The Board Member agrees to defend, indemnify, and hold harmless the Organization from third-party claims, liabilities, costs, and expenses (including reasonable attorney's fees) resulting from the Board Member's material breach or reckless misuse under this Agreement.</p>
    <p class="doc-paragraph"><strong>Attorney's Fees:</strong> In any legal action arising under or concerning this Agreement, the prevailing party shall be entitled to recover reasonable attorney's fees and court costs.</p>

    <div class="doc-section-heading">6. GENERAL PROVISIONS</div>
    <p class="doc-paragraph"><strong>Term &amp; Survival:</strong> Confidentiality obligations regarding trade secrets survive indefinitely pursuant to the Illinois Trade Secrets Act (765 ILCS 1065/). Obligations for all other Confidential Information shall survive during the Board Member's term and for five (5) years following the conclusion of their Board service.</p>
    <p class="doc-paragraph"><strong>Governing Law &amp; Severability:</strong> This Agreement shall be governed by and construed under the laws of the State of Illinois. If any provision is held invalid or unenforceable, the remaining provisions shall remain in full force and effect.</p>
    <p class="doc-paragraph"><strong>Entire Agreement:</strong> This Agreement constitutes the complete understanding of the parties regarding confidentiality and supersedes prior discussions. Any modification must be in writing and signed by both parties.</p>

    <div class="doc-section-heading">ACKNOWLEDGMENT &amp; SIGNATURES</div>
    <p class="doc-paragraph">Printed Name: ${bdField('nda_printed_name', saved, canEdit, 'Printed name', 'doc-field-wide')}</p>
    `;
}

// ==================== 3. Conflict of Interest Agreement ====================
// DRAFT — derived from Westside Rising Bylaws Article VI (Conflicts of Interest)
// and Article VII Section 7 (Personal Gift Prohibition and Ethics Policy).
// Article VI Section 4 requires covered individuals to complete annual disclosures.
// Have counsel review this text before distribution.

function buildBoardCOI(saved, canEdit) {
    return `
    <div class="doc-title">CONFLICT OF INTEREST AGREEMENT<br>AND ANNUAL DISCLOSURE STATEMENT</div>

    <p class="doc-paragraph">This Conflict of Interest Agreement ("Agreement") is made and effective as of
    ${bdDateField('coi_effective_date', saved, canEdit)},
    by and between <strong>WESTSIDE RISING</strong> (the "Corporation"), an Illinois not-for-profit
    corporation located in Chicago, IL, and
    ${bdField('coi_member_name', saved, canEdit, 'Board member name', 'doc-field-wide')},
    a member of the Board of Directors of the Corporation.</p>

    <div class="doc-section-heading">1. PURPOSE</div>
    <p class="doc-paragraph">This Agreement implements Article VI of the Bylaws of Westside Rising and is intended to protect the Corporation's interests when it contemplates entering into a transaction or arrangement that might benefit the private interest of a Director, officer, or other person with decision-making authority. This Agreement supplements, and does not replace, applicable Illinois law, including the Illinois General Not For Profit Corporation Act of 1986 (805 ILCS 105/108.60), and the requirements of Section 501(c)(3) of the Internal Revenue Code.</p>

    <div class="doc-section-heading">2. DUTY TO DISCLOSE</div>
    <p class="doc-paragraph">Directors, officers, and other persons with decision-making authority shall act in the best interests of Westside Rising and shall disclose any actual or potential conflict of interest involving a personal, financial, family, business, or other material interest.</p>
    <p class="doc-paragraph">Disclosure shall be made promptly upon the Director becoming aware of the actual or potential conflict, and in all cases prior to any Board deliberation or vote on the matter.</p>

    <div class="doc-section-heading">3. RECUSAL</div>
    <p class="doc-paragraph">A person with a conflict shall disclose all material facts and shall not participate in deliberations or vote on the matter, except to provide information when requested by the Board. Any transaction involving a conflict must be determined by the disinterested members of the Board to be fair, reasonable, and in the best interests of the organization.</p>

    <div class="doc-section-heading">4. INTERESTED TRANSACTIONS</div>
    <p class="doc-paragraph">An interested transaction &mdash; defined as any contract, agreement, or transaction between the Corporation and an interested Director, officer, key employee, person, or an entity in which any such person has a financial or material interest &mdash; may be authorized, approved, or ratified only if the disinterested Directors determine, in good faith and after reasonable inquiry, that:</p>
    <ul class="doc-list">
        <li>The transaction is fair, reasonable, and in the best interests of the Corporation;</li>
        <li>The transaction complies with all applicable federal and state laws, including 805 ILCS 105/108.60 and Section 501(c)(3) of the Internal Revenue Code; and</li>
        <li>The Corporation could not, with reasonable efforts under the circumstances, obtain a more advantageous transaction or arrangement from an entity or individual that would not give rise to a conflict of interest.</li>
    </ul>
    <p class="doc-paragraph">Approval of an interested transaction requires the affirmative vote of a majority of the disinterested Directors present at a meeting where a quorum of disinterested Directors is present. The Board shall document the proceedings in the meeting minutes contemporaneously with the decision.</p>

    <div class="doc-section-heading">5. PROHIBITION ON PERSONAL GIFTS</div>
    <p class="doc-paragraph">No Director, officer, or employee of the Corporation shall solicit, accept, or agree to accept any personal gift, gratuity, fee, reward, favor, loan, hospitality, or item of value from any individual, contractor, vendor, or entity that:</p>
    <ul class="doc-list">
        <li>Is currently doing business with, or seeking to do business with, the Corporation;</li>
        <li>Is seeking grants, contracts, or financial support from the Corporation; or</li>
        <li>Has financial or organizational interests that may be substantially affected by the performance or nonperformance of the Director's or officer's official duties.</li>
    </ul>
    <p class="doc-paragraph"><strong>De Minimis Exception:</strong> This prohibition shall not apply to unsolicited non-monetary items of nominal intrinsic value (e.g., modest meals provided during business meetings, promotional items, or token appreciation awards valued at under $50), provided that such items are not intended to influence official Board actions or create an appearance of impropriety.</p>
    <p class="doc-paragraph"><strong>Duty to Report:</strong> Any Director who is offered or receives an unsolicited gift or benefit exceeding nominal value shall immediately disclose the matter in writing to the Board Chair or Governance Committee. The gift shall either be returned to the donor or transferred to the Corporation for general organizational use.</p>

    <div class="doc-section-heading">6. CONFIDENTIALITY</div>
    <p class="doc-paragraph">Directors shall protect confidential information belonging to the Corporation and its stakeholders, consistent with Article IX, Section 3 of the Bylaws and any Non-Disclosure Agreement executed by the Director.</p>

    <div class="doc-section-heading">7. ANNUAL DISCLOSURE STATEMENT</div>
    <p class="doc-paragraph">Pursuant to Article VI, Section 4 of the Bylaws, each covered individual shall complete this disclosure annually.</p>

    <p class="doc-paragraph"><strong>Please disclose below any relationship, position, or circumstance in which you are involved that you believe could contribute to a conflict of interest, whether actual, potential, or perceived.</strong> This includes, without limitation: (a) any entity doing business with or seeking to do business with the Corporation in which you or a family member holds a financial or material interest; (b) any compensated position you hold with such an entity; (c) any competing organization in which you hold a governance role; and (d) any gift exceeding nominal value received from a party described in Section 5.</p>

    <p class="doc-paragraph">If you have nothing to disclose, write <strong>"NONE"</strong> below.</p>

    <div class="doc-disclosure-box">
        ${bdField('coi_disclosure_1', saved, canEdit, 'Disclosure (or NONE)', 'doc-field-block')}
        ${bdField('coi_disclosure_2', saved, canEdit, 'Additional disclosure, if any', 'doc-field-block')}
        ${bdField('coi_disclosure_3', saved, canEdit, 'Additional disclosure, if any', 'doc-field-block')}
    </div>

    <div class="doc-section-heading">8. ACKNOWLEDGMENT</div>
    <p class="doc-paragraph">By signing below, I affirm that:</p>
    <ul class="doc-list">
        <li>I have received and read a copy of this Conflict of Interest Agreement;</li>
        <li>I understand and agree to comply with its terms and with Article VI of the Bylaws;</li>
        <li>I understand that Westside Rising is a charitable organization and that, in order to maintain its federal tax exemption, it must engage primarily in activities which accomplish one or more of its tax-exempt purposes; and</li>
        <li>The disclosures I have made above are complete and accurate to the best of my knowledge, and I will promptly disclose any conflict arising after the date of this statement.</li>
    </ul>

    <p class="doc-paragraph">Printed Name: ${bdField('coi_printed_name', saved, canEdit, 'Printed name', 'doc-field-wide')}</p>
    `;
}
