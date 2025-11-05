// ===================================
// EVENT SUBMISSION FORM
// ===================================

document.addEventListener('DOMContentLoaded', function() {

    // Get form elements
    const form = document.getElementById('event-submission-form');
    const fileInput = document.getElementById('event-flyer');
    const fileNameDisplay = document.getElementById('file-name');

    // Check if form exists (only on event submission page)
    if (!form) return;

    // File upload handling
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const fileName = file.name;
                const fileSize = (file.size / 1024 / 1024).toFixed(2); // Convert to MB

                // Check file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showMessage('File size must be less than 5MB', 'error');
                    fileInput.value = '';
                    fileNameDisplay.textContent = 'No file chosen';
                    return;
                }

                // Check file type
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
                if (!allowedTypes.includes(file.type)) {
                    showMessage('Please upload a JPG, PNG, or PDF file', 'error');
                    fileInput.value = '';
                    fileNameDisplay.textContent = 'No file chosen';
                    return;
                }

                fileNameDisplay.textContent = `${fileName} (${fileSize} MB)`;
                fileNameDisplay.style.color = 'var(--primary-red)';
            } else {
                fileNameDisplay.textContent = 'No file chosen';
                fileNameDisplay.style.color = '';
            }
        });

        // Drag and drop functionality
        const fileUploadLabel = document.querySelector('.file-upload-label');

        fileUploadLabel.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.borderColor = 'var(--primary-red)';
            this.style.background = 'rgba(227, 30, 36, 0.1)';
        });

        fileUploadLabel.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.borderColor = '';
            this.style.background = '';
        });

        fileUploadLabel.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.borderColor = '';
            this.style.background = '';

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                const event = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(event);
            }
        });
    }

    // Form validation
    function validateForm() {
        const orgName = document.getElementById('org-name').value.trim();
        const eventTitle = document.getElementById('event-title').value.trim();
        const eventMonth = document.getElementById('event-month').value;
        const eventDay = document.getElementById('event-day').value;
        const eventYear = document.getElementById('event-year').value;
        const eventLocation = document.getElementById('event-location').value.trim();

        // Check required fields
        if (!orgName) {
            showMessage('Please enter your organization name', 'error');
            return false;
        }

        if (!eventTitle) {
            showMessage('Please enter an event title', 'error');
            return false;
        }

        if (!eventMonth || !eventDay || !eventYear) {
            showMessage('Please enter a complete event date', 'error');
            return false;
        }

        if (!eventLocation) {
            showMessage('Please enter an event location', 'error');
            return false;
        }

        // Validate date
        const day = parseInt(eventDay);
        const year = parseInt(eventYear);
        const month = parseInt(eventMonth);

        if (day < 1 || day > 31) {
            showMessage('Please enter a valid day (1-31)', 'error');
            return false;
        }

        if (year < 2024 || year > 2030) {
            showMessage('Please enter a valid year (2024-2030)', 'error');
            return false;
        }

        // Check if date is valid for the selected month
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day > daysInMonth) {
            showMessage(`The selected month only has ${daysInMonth} days`, 'error');
            return false;
        }

        // Check if date is in the past
        const selectedDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            showMessage('Event date cannot be in the past', 'error');
            return false;
        }

        return true;
    }

    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            return;
        }

        // Get form data
        const formData = new FormData(form);

        // Simulate form submission (in production, this would send to a server)
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitButton.disabled = true;

        // Simulate API call
        setTimeout(() => {
            // Success message
            showMessage('Event submitted successfully! We\'ll review it and get back to you soon.', 'success');

            // Reset form
            form.reset();
            fileNameDisplay.textContent = 'No file chosen';
            fileNameDisplay.style.color = '';

            // Reset button
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;

            // Redirect to events page after 2 seconds
            setTimeout(() => {
                window.location.href = 'events.html';
            }, 2000);
        }, 1500);
    });

    // Auto-fill current year if year field is empty
    const yearField = document.getElementById('event-year');
    if (yearField && !yearField.value) {
        yearField.value = new Date().getFullYear();
    }

    // Message notification function
    function showMessage(message, type) {
        // Remove any existing messages
        const existingMessage = document.querySelector('.notification-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `notification-message ${type}`;
        messageDiv.textContent = message;

        // Style the message
        messageDiv.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 1rem 2rem;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;

        document.body.appendChild(messageDiv);

        // Remove after 5 seconds
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => messageDiv.remove(), 300);
        }, 5000);
    }

    // Input validation on blur
    const inputs = form.querySelectorAll('input[required], select[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value.trim() === '' && this.hasAttribute('required')) {
                this.style.borderColor = '#ef4444';
            } else {
                this.style.borderColor = '';
            }
        });

        input.addEventListener('input', function() {
            if (this.value.trim() !== '') {
                this.style.borderColor = '';
            }
        });
    });

});
