document.addEventListener('DOMContentLoaded', async function () {
    const form = document.getElementById('assessment-form');
    if (!form) return;

    const submitBtn = document.getElementById('submit-btn');

    // Keep button disabled until Firebase confirms it loaded
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

    let db, collection, addDoc, serverTimestamp;

    try {
        const [configModule, firestoreModule] = await Promise.all([
            import('./firebase-config.js'),
            import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js")
        ]);
        db = configModule.db;
        collection = firestoreModule.collection;
        addDoc = firestoreModule.addDoc;
        serverTimestamp = firestoreModule.serverTimestamp;

        if (!db) throw new Error('Firestore not initialized');

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Assessment';
    } catch (err) {
        console.error('Firebase failed to load:', err);
        submitBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Unable to Connect';
        const errorEl = document.getElementById('firebase-error');
        if (errorEl) errorEl.style.display = 'block';
        return;
    }

    const getRadio = (name) => {
        const checked = form.querySelector(`input[name="${name}"]:checked`);
        return checked ? parseInt(checked.value) : null;
    };

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        const radioGroups = [
            's1q1','s1q2','s1q3','s1q4','s1q5',
            's2q1','s2q2','s2q3','s2q4','s2q5',
            's3q1','s3q2','s3q3','s3q4','s3q5',
            's4q1','s4q2','s4q3','s4q4','s4q5'
        ];
        for (const name of radioGroups) {
            if (!getRadio(name)) {
                alert('Please answer all rating questions before submitting.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Assessment';
                return;
            }
        }

        const data = {
            formType: 'Candidate Assessment',
            candidateName: document.getElementById('candidateName').value.trim(),
            positionApplied: document.getElementById('positionApplied').value.trim(),
            assessmentDate: document.getElementById('assessmentDate').value,
            accountability: {
                q1: getRadio('s1q1'),
                q2: getRadio('s1q2'),
                q3: getRadio('s1q3'),
                q4: getRadio('s1q4'),
                q5: getRadio('s1q5'),
            },
            teamwork: {
                q1: getRadio('s2q1'),
                q2: getRadio('s2q2'),
                q3: getRadio('s2q3'),
                q4: getRadio('s2q4'),
                q5: getRadio('s2q5'),
            },
            initiative: {
                q1: getRadio('s3q1'),
                q2: getRadio('s3q2'),
                q3: getRadio('s3q3'),
                q4: getRadio('s3q4'),
                q5: getRadio('s3q5'),
            },
            criticalThinking: {
                q1: getRadio('s4q1'),
                q2: getRadio('s4q2'),
                q3: getRadio('s4q3'),
                q4: getRadio('s4q4'),
                q5: getRadio('s4q5'),
            },
            situational: {
                q1: document.getElementById('sq1').value.trim(),
                q2: document.getElementById('sq2').value.trim(),
                q3: document.getElementById('sq3').value.trim(),
                q4: document.getElementById('sq4').value.trim(),
            },
            status: 'new',
            submittedAt: serverTimestamp()
        };

        try {
            await addDoc(collection(db, 'assessmentSubmissions'), data);
            showSuccess(data.candidateName);
        } catch (err) {
            console.error('Submission error:', err);
            const msg = err.code === 'permission-denied'
                ? 'Submission blocked by server. Please contact support.'
                : 'There was an error submitting your assessment. Please check your connection and try again.';
            alert(msg);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Assessment';
        }
    });
});

function showSuccess(name) {
    const wrapper = document.getElementById('form-wrapper');
    wrapper.innerHTML = `
        <div class="success-card">
            <i class="fas fa-check-circle"></i>
            <h2>Assessment Submitted!</h2>
            <p>Thank you, <strong>${name}</strong>. Your assessment has been received and will be reviewed by our team. We appreciate your time and interest in joining Westside Rising.</p>
        </div>
    `;
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
