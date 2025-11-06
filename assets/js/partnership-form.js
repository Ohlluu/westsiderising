// ===================================
// PARTNERSHIP FORM HANDLER
// ===================================

document.addEventListener('DOMContentLoaded', function() {

    const partnershipForm = document.getElementById('partnershipForm');

    if (!partnershipForm) return;

    // ===== CONDITIONAL FIELDS =====

    // Show/hide "Other" text field for partnership type
    const partnershipTypeOtherCheckbox = document.getElementById('partnershipTypeOther');
    const partnershipTypeOtherText = document.getElementById('partnershipTypeOtherText');
    const partnershipTypeOtherInput = document.getElementById('partnershipTypeOtherInput');

    if (partnershipTypeOtherCheckbox) {
        partnershipTypeOtherCheckbox.addEventListener('change', function() {
            if (this.checked) {
                partnershipTypeOtherText.style.display = 'block';
                partnershipTypeOtherInput.required = true;
            } else {
                partnershipTypeOtherText.style.display = 'none';
                partnershipTypeOtherInput.required = false;
                partnershipTypeOtherInput.value = '';
            }
        });
    }

    // Show/hide "Other" text field for commitments
    const commitmentsOtherCheckbox = document.getElementById('commitmentsOther');
    const commitmentsOtherText = document.getElementById('commitmentsOtherText');
    const commitmentsOtherInput = document.getElementById('commitmentsOtherInput');

    if (commitmentsOtherCheckbox) {
        commitmentsOtherCheckbox.addEventListener('change', function() {
            if (this.checked) {
                commitmentsOtherText.style.display = 'block';
                commitmentsOtherInput.required = true;
            } else {
                commitmentsOtherText.style.display = 'none';
                commitmentsOtherInput.required = false;
                commitmentsOtherInput.value = '';
            }
        });
    }

    // Show/hide "Other" text field for support needed
    const supportOtherRadio = document.getElementById('supportOther');
    const supportOtherText = document.getElementById('supportOtherText');
    const supportOtherInput = document.getElementById('supportOtherInput');

    if (supportOtherRadio) {
        const supportRadios = document.querySelectorAll('input[name="support"]');
        supportRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'other') {
                    supportOtherText.style.display = 'block';
                    supportOtherInput.required = true;
                } else {
                    supportOtherText.style.display = 'none';
                    supportOtherInput.required = false;
                    supportOtherInput.value = '';
                }
            });
        });
    }

    // Show/hide "Other" text field for agreement terms
    const agreementOtherCheckbox = document.getElementById('agreementOther');
    const agreementOtherText = document.getElementById('agreementOtherText');
    const agreementOtherInput = document.getElementById('agreementOtherInput');

    if (agreementOtherCheckbox) {
        agreementOtherCheckbox.addEventListener('change', function() {
            if (this.checked) {
                agreementOtherText.style.display = 'block';
                agreementOtherInput.required = true;
            } else {
                agreementOtherText.style.display = 'none';
                agreementOtherInput.required = false;
                agreementOtherInput.value = '';
            }
        });
    }


    // ===== FORM SUBMISSION =====
    partnershipForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Validate partnership type
        const partnershipTypeChecked = partnershipForm.querySelectorAll('input[name="partnershipType"]:checked');
        if (partnershipTypeChecked.length === 0) {
            alert('Please select at least one partnership type.');
            return;
        }

        // Validate partnership commitments
        const commitmentsChecked = partnershipForm.querySelectorAll('input[name="commitments"]:checked');
        if (commitmentsChecked.length === 0) {
            alert('Please select at least one partnership commitment.');
            return;
        }

        // Validate agreement terms - must check "I understand and agree"
        const agreementAgreeChecked = document.getElementById('agreementAgree').checked;
        if (!agreementAgreeChecked) {
            alert('Please check "I understand and agree" to accept the partnership agreement terms.');
            return;
        }

        // Collect form data
        const email = document.getElementById('partnerEmail').value;
        const emailAddress = document.getElementById('partnerEmailAddress').value;
        const entityName = document.getElementById('entityName').value;
        const partnershipType = Array.from(partnershipTypeChecked).map(cb => cb.value);
        const partnershipTypeOther = partnershipTypeOtherInput ? partnershipTypeOtherInput.value : null;
        const contacts = document.getElementById('contacts').value;
        const commitments = Array.from(commitmentsChecked).map(cb => cb.value);
        const commitmentsOther = commitmentsOtherInput ? commitmentsOtherInput.value : null;

        // Get support needed
        const supportChecked = partnershipForm.querySelector('input[name="support"]:checked');
        const support = supportChecked ? supportChecked.value : null;
        const supportOther = supportOtherInput ? supportOtherInput.value : null;

        // Get agreement terms
        const agreementTermsChecked = partnershipForm.querySelectorAll('input[name="agreementTerms"]:checked');
        const agreementTerms = Array.from(agreementTermsChecked).map(cb => cb.value);
        const agreementOther = agreementOtherInput ? agreementOtherInput.value : null;

        const authorizedRep = document.getElementById('authorizedRep').value;
        const completionDate = document.getElementById('completionDate').value;

        const formData = {
            email,
            emailAddress,
            entityName,
            partnershipType,
            partnershipTypeOther,
            contacts,
            commitments,
            commitmentsOther,
            support,
            supportOther,
            agreementTerms,
            agreementOther,
            authorizedRep,
            completionDate
        };

        console.log('Partnership Form Data:', formData);

        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.innerHTML = `
            <div class="success-icon">
                <i class="fas fa-handshake"></i>
            </div>
            <h3>Partnership Application Submitted!</h3>
            <p>
                Thank you for your interest in partnering with Westside Rising. We've received your partnership application
                for <strong>${entityName}</strong> and will review it within 3-5 business days.
            </p>
            <p>
                A confirmation email has been sent to <strong>${email}</strong> with your application details.
                Our team will reach out to discuss next steps and partnership opportunities.
            </p>
            <button class="btn btn-primary" onclick="location.reload()">
                <i class="fas fa-redo"></i>
                Submit Another Application
            </button>
        `;

        // Replace form with success message
        partnershipForm.parentElement.innerHTML = '';
        partnershipForm.parentElement.appendChild(successMessage);

        // Scroll to success message
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // In production, you would send this data to a server:
        // fetch('/api/partnership-application', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(formData)
        // })
        // .then(response => response.json())
        // .then(data => {
        //     // Show success message
        // })
        // .catch(error => {
        //     console.error('Error:', error);
        //     alert('There was an error submitting your application. Please try again.');
        // });
    });

    // Set today's date as default for completion date
    const completionDateInput = document.getElementById('completionDate');
    if (completionDateInput) {
        const today = new Date().toISOString().split('T')[0];
        completionDateInput.value = today;
    }

});
