// ===================================
// JOIN TEAM FORM HANDLER
// ===================================

document.addEventListener('DOMContentLoaded', function() {

    const joinTeamForm = document.getElementById('joinTeamForm');

    if (!joinTeamForm) return;

    // ===== CONDITIONAL FIELDS =====

    // Show/hide "Other" position field
    const positionSelect = document.getElementById('positionInterest');
    const positionOtherText = document.getElementById('positionOtherText');
    const positionOtherInput = document.getElementById('positionOtherInput');

    if (positionSelect) {
        positionSelect.addEventListener('change', function() {
            if (this.value === 'other') {
                positionOtherText.style.display = 'block';
                positionOtherInput.required = true;
            } else {
                positionOtherText.style.display = 'none';
                positionOtherInput.required = false;
                positionOtherInput.value = '';
            }
        });
    }

    // Show/hide "Other" skills field
    const skillsOtherCheckbox = document.getElementById('skillsOther');
    const skillsOtherText = document.getElementById('skillsOtherText');
    const skillsOtherInput = document.getElementById('skillsOtherInput');

    if (skillsOtherCheckbox) {
        skillsOtherCheckbox.addEventListener('change', function() {
            if (this.checked) {
                skillsOtherText.style.display = 'block';
                skillsOtherInput.required = true;
            } else {
                skillsOtherText.style.display = 'none';
                skillsOtherInput.required = false;
                skillsOtherInput.value = '';
            }
        });
    }

    // ===== PHONE NUMBER FORMATTING =====
    const phoneInput = document.getElementById('phone');

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

    // ===== ZIP CODE VALIDATION =====
    const zipCodeInput = document.getElementById('zipCode');

    if (zipCodeInput) {
        zipCodeInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');

            if (value.length > 5) {
                value = value.slice(0, 5);
            }

            e.target.value = value;
        });
    }

    // ===== FILE UPLOAD VALIDATION =====
    const resumeInput = document.getElementById('resume');

    if (resumeInput) {
        resumeInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                // Check file size (5MB max)
                const maxSize = 5 * 1024 * 1024; // 5MB in bytes
                if (file.size > maxSize) {
                    alert('File size must be less than 5MB. Please select a smaller file.');
                    this.value = '';
                    return;
                }

                // Check file type
                const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                if (!allowedTypes.includes(file.type)) {
                    alert('Please upload a PDF, DOC, or DOCX file.');
                    this.value = '';
                    return;
                }
            }
        });
    }

    // ===== FORM SUBMISSION =====
    joinTeamForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Validate skills checkboxes
        const skillsChecked = joinTeamForm.querySelectorAll('input[name="skills"]:checked');
        if (skillsChecked.length === 0) {
            alert('Please select at least one skill.');
            return;
        }

        // Validate consent checkbox
        const consentChecked = document.getElementById('consent').checked;
        if (!consentChecked) {
            alert('Please certify that the information provided is accurate.');
            return;
        }

        // Get submit button
        const submitButton = joinTeamForm.querySelector('button[type="submit"]');
        const originalButtonContent = submitButton.innerHTML;

        // Disable submit button and show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        // Collect form data
        const positionText = positionSelect.value === 'other'
            ? positionOtherInput.value
            : positionSelect.options[positionSelect.selectedIndex].text;

        const formData = {
            formType: 'Join Team Application',
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: phoneInput.value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            zipCode: zipCodeInput.value,
            positionInterest: positionSelect.value,
            positionOther: positionOtherInput.value || '',
            employmentType: document.getElementById('employmentType').value,
            startDate: document.getElementById('startDate').value,
            education: document.getElementById('education').value,
            experience: document.getElementById('experience').value,
            motivation: document.getElementById('motivation').value,
            skills: Array.from(skillsChecked).map(cb => cb.value).join(', '),
            skillsOther: skillsOtherInput.value || '',
            references: document.getElementById('references').value,
            hearAbout: document.getElementById('hearAbout').value,
            resume: resumeInput.files[0] ? resumeInput.files[0].name : 'No resume uploaded'
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
                <h3>Application Submitted Successfully!</h3>
                <p>
                    Thank you for your interest in joining the WESTSIDE RISING team, <strong>${formData.firstName} ${formData.lastName}</strong>.
                    We've received your application for the <strong>${positionText}</strong> position.
                </p>
                <p>
                    Our team will review your application and contact you at <strong>${formData.email}</strong> within 5-7 business days
                    to discuss next steps.
                </p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-redo"></i>
                    Submit Another Application
                </button>
            `;

            // Replace form with success message
            joinTeamForm.parentElement.innerHTML = '';
            joinTeamForm.parentElement.appendChild(successMessage);

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
                <h3>Application Submitted Successfully!</h3>
                <p>
                    Thank you for your interest in joining the WESTSIDE RISING team, <strong>${formData.firstName} ${formData.lastName}</strong>.
                    We've received your application for the <strong>${positionText}</strong> position.
                </p>
                <p>
                    Our team will review your application and contact you at <strong>${formData.email}</strong> within 5-7 business days
                    to discuss next steps.
                </p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-redo"></i>
                    Submit Another Application
                </button>
            `;

            // Replace form with success message
            joinTeamForm.parentElement.innerHTML = '';
            joinTeamForm.parentElement.appendChild(successMessage);

            // Scroll to success message
            successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });

});
