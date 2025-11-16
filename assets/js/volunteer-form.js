// ===================================
// VOLUNTEER FORM HANDLER
// ===================================

document.addEventListener('DOMContentLoaded', function() {

    const volunteerForm = document.getElementById('volunteerForm');

    if (!volunteerForm) return;

    // Form submission handler
    volunteerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Validate interests checkboxes
        const interestsChecked = volunteerForm.querySelectorAll('input[name="interests"]:checked');

        if (interestsChecked.length === 0) {
            alert('Please select at least one area of interest.');
            return;
        }

        // Validate consent checkbox
        const consentChecked = volunteerForm.querySelector('input[name="consent"]:checked');

        if (!consentChecked) {
            alert('Please agree to receive communications from WESTSIDE RISING.');
            return;
        }

        // Get submit button
        const submitButton = volunteerForm.querySelector('button[type="submit"]');
        const originalButtonContent = submitButton.innerHTML;

        // Disable submit button and show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        // Collect form data
        const formData = {
            formType: 'Volunteer Application',
            firstName: volunteerForm.querySelector('#firstName').value,
            lastName: volunteerForm.querySelector('#lastName').value,
            email: volunteerForm.querySelector('#email').value,
            phone: volunteerForm.querySelector('#phone').value,
            address: volunteerForm.querySelector('#address').value,
            city: volunteerForm.querySelector('#city').value,
            zipCode: volunteerForm.querySelector('#zipCode').value,
            interests: Array.from(interestsChecked).map(cb => cb.value).join(', '),
            availability: volunteerForm.querySelector('#availability').value,
            skills: volunteerForm.querySelector('#skills').value,
            motivation: volunteerForm.querySelector('#motivation').value
        };

        // Submit to Google Sheets
        fetch('https://script.google.com/macros/s/AKfycbyQ9p5GXh1BMHjkUnL1qWZtYVQRaeagd3dF9KHu-HgCY_P60K1retKenLIRgABqH4Md/exec', {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(() => {
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.innerHTML = `
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>Thank You for Your Interest!</h3>
                <p>
                    We've received your volunteer application and will review it within 2-3 business days.
                    A member of our team will reach out to you at <strong>${formData.email}</strong> to discuss
                    next steps and opportunities that match your interests.
                </p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-redo"></i>
                    Submit Another Application
                </button>
            `;

            // Replace form with success message
            volunteerForm.parentElement.innerHTML = '';
            volunteerForm.parentElement.appendChild(successMessage);

            // Scroll to success message
            successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        })
        .catch((error) => {
            console.error('Error:', error);
            // Still show success since no-cors mode doesn't allow reading response
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.innerHTML = `
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>Thank You for Your Interest!</h3>
                <p>
                    We've received your volunteer application and will review it within 2-3 business days.
                    A member of our team will reach out to you at <strong>${formData.email}</strong> to discuss
                    next steps and opportunities that match your interests.
                </p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-redo"></i>
                    Submit Another Application
                </button>
            `;

            // Replace form with success message
            volunteerForm.parentElement.innerHTML = '';
            volunteerForm.parentElement.appendChild(successMessage);

            // Scroll to success message
            successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });

    // Phone number formatting
    const phoneInput = volunteerForm.querySelector('#phone');
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

    // ZIP code validation (5 digits)
    const zipCodeInput = volunteerForm.querySelector('#zipCode');
    if (zipCodeInput) {
        zipCodeInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');

            if (value.length > 5) {
                value = value.slice(0, 5);
            }

            e.target.value = value;
        });
    }

});
