import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('newsletter-form');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const nameInput = form.querySelector('input[name="name"]');
        const phoneInput = form.querySelector('input[name="phone"]');
        const emailInput = form.querySelector('input[name="email"]');
        const button = form.querySelector('button[type="submit"]');

        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const email = emailInput.value.trim();

        if (!name) {
            showMessage('Please enter your name.', 'error');
            return;
        }
        if (!email || !email.includes('@')) {
            showMessage('Please enter a valid email address.', 'error');
            return;
        }

        const originalContent = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subscribing...';

        try {
            await addDoc(collection(db, 'subscribers'), {
                name,
                phone,
                email,
                subscribedAt: serverTimestamp()
            });
            showMessage('Thank you for subscribing!', 'success');
            nameInput.value = '';
            phoneInput.value = '';
            emailInput.value = '';
        } catch (err) {
            console.error('Newsletter subscription error:', err);
            showMessage('Something went wrong. Please try again.', 'error');
        } finally {
            button.disabled = false;
            button.innerHTML = originalContent;
        }
    });
});

function showMessage(text, type) {
    let msgEl = document.getElementById('newsletter-message');
    if (!msgEl) {
        msgEl = document.createElement('p');
        msgEl.id = 'newsletter-message';
        msgEl.style.cssText = 'margin-top:0.75rem;font-size:0.95rem;font-weight:600;text-align:center;';
        const form = document.getElementById('newsletter-form');
        if (form) form.parentElement.appendChild(msgEl);
    }
    msgEl.textContent = text;
    msgEl.style.color = type === 'success' ? '#059669' : '#dc2626';
    setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 5000);
}
