// Global variables
let currentAdmin = null;
let isMainAdmin = false;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Mobile navigation
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');

    hamburger.addEventListener('click', function() {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                // Close mobile menu if open
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
            }
        });
    });

    // Load events on page load
    loadEvents();

    // Modal functionality
    setupModals();
});

// Modal Setup
function setupModals() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');

    // Close modal when clicking X
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Show Admin Modal
function showAdminModal() {
    const modal = document.getElementById('admin-modal');
    const adminPanel = document.getElementById('admin-panel');
    const adminLogin = document.getElementById('admin-login');

    // Reset modal state
    adminPanel.style.display = 'none';
    adminLogin.style.display = 'block';
    document.getElementById('admin-code').value = '';

    modal.style.display = 'block';
}

// Verify Admin Code
async function verifyAdminCode() {
    const code = document.getElementById('admin-code').value.trim();

    if (!code) {
        alert('Please enter an admin code');
        return;
    }

    try {
        const response = await fetch('/api/verify-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code })
        });

        const result = await response.json();

        if (result.valid) {
            currentAdmin = {
                code: result.code,
                name: result.adminName,
                isMainAdmin: result.isMainAdmin
            };
            isMainAdmin = result.isMainAdmin;

            showAdminPanel();
        } else {
            alert('Invalid admin code');
        }
    } catch (error) {
        console.error('Error verifying code:', error);
        alert('Error verifying code');
    }
}

// Show Admin Panel
function showAdminPanel() {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';

    const panelHTML = `
        <div class="admin-info">
            <h3>Welcome, ${currentAdmin.name}</h3>
            <p>Admin Code: <span class="code-display">${currentAdmin.code}</span></p>
            <p>Role: ${isMainAdmin ? 'Main Administrator' : 'Sub-Administrator'}</p>
        </div>

        <div class="admin-tabs">
            <button class="admin-tab active" onclick="showAdminTab('events')">Manage Events</button>
            ${isMainAdmin ? '<button class="admin-tab" onclick="showAdminTab(\'codes\')">Manage Codes</button>' : ''}
        </div>

        <div id="admin-events" class="admin-tab-content active">
            <button class="btn btn-primary" onclick="showAddEventModal()">Add New Event</button>
            <div id="admin-events-list" style="margin-top: 2rem;">
                <!-- Events will be loaded here -->
            </div>
        </div>

        ${isMainAdmin ? `
        <div id="admin-codes" class="admin-tab-content">
            <button class="btn btn-primary" onclick="showCreateCodeModal()">Create New Code</button>
            <div id="admin-codes-list" style="margin-top: 2rem;">
                <!-- Codes will be loaded here -->
            </div>
        </div>
        ` : ''}
    `;

    document.getElementById('admin-panel').innerHTML = panelHTML;

    // Load admin events
    loadAdminEvents();

    // Load admin codes if main admin
    if (isMainAdmin) {
        loadAdminCodes();
    }
}

// Show Admin Tab
function showAdminTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`admin-${tabName}`).classList.add('active');
}

// Load Events for Public Display
async function loadEvents() {
    try {
        const response = await fetch('/api/events');
        const events = await response.json();

        const eventsGrid = document.getElementById('events-grid');

        if (events.length === 0) {
            eventsGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No upcoming events at this time.</p>';
            return;
        }

        eventsGrid.innerHTML = events.map(event => `
            <div class="event-card">
                <div class="event-date">${formatDate(event.date)}</div>
                <h3>${event.title}</h3>
                <p>${event.description || 'No description available'}</p>
                <div class="event-info">
                    ${event.time ? `<div><i class="fas fa-clock"></i> ${formatTime(event.time)}</div>` : ''}
                    ${event.location ? `<div><i class="fas fa-map-marker-alt"></i> ${event.location}</div>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

// Load Events for Admin Panel
async function loadAdminEvents() {
    try {
        const response = await fetch('/api/events');
        const events = await response.json();

        const adminEventsList = document.getElementById('admin-events-list');

        if (events.length === 0) {
            adminEventsList.innerHTML = '<p>No events created yet.</p>';
            return;
        }

        adminEventsList.innerHTML = events.map(event => `
            <div class="admin-code-item">
                <div>
                    <h4>${event.title}</h4>
                    <p><strong>Date:</strong> ${formatDate(event.date)}</p>
                    <p><strong>Created by:</strong> ${event.created_by_name || 'Unknown'}</p>
                    ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
                </div>
                <div>
                    ${(isMainAdmin || event.created_by_code === currentAdmin.code) ?
                        `<button class="btn btn-danger btn-small" onclick="deleteEvent(${event.id})">Delete</button>` :
                        ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading admin events:', error);
    }
}

// Load Admin Codes (Main Admin Only)
async function loadAdminCodes() {
    if (!isMainAdmin) return;

    try {
        const response = await fetch(`/api/admin-codes?isMainAdmin=true`);
        const codes = await response.json();

        const adminCodesList = document.getElementById('admin-codes-list');

        adminCodesList.innerHTML = codes.map(code => `
            <div class="admin-code-item">
                <div>
                    <h4>${code.sub_admin_name}</h4>
                    <p>Code: <span class="code-display">${code.code}</span></p>
                    <p>Created: ${formatDate(code.created_at)}</p>
                    <p>Role: ${code.is_main_admin ? 'Main Admin' : 'Sub-Admin'}</p>
                </div>
                <div>
                    ${!code.is_main_admin ?
                        `<button class="btn btn-danger btn-small" onclick="deleteAdminCode('${code.code}')">Delete</button>` :
                        '<span style="color: #666; font-size: 0.9rem;">Protected</span>'}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading admin codes:', error);
    }
}

// Show Add Event Modal
function showAddEventModal() {
    const modal = document.getElementById('event-modal');

    // Reset form
    document.getElementById('event-form').reset();

    modal.style.display = 'block';
}

// Handle Event Form Submission
document.addEventListener('DOMContentLoaded', function() {
    const eventForm = document.getElementById('event-form');
    if (eventForm) {
        eventForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = {
                title: document.getElementById('event-title').value,
                description: document.getElementById('event-description').value,
                date: document.getElementById('event-date').value,
                time: document.getElementById('event-time').value,
                location: document.getElementById('event-location').value,
                imageUrl: document.getElementById('event-image').value,
                createdByCode: currentAdmin.code,
                createdByName: currentAdmin.name
            };

            try {
                const response = await fetch('/api/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Event created successfully!');
                    document.getElementById('event-modal').style.display = 'none';
                    loadEvents();
                    loadAdminEvents();
                } else {
                    alert('Error creating event: ' + result.error);
                }
            } catch (error) {
                console.error('Error creating event:', error);
                alert('Error creating event');
            }
        });
    }
});

// Delete Event
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) {
        return;
    }

    try {
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code: currentAdmin.code,
                isMainAdmin: isMainAdmin
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Event deleted successfully!');
            loadEvents();
            loadAdminEvents();
        } else {
            alert('Error deleting event: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event');
    }
}

// Show Create Code Modal (Main Admin Only)
function showCreateCodeModal() {
    if (!isMainAdmin) return;

    const subAdminName = prompt('Enter sub-admin name:');
    if (!subAdminName) return;

    createAdminCode(subAdminName);
}

// Create Admin Code (Main Admin Only)
async function createAdminCode(subAdminName) {
    if (!isMainAdmin) return;

    try {
        const response = await fetch('/api/admin-codes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subAdminName: subAdminName,
                isMainAdmin: isMainAdmin
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Admin code created successfully!\nCode: ${result.code}`);
            loadAdminCodes();
        } else {
            alert('Error creating admin code: ' + result.error);
        }
    } catch (error) {
        console.error('Error creating admin code:', error);
        alert('Error creating admin code');
    }
}

// Delete Admin Code (Main Admin Only)
async function deleteAdminCode(code) {
    if (!isMainAdmin) return;

    if (!confirm('Are you sure you want to delete this admin code? This will revoke access for this sub-admin.')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin-codes/${code}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                isMainAdmin: isMainAdmin
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Admin code deleted successfully!');
            loadAdminCodes();
        } else {
            alert('Error deleting admin code: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting admin code:', error);
        alert('Error deleting admin code');
    }
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
}

function formatTime(timeString) {
    if (!timeString) return '';

    const time = new Date(`1970-01-01T${timeString}`);
    return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Contact Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.querySelector('#contact form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Thank you for your message! We will get back to you soon.');
            this.reset();
        });
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Press Escape to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
});

// Navbar background on scroll
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
    }
});