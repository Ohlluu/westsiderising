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

        console.log('Donation Type:', donationType, 'Amount:', donationAmount);

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

});
