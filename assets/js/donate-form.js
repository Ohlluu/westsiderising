// ===================================
// DONATION FORM HANDLER
// ===================================

document.addEventListener('DOMContentLoaded', function() {

    const donationForm = document.getElementById('donationForm');

    if (!donationForm) return;

    // ===== DONATION TYPE TOGGLE =====
    const typeOptions = document.querySelectorAll('.type-option');

    typeOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            typeOptions.forEach(opt => opt.classList.remove('active'));

            // Add active class to clicked option
            this.classList.add('active');

            // Check the radio button
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }
        });
    });

    // ===== AMOUNT SELECTION =====
    const amountOptions = document.querySelectorAll('.amount-option');
    const customAmountGroup = document.querySelector('.custom-amount-group');
    const customAmountInput = document.getElementById('customAmount');

    amountOptions.forEach(option => {
        option.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }

            // Show/hide custom amount input
            const amount = this.getAttribute('data-amount');
            if (amount === 'custom') {
                customAmountGroup.style.display = 'block';
                customAmountInput.focus();
                customAmountInput.required = true;
            } else {
                customAmountGroup.style.display = 'none';
                customAmountInput.value = '';
                customAmountInput.required = false;
            }
        });
    });

    // Validate custom amount
    if (customAmountInput) {
        customAmountInput.addEventListener('input', function() {
            const value = parseFloat(this.value);
            if (value < 5) {
                this.setCustomValidity('Minimum donation amount is $5');
            } else {
                this.setCustomValidity('');
            }
        });
    }

    // ===== DEDICATION OPTIONS =====
    const dedicationRadios = document.querySelectorAll('input[name="dedicationType"]');
    const dedicationNameGroup = document.querySelector('.dedication-name-group');
    const dedicationNameInput = document.getElementById('dedicationName');

    dedicationRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'none') {
                dedicationNameGroup.style.display = 'none';
                dedicationNameInput.value = '';
                dedicationNameInput.required = false;
            } else {
                dedicationNameGroup.style.display = 'block';
                dedicationNameInput.required = true;

                // Update label based on selection
                const label = dedicationNameGroup.querySelector('label');
                if (this.value === 'honor') {
                    label.innerHTML = 'Honoree Name <span class="required">*</span>';
                } else {
                    label.innerHTML = 'Name of Loved One <span class="required">*</span>';
                }
            }
        });
    });

    // ===== PHONE NUMBER FORMATTING =====
    const phoneInput = document.getElementById('donorPhone');
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

    // ===== FORM SUBMISSION =====
    donationForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Get selected donation type
        const donationType = document.querySelector('input[name="donationType"]:checked').value;

        // Get selected amount
        const amountRadio = document.querySelector('input[name="amount"]:checked');
        let donationAmount;

        if (!amountRadio) {
            alert('Please select a donation amount.');
            return;
        }

        if (amountRadio.value === 'custom') {
            donationAmount = parseFloat(customAmountInput.value);
            if (!donationAmount || donationAmount < 5) {
                alert('Please enter a valid donation amount (minimum $5).');
                customAmountInput.focus();
                return;
            }
            // Redirect to custom amount Stripe link
            window.location.href = 'https://donate.stripe.com/dRm14oaS9dW56vSdBt67S05';
            return;
        } else {
            donationAmount = parseFloat(amountRadio.value);
        }

        // Get dedication info
        const dedicationType = document.querySelector('input[name="dedicationType"]:checked').value;
        let dedication = null;
        if (dedicationType !== 'none') {
            dedication = {
                type: dedicationType,
                name: dedicationNameInput.value
            };
        }

        // Collect form data
        const formData = {
            type: donationType,
            amount: donationAmount,
            firstName: document.getElementById('donorFirstName').value,
            lastName: document.getElementById('donorLastName').value,
            email: document.getElementById('donorEmail').value,
            phone: phoneInput ? phoneInput.value : '',
            anonymous: document.getElementById('anonymous').checked,
            mailingList: document.getElementById('mailingList').checked,
            dedication: dedication
        };

        console.log('Donation Data:', formData);

        // ===== STRIPE PAYMENT LINKS =====
        const stripeLinks = {
            'one-time': {
                50: 'https://donate.stripe.com/3cI8wQ4tL7xH07ueFx67S00',
                100: 'https://donate.stripe.com/aFaaEY6BT2dnaM80OH67S01',
                250: 'https://donate.stripe.com/5kQ9AU5xP9FP07u2WP67S02',
                500: 'https://donate.stripe.com/dRmbJ22lD9FP3jG54X67S03',
                1000: 'https://donate.stripe.com/4gM28s4tL19j5rO0OH67S04'
            },
            'monthly': {
                50: 'https://donate.stripe.com/5kQ14of8p7xH8E0dBt67S06',
                100: 'https://donate.stripe.com/8x2eVe6BTf099I41SL67S07',
                250: 'https://donate.stripe.com/7sY4gA1hz19j7zWbtl67S08',
                500: 'https://donate.stripe.com/bJefZif8pbNXdYk40T67S09',
                1000: 'https://donate.stripe.com/8x228s0dv6tD3jGfJB67S0a'
            }
        };

        // Check if Stripe link exists for this amount and type
        const stripeLink = stripeLinks[donationType][donationAmount];

        if (stripeLink && stripeLink !== '') {
            // Redirect to Stripe payment link
            window.location.href = stripeLink;
        } else {
            // Show message if link not available yet
            alert(`Payment processing for $${donationAmount} ${donationType} donations is being set up. Please contact us at wr.info@westsiderising.org or call (773) 417-6605 to complete your donation. Thank you!`);
        }
    });

    // ===== SUCCESS MESSAGE =====
    function showSuccessMessage(data) {
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message fade-in-up';

        const frequencyText = data.type === 'monthly' ? 'monthly donation' : 'donation';
        const amountFormatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(data.amount);

        successMessage.innerHTML = `
            <div class="success-icon">
                <i class="fas fa-heart"></i>
            </div>
            <h3>Thank You for Your Generosity!</h3>
            <p>
                Your ${frequencyText} of <strong>${amountFormatted}</strong> will make a meaningful impact
                in the Greater West Side community. We've sent a confirmation email to <strong>${data.email}</strong>
                with your tax receipt and donation details.
            </p>
            ${data.dedication ? `
                <p class="dedication-message">
                    <i class="fas fa-star"></i>
                    This gift has been made <strong>${data.dedication.type === 'honor' ? 'in honor of' : 'in memory of'}</strong>
                    <strong>${data.dedication.name}</strong>
                </p>
            ` : ''}
            <div class="success-actions">
                <a href="index.html" class="btn btn-primary">
                    <i class="fas fa-home"></i>
                    Return Home
                </a>
                <button class="btn btn-secondary" onclick="location.reload()">
                    <i class="fas fa-redo"></i>
                    Make Another Donation
                </button>
            </div>
            <div class="share-donation">
                <p>Share your support:</p>
                <div class="social-share">
                    <a href="#" class="share-btn facebook" aria-label="Share on Facebook">
                        <i class="fab fa-facebook-f"></i>
                    </a>
                    <a href="#" class="share-btn twitter" aria-label="Share on Twitter">
                        <i class="fab fa-twitter"></i>
                    </a>
                    <a href="#" class="share-btn email" aria-label="Share via Email">
                        <i class="fas fa-envelope"></i>
                    </a>
                </div>
            </div>
        `;

        // Replace form with success message
        const formContainer = donationForm.closest('.donation-form-container');
        formContainer.innerHTML = '';
        formContainer.appendChild(successMessage);

        // Scroll to success message
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

});
