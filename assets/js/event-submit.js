import { db, storage } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const submitForm = document.getElementById('event-submit-form');
const submitBtn = document.getElementById('submit-btn');

submitForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        // Get form data
        const formData = {
            eventTitle: document.getElementById('eventTitle').value,
            eventType: document.getElementById('eventType').value,
            eventDate: document.getElementById('eventDate').value,
            eventTime: document.getElementById('eventTime').value,
            eventLocation: document.getElementById('eventLocation').value,
            eventDescription: document.getElementById('eventDescription').value,
            organizerName: document.getElementById('organizerName').value,
            organizerEmail: document.getElementById('organizerEmail').value,
            organizerPhone: document.getElementById('organizerPhone').value,
            expectedAttendees: document.getElementById('expectedAttendees').value,
            registrationRequired: document.getElementById('registrationRequired').checked,
            registrationLink: document.getElementById('registrationLink')?.value || '',
            status: 'pending',
            submittedAt: new Date().toISOString()
        };

        // Handle image upload if provided
        const imageFile = document.getElementById('eventImage')?.files[0];
        if (imageFile) {
            // Upload image to Firebase Storage
            const storageRef = ref(storage, `event-images/${Date.now()}_${imageFile.name}`);
            const snapshot = await uploadBytes(storageRef, imageFile);
            const imageURL = await getDownloadURL(snapshot.ref);
            formData.eventImage = imageURL;
        }

        // Add event to Firestore
        const docRef = await addDoc(collection(db, 'events'), formData);

        // Show success message
        alert('Thank you! Your event has been submitted for review. You will be notified once it is approved.');

        // Reset form
        submitForm.reset();

        // Redirect to events page
        setTimeout(() => {
            window.location.href = 'events.html';
        }, 2000);

    } catch (error) {
        console.error('Error submitting event:', error);
        alert('Error submitting event. Please try again or contact support.');

        // Reset button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Event';
    }
});

// Show/hide registration link field
const registrationRequired = document.getElementById('registrationRequired');
const registrationLinkGroup = document.getElementById('registrationLinkGroup');

if (registrationRequired && registrationLinkGroup) {
    registrationRequired.addEventListener('change', function() {
        if (this.checked) {
            registrationLinkGroup.style.display = 'block';
        } else {
            registrationLinkGroup.style.display = 'none';
        }
    });
}
