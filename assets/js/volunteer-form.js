// ===================================
// VOLUNTEER FORM HANDLER
// ===================================
import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {

    const volunteerForm = document.getElementById('volunteerForm');

    if (!volunteerForm) return;

    // Toggle "Other" text input for helpBy
    const helpByOtherCheckbox = document.getElementById('helpByOther');
    if (helpByOtherCheckbox) {
        helpByOtherCheckbox.addEventListener('change', function() {
            const group = document.getElementById('helpByOtherGroup');
            if (group) group.style.display = this.checked ? 'block' : 'none';
        });
    }

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
            interests: Array.from(interestsChecked).map(cb => cb.value),
            helpBy: Array.from(volunteerForm.querySelectorAll('input[name="helpBy"]:checked')).map(cb => cb.value),
            helpByOther: volunteerForm.querySelector('#helpByOtherInput') ? volunteerForm.querySelector('#helpByOtherInput').value.trim() : '',
            availability: volunteerForm.querySelector('#availability').value,
            skills: volunteerForm.querySelector('#skills').value,
            motivation: volunteerForm.querySelector('#motivation').value,
            status: 'new',
            submittedAt: serverTimestamp()
        };

        // Submit to Firestore
        addDoc(collection(db, 'volunteerApplications'), formData)
            .then(() => {
                showVolunteerSuccess(formData.email, volunteerForm);
            })
            .catch((error) => {
                console.error('Firestore error:', error);
                alert('There was an error submitting your application. Please try again.');
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonContent;
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

function showVolunteerSuccess(email, form) {
    const parent = form.parentElement;
    parent.innerHTML = `
        <div style="max-width:680px;margin:4rem auto;padding:0 1.5rem;font-family:'Source Sans Pro',sans-serif;">

            <div style="text-align:center;margin-bottom:2.5rem;">
                <div style="width:84px;height:84px;background:linear-gradient(135deg,#e31e24,#b01519);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;box-shadow:0 8px 24px rgba(227,30,36,0.3);">
                    <i class="fas fa-hands-helping" style="color:white;font-size:1.8rem;"></i>
                </div>
                <h1 style="font-family:'Playfair Display',serif;font-size:2.2rem;font-weight:800;color:#1a1a1a;margin:0 0 0.5rem;">Thank You for Stepping Up!</h1>
                <p style="color:#666;font-size:1.05rem;margin:0;">Your volunteer application has been received.</p>
            </div>

            <div style="background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.07);padding:2rem;margin-bottom:1.5rem;border-top:4px solid #e31e24;">
                <p style="color:#444;font-size:1rem;line-height:1.8;margin:0;">
                    We are grateful for your willingness to serve the Westside Rising community. Your application has been submitted and a member of our team will reach out to you at <strong style="color:#1a1a1a;">${email}</strong> within 2–3 business days to discuss opportunities that match your interests and availability.
                </p>
            </div>

            <div style="background:#fff8f8;border-radius:16px;border:1px solid #ffd0d0;padding:2rem;margin-bottom:1rem;">
                <div style="display:flex;align-items:flex-start;gap:1.25rem;">
                    <div style="background:#e31e24;border-radius:50%;width:44px;height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(227,30,36,0.25);">
                        <i class="fas fa-clipboard-check" style="color:white;font-size:1.1rem;"></i>
                    </div>
                    <div>
                        <h3 style="font-family:'Playfair Display',serif;font-size:1.25rem;font-weight:700;color:#1a1a1a;margin:0 0 0.6rem;">Complete a Short Assessment</h3>
                        <p style="color:#555;font-size:0.95rem;line-height:1.7;margin:0 0 1.25rem;">
                            While we review your application, we would love for you to complete a brief assessment. This helps us better understand your strengths and how you work — so we can connect you with the volunteer opportunities where you will make the most impact.
                        </p>
                        <a href="${window.location.origin}/assessment" target="_blank" rel="noopener noreferrer"
                           style="display:inline-flex;align-items:center;gap:0.6rem;background:linear-gradient(135deg,#e31e24,#b01519);color:white;text-decoration:none;padding:0.85rem 1.75rem;border-radius:10px;font-weight:700;font-size:1rem;box-shadow:0 4px 14px rgba(227,30,36,0.3);letter-spacing:0.01em;">
                            <i class="fas fa-external-link-alt" style="font-size:0.9rem;"></i>
                            Complete Assessment
                        </a>
                    </div>
                </div>
            </div>

        </div>
    `;
    parent.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
