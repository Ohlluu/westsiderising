// ===================================
// COMMUNITY VOICES SURVEY HANDLER
// ===================================
import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {

    const form = document.getElementById('communityVoicesForm');
    if (!form) return;

    // ===== CONDITIONAL: Community "Other" =====
    form.querySelectorAll('input[name="community"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const group = document.getElementById('communityOtherGroup');
            if (group) group.style.display = this.value === 'other' ? 'block' : 'none';
        });
    });

    // ===== CONDITIONAL: Alderman details =====
    form.querySelectorAll('input[name="knowAlderman"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const details = document.getElementById('aldermanDetails');
            if (details) details.style.display = this.value === 'yes' ? 'block' : 'none';
        });
    });

    // ===== CONDITIONAL: Get Involved "Other" =====
    const getInvolvedOther = document.getElementById('getInvolvedOther');
    if (getInvolvedOther) {
        getInvolvedOther.addEventListener('change', function() {
            const group = document.getElementById('getInvolvedOtherGroup');
            if (group) group.style.display = this.checked ? 'block' : 'none';
        });
    }

    // ===== PHONE FORMATTING =====
    const phoneInput = document.getElementById('contactPhone');
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

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnContent = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        const communityEl = form.querySelector('input[name="community"]:checked');
        const communityValue = communityEl ? communityEl.value : '';
        const finalCommunity = communityValue === 'other'
            ? (form.querySelector('#communityOtherInput').value.trim() || 'Other')
            : communityValue;

        const aldermanEl = form.querySelector('input[name="alderman"]:checked');
        const aldermanRatingEl = form.querySelector('input[name="aldermanRating"]:checked');

        const formData = {
            formType: 'Community Voices Survey',
            heardAboutWR: (form.querySelector('input[name="heardAboutWR"]:checked') || {}).value || '',
            age: (form.querySelector('input[name="age"]:checked') || {}).value || '',
            timeOnWestSide: (form.querySelector('input[name="timeOnWestSide"]:checked') || {}).value || '',
            community: finalCommunity,
            registeredVoter: (form.querySelector('input[name="registeredVoter"]:checked') || {}).value || '',
            knowAlderman: (form.querySelector('input[name="knowAlderman"]:checked') || {}).value || '',
            alderman: aldermanEl ? aldermanEl.value : '',
            aldermanRating: aldermanRatingEl ? aldermanRatingEl.value : '',
            mayorRating: (form.querySelector('input[name="mayorRating"]:checked') || {}).value || '',
            mayorRatingWhy: form.querySelector('#mayorRatingWhy').value.trim(),
            topIssue1: form.querySelector('#topIssue1').value.trim(),
            topIssue2: form.querySelector('#topIssue2').value.trim(),
            topIssue3: form.querySelector('#topIssue3').value.trim(),
            housingSatisfaction: (form.querySelector('input[name="housingSatisfaction"]:checked') || {}).value || '',
            housingWhy: form.querySelector('#housingWhy').value.trim(),
            housingAction: form.querySelector('#housingAction').value.trim(),
            ifMayor: form.querySelector('#ifMayor').value.trim(),
            additionalConcerns: form.querySelector('#additionalConcerns').value.trim(),
            getInvolved: Array.from(form.querySelectorAll('input[name="getInvolved"]:checked')).map(cb => cb.value),
            getInvolvedOther: form.querySelector('#getInvolvedOtherInput') ? form.querySelector('#getInvolvedOtherInput').value.trim() : '',
            contactName: form.querySelector('#contactName').value.trim(),
            contactEmail: form.querySelector('#contactEmail').value.trim(),
            contactPhone: form.querySelector('#contactPhone').value.trim(),
            status: 'new',
            submittedAt: serverTimestamp()
        };

        addDoc(collection(db, 'communityVoicesSurveys'), formData)
            .then(() => {
                showSuccess(formData.contactName, form);
            })
            .catch((error) => {
                console.error('Firestore error:', error);
                alert('There was an error submitting your survey. Please try again.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
            });
    });

});

function showSuccess(name, form) {
    const parent = form.parentElement;
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `
        <div class="success-icon">
            <i class="fas fa-check-circle"></i>
        </div>
        <h3>Thank You, ${name || 'Community Member'}!</h3>
        <p>
            We've received your Community Voices Survey response. Your input is invaluable in helping
            WESTSIDE RISING advocate for the issues that matter most on the West Side.
        </p>
        <button class="btn btn-primary" onclick="location.reload()">
            <i class="fas fa-redo"></i>
            Submit Another Response
        </button>
    `;
    parent.innerHTML = '';
    parent.appendChild(successMessage);
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
