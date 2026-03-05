// ===================================
// JOIN TEAM / EMPLOYMENT APPLICATION FORM HANDLER
// ===================================
import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {

    const form = document.getElementById('joinTeamForm');
    if (!form) return;

    // ===== CONDITIONAL: Position Other =====
    form.querySelectorAll('input[name="position"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const group = document.getElementById('positionOtherGroup');
            if (group) group.style.display = this.value === 'other' ? 'block' : 'none';
        });
    });

    // ===== CONDITIONAL: Employment Type Other =====
    form.querySelectorAll('input[name="employmentType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const group = document.getElementById('employmentTypeOtherGroup');
            if (group) group.style.display = this.value === 'other' ? 'block' : 'none';
        });
    });

    // ===== CONDITIONAL: US Citizen Other =====
    form.querySelectorAll('input[name="usCitizen"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const group = document.getElementById('usCitizenOtherGroup');
            if (group) group.style.display = this.value === 'other' ? 'block' : 'none';
        });
    });

    // ===== CONDITIONAL: Work Authorization Other =====
    form.querySelectorAll('input[name="workAuthorized"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const group = document.getElementById('workAuthOtherGroup');
            if (group) group.style.display = this.value === 'other' ? 'block' : 'none';
        });
    });

    // ===== CONDITIONAL: Worked for WR Other =====
    form.querySelectorAll('input[name="workedForWR"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const group = document.getElementById('workedForWROtherGroup');
            if (group) group.style.display = this.value === 'other' ? 'block' : 'none';
        });
    });

    // ===== CONDITIONAL: Criminal Background Other =====
    form.querySelectorAll('input[name="criminalBackground"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const group = document.getElementById('criminalOtherGroup');
            if (group) group.style.display = this.value === 'other' ? 'block' : 'none';
        });
    });

    // ===== LIVE SIGNATURE DISPLAY =====
    const signatureInput = document.getElementById('signature');
    const signatureDisplay = document.getElementById('signatureDisplay');
    if (signatureInput && signatureDisplay) {
        signatureInput.addEventListener('input', function() {
            signatureDisplay.textContent = this.value || '_______________';
        });
    }

    // ===== PHONE FORMATTING =====
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 10) value = value.slice(0, 10);
            if (value.length >= 6) {
                e.target.value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
            } else if (value.length >= 3) {
                e.target.value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
            } else {
                e.target.value = value;
            }
        });
    }

    // ===== FORM SUBMISSION =====
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const submitBtn = document.getElementById('submit-btn');
        const originalBtnContent = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        // Collect skills matrix
        const skillNames = [
            'word', 'excel', 'dataentry', 'internalcomms', 'marketing',
            'socialmedia', 'canva', 'research', 'outreach', 'email',
            'ai', 'documentation', 'teammanagement', 'projectmanagement',
            'training', 'fundraising'
        ];
        const skillLabels = [
            'Microsoft Word', 'Excel', 'Data Entry', 'Internal Communications', 'Marketing',
            'Social Media', 'Canva', 'Research', 'Community Outreach', 'Constant Contact/Mailchimp',
            'AI Tools', 'Documentation', 'Team Management', 'Program/Project Management',
            'Training', 'Fundraising & Development'
        ];
        const skills = {};
        skillNames.forEach((name, i) => {
            const selected = form.querySelector(`input[name="skill_${name}"]:checked`);
            skills[skillLabels[i]] = selected ? selected.value : 'Not indicated';
        });

        const positionEl = form.querySelector('input[name="position"]:checked');
        const positionValue = positionEl ? positionEl.value : '';
        const finalPosition = positionValue === 'other'
            ? (form.querySelector('#positionOtherInput').value.trim() || 'Other')
            : positionValue;

        const employmentTypeEl = form.querySelector('input[name="employmentType"]:checked');
        const employmentTypeValue = employmentTypeEl ? employmentTypeEl.value : '';
        const finalEmploymentType = employmentTypeValue === 'other'
            ? (form.querySelector('#employmentTypeOtherInput').value.trim() || 'Other')
            : employmentTypeValue;

        const usCitizenEl = form.querySelector('input[name="usCitizen"]:checked');
        const usCitizenValue = usCitizenEl ? usCitizenEl.value : '';
        const finalUsCitizen = usCitizenValue === 'other'
            ? (form.querySelector('#usCitizenOtherInput').value.trim() || 'Other')
            : usCitizenValue;

        const workAuthEl = form.querySelector('input[name="workAuthorized"]:checked');
        const workAuthValue = workAuthEl ? workAuthEl.value : '';
        const finalWorkAuth = workAuthValue === 'other'
            ? (form.querySelector('#workAuthOtherInput').value.trim() || 'Other')
            : workAuthValue;

        const wrWorkedEl = form.querySelector('input[name="workedForWR"]:checked');
        const wrWorkedValue = wrWorkedEl ? wrWorkedEl.value : '';
        const finalWrWorked = wrWorkedValue === 'other'
            ? (form.querySelector('#workedForWROtherInput').value.trim() || 'Other')
            : wrWorkedValue;

        const criminalEl = form.querySelector('input[name="criminalBackground"]:checked');
        const criminalValue = criminalEl ? criminalEl.value : '';
        const finalCriminal = criminalValue === 'other'
            ? (form.querySelector('#criminalOtherInput').value.trim() || 'Other')
            : criminalValue;

        const resumeInput = form.querySelector('#resume');
        const resumeFilename = resumeInput && resumeInput.files[0] ? resumeInput.files[0].name : '';

        const formData = {
            formType: 'Employment Application',
            email: form.querySelector('#email').value.trim(),
            appDate: form.querySelector('#appDate').value,
            fullName: form.querySelector('#fullName').value.trim(),
            address: form.querySelector('#address').value.trim(),
            phone: form.querySelector('#phone').value.trim(),
            position: finalPosition,
            secondaryPosition: form.querySelector('#secondaryPosition').value.trim(),
            employmentType: finalEmploymentType,
            desiredPay: form.querySelector('#desiredPay').value.trim(),
            startDate: form.querySelector('#startDate').value,
            usCitizen: finalUsCitizen,
            workAuthorized: finalWorkAuth,
            workedForWR: finalWrWorked,
            wrHistory: form.querySelector('#wrHistory').value.trim(),
            criminalBackground: finalCriminal,
            westSideWork: form.querySelector('#westSideWork').value.trim(),
            coreValues: form.querySelector('#coreValues').value.trim(),
            wrVision: form.querySelector('#wrVision').value.trim(),
            employer1: form.querySelector('#employer1').value.trim(),
            employer2: form.querySelector('#employer2').value.trim(),
            skills,
            otherSkills: form.querySelector('#otherSkills').value.trim(),
            abilitiesVision: form.querySelector('#abilitiesVision').value.trim(),
            school1: form.querySelector('#school1').value.trim(),
            school2: form.querySelector('#school2').value.trim(),
            resumeFilename,
            reference1: form.querySelector('#reference1').value.trim(),
            reference2: form.querySelector('#reference2').value.trim(),
            reference3: form.querySelector('#reference3').value.trim(),
            signature: form.querySelector('#signature').value.trim(),
            todaysDate: form.querySelector('#todaysDate').value,
            status: 'new',
            submittedAt: serverTimestamp()
        };

        addDoc(collection(db, 'joinTeamApplications'), formData)
            .then(() => {
                showSuccess(formData.email, form);
            })
            .catch((error) => {
                console.error('Firestore error:', error);
                alert('There was an error submitting your application. Please try again.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
            });
    });

});

function showSuccess(email, form) {
    const parent = form.parentElement;
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `
        <div class="success-icon">
            <i class="fas fa-check-circle"></i>
        </div>
        <h3>Application Submitted!</h3>
        <p>
            Thank you for applying to WESTSIDE RISING. We've received your employment application
            and will review it within 5–7 business days. We will follow up with you at
            <strong>${email}</strong>.
        </p>
        <button class="btn btn-primary" onclick="location.reload()">
            <i class="fas fa-redo"></i>
            Submit Another Application
        </button>
    `;
    parent.innerHTML = '';
    parent.appendChild(successMessage);
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
