// ===================================
// JOIN TEAM / EMPLOYMENT APPLICATION FORM HANDLER
// ===================================
import { db, storage } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

document.addEventListener('DOMContentLoaded', function() {

    const form = document.getElementById('joinTeamForm');
    if (!form) return;

    // ===== CONDITIONAL: Position Other =====
    form.querySelectorAll('input[name="position"]').forEach(cb => {
        cb.addEventListener('change', function() {
            const group = document.getElementById('positionOtherGroup');
            if (group) group.style.display = this.value === 'other' && this.checked ? 'block' : 'none';
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
    form.addEventListener('submit', async function(e) {
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

        const positionCheckboxes = form.querySelectorAll('input[name="position"]:checked');
        const positions = [];
        positionCheckboxes.forEach(cb => {
            if (cb.value === 'other') {
                const otherVal = form.querySelector('#positionOtherInput')?.value.trim();
                positions.push(otherVal || 'Other');
            } else {
                positions.push(cb.value);
            }
        });
        if (positions.length === 0) {
            alert('Please select at least one position.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnContent;
            return;
        }

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
        const resumeFile = resumeInput && resumeInput.files[0] ? resumeInput.files[0] : null;
        const resumeFilename = resumeFile ? resumeFile.name : '';

        // Upload resume to Firebase Storage if provided
        let resumeUrl = '';
        if (resumeFile) {
            // Warn if file is over 5MB
            if (resumeFile.size > 5 * 1024 * 1024) {
                alert('Your resume file is over 5MB. Please use a smaller file (PDF or Word doc) for faster upload.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
                return;
            }
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading resume...';
            try {
                const timeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('timeout')), 60000)
                );
                const storageRef = ref(storage, `resumes/${Date.now()}_${resumeFilename}`);
                const snapshot = await Promise.race([uploadBytes(storageRef, resumeFile), timeout]);
                resumeUrl = await getDownloadURL(snapshot.ref);
            } catch (uploadError) {
                console.error('Resume upload error:', uploadError);
                const msg = uploadError.message === 'timeout'
                    ? 'Resume upload timed out. Please check your connection and try again, or use a smaller file.'
                    : 'Failed to upload resume. Please try again.';
                alert(msg);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
                return;
            }
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        }

        const formData = {
            formType: 'Employment Application',
            email: form.querySelector('#email').value.trim(),
            fullName: form.querySelector('#fullName').value.trim(),
            address: form.querySelector('#address').value.trim(),
            phone: form.querySelector('#phone').value.trim(),
            positions,
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
            resumeUrl,
            reference1: form.querySelector('#reference1').value.trim(),
            reference2: form.querySelector('#reference2').value.trim(),
            reference3: form.querySelector('#reference3').value.trim(),
            signature: form.querySelector('#signature').value.trim(),
            todaysDate: form.querySelector('#todaysDate').value,
            status: 'new',
            submittedAt: serverTimestamp()
        };

        try {
            await addDoc(collection(db, 'joinTeamApplications'), formData);
            showSuccess(formData.email, form);
        } catch (error) {
            console.error('Firestore error:', error);
            alert('There was an error submitting your application. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnContent;
        }
    });

});

function showSuccess(email, form) {
    const parent = form.parentElement;
    parent.innerHTML = `
        <div style="max-width:680px;margin:4rem auto;padding:0 1.5rem;font-family:'Source Sans Pro',sans-serif;">

            <div style="text-align:center;margin-bottom:2.5rem;">
                <div style="width:84px;height:84px;background:linear-gradient(135deg,#e31e24,#b01519);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;box-shadow:0 8px 24px rgba(227,30,36,0.3);">
                    <i class="fas fa-check" style="color:white;font-size:2.2rem;"></i>
                </div>
                <h1 style="font-family:'Playfair Display',serif;font-size:2.2rem;font-weight:800;color:#1a1a1a;margin:0 0 0.5rem;">Application Received</h1>
                <p style="color:#666;font-size:1.05rem;margin:0;">We have everything we need — here is what comes next.</p>
            </div>

            <div style="background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.07);padding:2rem;margin-bottom:1.5rem;border-top:4px solid #e31e24;">
                <p style="color:#444;font-size:1rem;line-height:1.8;margin:0;">
                    Thank you for your interest in joining the Westside Rising team. Your employment application has been successfully submitted and is now under review. Our hiring team will follow up with you at <strong style="color:#1a1a1a;">${email}</strong> within 5–7 business days.
                </p>
            </div>

            <div style="background:#fff8f8;border-radius:16px;border:1px solid #ffd0d0;padding:2rem;margin-bottom:1rem;">
                <div style="display:flex;align-items:flex-start;gap:1.25rem;">
                    <div style="background:#e31e24;border-radius:50%;width:44px;height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(227,30,36,0.25);">
                        <i class="fas fa-clipboard-list" style="color:white;font-size:1.1rem;"></i>
                    </div>
                    <div>
                        <h3 style="font-family:'Playfair Display',serif;font-size:1.25rem;font-weight:700;color:#1a1a1a;margin:0 0 0.6rem;">Complete Your Candidate Assessment</h3>
                        <p style="color:#555;font-size:0.95rem;line-height:1.7;margin:0 0 1.25rem;">
                            Completing the candidate assessment is a required part of our hiring process. It gives our team a fuller picture of how you approach work, collaboration, and problem-solving — and helps us find the right fit for both you and Westside Rising.
                        </p>
                        <a href="${window.location.origin}/assessment" target="_blank" rel="noopener noreferrer"
                           style="display:inline-flex;align-items:center;gap:0.6rem;background:linear-gradient(135deg,#e31e24,#b01519);color:white;text-decoration:none;padding:0.85rem 1.75rem;border-radius:10px;font-weight:700;font-size:1rem;box-shadow:0 4px 14px rgba(227,30,36,0.3);letter-spacing:0.01em;">
                            <i class="fas fa-external-link-alt" style="font-size:0.9rem;"></i>
                            Start the Assessment
                        </a>
                    </div>
                </div>
            </div>

        </div>
    `;
    parent.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
