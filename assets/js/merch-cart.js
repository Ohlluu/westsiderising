// Shopping Cart Management
let cart = JSON.parse(localStorage.getItem('westsideRisingCart')) || [];

// DOM Elements
const cartButton = document.getElementById('cart-button');
const cartCount = document.getElementById('cart-count');
const cartSidebar = document.getElementById('cart-sidebar');
const cartClose = document.getElementById('cart-close');
const cartOverlay = document.getElementById('cart-overlay');
const cartContent = document.getElementById('cart-content');
const cartFooter = document.getElementById('cart-footer');
const totalAmount = document.getElementById('total-amount');
const checkoutButton = document.getElementById('checkout-button');
const addToCartButtons = document.querySelectorAll('.add-to-cart');

// Initialize
updateCartUI();

// Add to cart event listeners
addToCartButtons.forEach(button => {
    button.addEventListener('click', function() {
        const productCard = this.closest('.product-card');
        const productId = this.dataset.productId;
        const productName = this.dataset.productName;
        const productPrice = parseFloat(this.dataset.productPrice);

        // Get selected options
        const sizeSelect = productCard.querySelector('.size-select');
        const colorSelect = productCard.querySelector('.color-select');

        const size = sizeSelect ? sizeSelect.value : null;
        const color = colorSelect ? colorSelect.value : null;

        // Add to cart
        addToCart({
            id: productId,
            name: productName,
            price: productPrice,
            size: size,
            color: color,
            quantity: 1
        });

        // Show feedback
        this.innerHTML = '<i class="fas fa-check"></i> Added to Cart';
        this.style.background = 'linear-gradient(135deg, #28a745, #20c997)';

        setTimeout(() => {
            this.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
            this.style.background = '';
        }, 1500);
    });
});

// Cart button click
cartButton.addEventListener('click', () => {
    openCart();
});

// Close cart
cartClose.addEventListener('click', () => {
    closeCart();
});

// Overlay click
cartOverlay.addEventListener('click', () => {
    closeCart();
});

// Checkout button
checkoutButton.addEventListener('click', () => {
    handleCheckout();
});

// Add to cart function
function addToCart(product) {
    const existingItem = cart.find(item =>
        item.id === product.id &&
        item.size === product.size &&
        item.color === product.color
    );

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push(product);
    }

    saveCart();
    updateCartUI();
}

// Remove from cart
function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
}

// Update quantity
function updateQuantity(index, change) {
    cart[index].quantity += change;

    if (cart[index].quantity <= 0) {
        removeFromCart(index);
    } else {
        saveCart();
        updateCartUI();
    }
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('westsideRisingCart', JSON.stringify(cart));
}

// Update cart UI
function updateCartUI() {
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    // Update cart content
    if (cart.length === 0) {
        cartContent.innerHTML = '<p class="cart-empty">Your cart is empty</p>';
        cartFooter.style.display = 'none';
    } else {
        cartContent.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-image">
                    <i class="fas fa-tshirt"></i>
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    ${item.size ? `<div class="cart-item-options">Size: ${item.size}${item.color ? `, Color: ${item.color}` : ''}</div>` : item.color ? `<div class="cart-item-options">Color: ${item.color}</div>` : ''}
                    <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateQuantity(${index}, -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${index}, 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <button class="remove-item" onclick="removeFromCart(${index})" aria-label="Remove item">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        // Update total
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        totalAmount.textContent = `$${total.toFixed(2)}`;

        cartFooter.style.display = 'block';
    }
}

// Open cart
function openCart() {
    cartSidebar.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close cart
function closeCart() {
    cartSidebar.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Handle checkout with Stripe
async function handleCheckout() {
    if (cart.length === 0) return;

    // Show loading state
    checkoutButton.disabled = true;
    checkoutButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        // TODO: Replace with your Stripe publishable key
        const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_STRIPE_KEY_HERE';

        // In a real implementation, you would:
        // 1. Send cart data to your backend
        // 2. Backend creates Stripe Checkout Session
        // 3. Redirect to Stripe Checkout

        // For now, we'll show an alert with instructions
        alert(
            'Stripe integration setup needed:\n\n' +
            '1. Sign up for a Stripe account at stripe.com\n' +
            '2. Get your API keys from the Stripe Dashboard\n' +
            '3. Create a backend endpoint to create checkout sessions\n' +
            '4. Update the STRIPE_PUBLISHABLE_KEY in merch-cart.js\n\n' +
            'Your cart total: $' + cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)
        );

        // Example of what the Stripe integration would look like:
        /*
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cart })
        });

        const session = await response.json();

        const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
        const result = await stripe.redirectToCheckout({
            sessionId: session.id
        });

        if (result.error) {
            alert(result.error.message);
        }
        */

    } catch (error) {
        console.error('Checkout error:', error);
        alert('There was an error processing your checkout. Please try again.');
    } finally {
        checkoutButton.disabled = false;
        checkoutButton.innerHTML = '<i class="fas fa-lock"></i> Checkout with Stripe';
    }
}

// Make functions global for onclick handlers
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
