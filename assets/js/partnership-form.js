// ===================================
// PARTNERSHIP FORM HANDLER
// ===================================

document.addEventListener('DOMContentLoaded', function() {

    const partnershipForm = document.getElementById('partnershipForm');

    if (!partnershipForm) return;

    // ===== CONDITIONAL FIELDS =====

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
    const supportNeededSelect = document.getElementById('supportNeeded');
    const supportNeededOtherText = document.getElementById('supportNeededOtherText');
    const supportNeededOtherInput = document.getElementById('supportNeededOtherInput');

    if (supportNeededSelect) {
        supportNeededSelect.addEventListener('change', function() {
            if (this.value === 'other') {
                supportNeededOtherText.style.display = 'block';
                supportNeededOtherInput.required = true;
            } else {
                supportNeededOtherText.style.display = 'none';
                supportNeededOtherInput.required = false;
                supportNeededOtherInput.value = '';
            }
        });
    }

    // ===== PHONE NUMBER FORMATTING =====
    const phoneInputs = [
        document.getElementById('primaryPhone'),
        document.getElementById('secondaryPhone')
    ];

    phoneInputs.forEach(phoneInput => {
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');

                if (value.length > 10) {
                    value = value.slice(0, 10);
                }

                if (value.length >= 6) {
                    e.target.value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
                } else if (value.length >= 3) {
                    e.target.value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                } else {
                    e.target.value = value;
                }
            });
        }
    });

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

        // Validate agreement terms
        const agreementChecked = document.getElementById('agreementTerms').checked;
        if (!agreementChecked) {
            alert('Please agree to the terms of the partnership agreement.');
            return;
        }

        // Collect form data
        const formData = {
            email: document.getElementById('partnerEmail').value,
            entityName: document.getElementById('entityName').value,
            partnershipType: Array.from(partnershipTypeChecked).map(cb => cb.value),
            primaryContact: {
                name: document.getElementById('primaryName').value,
                title: document.getElementById('primaryTitle').value,
                email: document.getElementById('primaryEmail').value,
                phone: document.getElementById('primaryPhone').value
            },
            secondaryContact: {
                name: document.getElementById('secondaryName').value,
                title: document.getElementById('secondaryTitle').value,
                email: document.getElementById('secondaryEmail').value,
                phone: document.getElementById('secondaryPhone').value
            },
            commitments: Array.from(commitmentsChecked).map(cb => cb.value),
            commitmentsOther: commitmentsOtherInput.value || null,
            supportNeeded: supportNeededSelect.value,
            supportNeededOther: supportNeededOtherInput.value || null,
            authorizedRep: document.getElementById('authorizedRep').value,
            completionDate: document.getElementById('completionDate').value
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
                Thank you for your interest in partnering with Westside Rising. We've received your application
                for <strong>${formData.entityName}</strong> and will review it within 3-5 business days.
            </p>
            <p>
                A confirmation email has been sent to <strong>${formData.email}</strong> with your application details.
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
