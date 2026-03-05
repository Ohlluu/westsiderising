// ===================================
// COMMUNITY POWER LAB FORM HANDLER
// ===================================
import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {

    const form = document.getElementById('powerLabForm');
    if (!form) return;

    // ===== CONDITIONAL FIELD: Org Name =====
    const applyingAsRadios = form.querySelectorAll('input[name="applyingAs"]');
    const orgNameGroup = document.getElementById('orgNameGroup');

    applyingAsRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'organization') {
                orgNameGroup.style.display = 'block';
            } else {
                orgNameGroup.style.display = 'none';
                document.getElementById('orgName').value = '';
            }
        });
    });

    // ===== CONDITIONAL FIELD: Neighborhood Other =====
    const neighborhoodCheckboxes = form.querySelectorAll('input[name="neighborhoods"]');
    const neighborhoodOtherGroup = document.getElementById('neighborhoodOtherGroup');

    neighborhoodCheckboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            const otherChecked = form.querySelector('input[name="neighborhoods"][value="other"]:checked');
            if (otherChecked) {
                neighborhoodOtherGroup.style.display = 'block';
            } else {
                neighborhoodOtherGroup.style.display = 'none';
                document.getElementById('neighborhoodOther').value = '';
            }
        });
    });

    // ===== CONDITIONAL FIELD: Preferred Time Other =====
    const preferredTimeRadios = form.querySelectorAll('input[name="preferredTime"]');
    const preferredTimeOtherGroup = document.getElementById('preferredTimeOtherGroup');

    preferredTimeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'other') {
                preferredTimeOtherGroup.style.display = 'block';
            } else {
                preferredTimeOtherGroup.style.display = 'none';
                document.getElementById('preferredTimeOther').value = '';
            }
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

    // ===== ZIP CODE FORMATTING =====
    const zipInput = document.getElementById('zipCode');
    if (zipInput) {
        zipInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 5) value = value.slice(0, 5);
            e.target.value = value;
        });
    }

    // ===== FORM SUBMISSION =====
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Validate session interest
        const sessionChecked = form.querySelectorAll('input[name="sessionInterest"]:checked');
        if (sessionChecked.length === 0) {
            alert('Please select at least one session interest option.');
            return;
        }

        // Validate conditions (all 5 required)
        const conditionsChecked = form.querySelectorAll('input[name="conditions"]:checked');
        const conditionsAll = form.querySelectorAll('input[name="conditions"]');
        if (conditionsChecked.length < conditionsAll.length) {
            alert('Please agree to all Conditions of Participation to continue.');
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        const originalBtnContent = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        // Collect arrays
        const sessionInterest = Array.from(sessionChecked).map(cb => cb.value);
        const westSideConnection = Array.from(form.querySelectorAll('input[name="westSideConnection"]:checked')).map(cb => cb.value);
        const neighborhoods = Array.from(form.querySelectorAll('input[name="neighborhoods"]:checked')).map(cb => cb.value);
        const conditions = Array.from(conditionsChecked).map(cb => cb.value);

        const applyingAsEl = form.querySelector('input[name="applyingAs"]:checked');
        const preferredTimeEl = form.querySelector('input[name="preferredTime"]:checked');

        const formData = {
            formType: 'Community Power Lab Application',
            sessionInterest,
            applyingAs: applyingAsEl ? applyingAsEl.value : '',
            fullName: form.querySelector('#fullName').value.trim(),
            orgName: form.querySelector('#orgName').value.trim(),
            address: form.querySelector('#address').value.trim(),
            city: form.querySelector('#city').value.trim(),
            state: form.querySelector('#state').value.trim(),
            zipCode: form.querySelector('#zipCode').value.trim(),
            phone: form.querySelector('#phone').value.trim(),
            email: form.querySelector('#email').value.trim(),
            hearAbout: form.querySelector('#hearAbout').value.trim(),
            westSideConnection,
            westSideExplain: form.querySelector('#westSideExplain').value.trim(),
            neighborhoods,
            neighborhoodOther: form.querySelector('#neighborhoodOther').value.trim(),
            wrPartnership: form.querySelector('#wrPartnership').value.trim(),
            conditions,
            q1: form.querySelector('#q1').value.trim(),
            q2: form.querySelector('#q2').value.trim(),
            q3: form.querySelector('#q3').value.trim(),
            q4: form.querySelector('#q4').value.trim(),
            q5: form.querySelector('#q5').value.trim(),
            participantCount: form.querySelector('#participantCount').value,
            participant1: {
                name: form.querySelector('[name="participant1Name"]').value.trim(),
                phone: form.querySelector('[name="participant1Phone"]').value.trim(),
                email: form.querySelector('[name="participant1Email"]').value.trim()
            },
            participant2: {
                name: form.querySelector('[name="participant2Name"]').value.trim(),
                phone: form.querySelector('[name="participant2Phone"]').value.trim(),
                email: form.querySelector('[name="participant2Email"]').value.trim()
            },
            participant3: {
                name: form.querySelector('[name="participant3Name"]').value.trim(),
                phone: form.querySelector('[name="participant3Phone"]').value.trim(),
                email: form.querySelector('[name="participant3Email"]').value.trim()
            },
            preferredTime: preferredTimeEl ? preferredTimeEl.value : '',
            preferredTimeOther: form.querySelector('#preferredTimeOther').value.trim(),
            referral: form.querySelector('#referral').value.trim(),
            signature: form.querySelector('#signature').value.trim(),
            status: 'new',
            submittedAt: serverTimestamp()
        };

        addDoc(collection(db, 'powerLabApplications'), formData)
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
            Thank you for applying to WR's Community Power Labs. We've received your application
            and will review it within 5–7 business days. A member of our team will follow up
            with you at <strong>${email}</strong>.
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
