const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory data storage (works on Vercel)
let adminCodes = [
  {
    id: 1,
    code: 'MAIN_ADMIN_2024',
    sub_admin_name: 'Main Administrator',
    is_main_admin: true,
    created_at: new Date().toISOString()
  }
];

let events = [
  {
    id: 1,
    title: 'Together WE Rise Holiday Soiree',
    description: 'Join us for our annual holiday celebration honoring collaboration and community partnerships on Chicago\'s Greater West Side.',
    date: '2024-12-15',
    time: '18:00',
    location: 'West Side Community Center',
    created_by_code: 'MAIN_ADMIN_2024',
    created_by_name: 'Main Administrator',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Light Up Lawndale',
    description: 'Our annual community holiday lighting event bringing families together with free food, games, and bouncy houses for the kids.',
    date: '2024-12-07',
    time: '17:30',
    location: 'Lawndale Community Park',
    created_by_code: 'MAIN_ADMIN_2024',
    created_by_name: 'Main Administrator',
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    title: 'Juneteenth Celebration',
    description: 'Celebrate our heritage with music, art, educational activities, and community fellowship honoring African American culture and freedom.',
    date: '2024-06-19',
    time: '14:00',
    location: 'Douglas Park',
    created_by_code: 'MAIN_ADMIN_2024',
    created_by_name: 'Main Administrator',
    created_at: new Date().toISOString()
  },
  {
    id: 4,
    title: 'Restorative Justice Summit',
    description: 'Multi-day event focused on peace, justice, and healing in our communities. Open to all residents and community organizations.',
    date: '2024-10-12',
    time: '09:00',
    location: 'West Side Cultural Center',
    created_by_code: 'MAIN_ADMIN_2024',
    created_by_name: 'Main Administrator',
    created_at: new Date().toISOString()
  },
  {
    id: 5,
    title: 'Community Resource Fair',
    description: 'Free food distribution, back-to-school supplies, clothing giveaway, free haircuts, and family activities with bouncy houses.',
    date: '2024-08-24',
    time: '11:00',
    location: 'Local School Gymnasium',
    created_by_code: 'MAIN_ADMIN_2024',
    created_by_name: 'Main Administrator',
    created_at: new Date().toISOString()
  }
];

let nextEventId = 6;
let nextAdminId = 2;

// API Routes

// Verify admin code
app.post('/api/verify-code', (req, res) => {
  const { code } = req.body;
  const adminCode = adminCodes.find(ac => ac.code === code);

  if (adminCode) {
    res.json({
      valid: true,
      isMainAdmin: adminCode.is_main_admin,
      adminName: adminCode.sub_admin_name,
      code: adminCode.code
    });
  } else {
    res.json({ valid: false });
  }
});

// Get all events
app.get('/api/events', (req, res) => {
  const sortedEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(sortedEvents);
});

// Add new event
app.post('/api/events', (req, res) => {
  const { title, description, date, time, location, imageUrl, createdByCode, createdByName } = req.body;

  const newEvent = {
    id: nextEventId++,
    title,
    description,
    date,
    time,
    location,
    image_url: imageUrl,
    created_by_code: createdByCode,
    created_by_name: createdByName,
    created_at: new Date().toISOString()
  };

  events.push(newEvent);
  res.json({ id: newEvent.id, message: 'Event created successfully' });
});

// Delete event
app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const { code, isMainAdmin } = req.body;
  const eventId = parseInt(id);

  const eventIndex = events.findIndex(e => e.id === eventId);

  if (eventIndex === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const event = events[eventIndex];

  if (isMainAdmin || event.created_by_code === code) {
    events.splice(eventIndex, 1);
    res.json({ message: 'Event deleted successfully' });
  } else {
    res.status(403).json({ error: 'You can only delete your own events' });
  }
});

// Create new admin code (main admin only)
app.post('/api/admin-codes', (req, res) => {
  const { subAdminName, isMainAdmin } = req.body;

  if (!isMainAdmin) {
    return res.status(403).json({ error: 'Only main admin can create codes' });
  }

  const newCode = uuidv4().substring(0, 8).toUpperCase();
  const newAdminCode = {
    id: nextAdminId++,
    code: newCode,
    sub_admin_name: subAdminName,
    is_main_admin: false,
    created_at: new Date().toISOString()
  };

  adminCodes.push(newAdminCode);
  res.json({ code: newCode, message: 'Admin code created successfully' });
});

// Get all admin codes (main admin only)
app.get('/api/admin-codes', (req, res) => {
  const { isMainAdmin } = req.query;

  if (isMainAdmin !== 'true') {
    return res.status(403).json({ error: 'Only main admin can view codes' });
  }

  const sortedCodes = [...adminCodes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(sortedCodes);
});

// Delete admin code (main admin only)
app.delete('/api/admin-codes/:code', (req, res) => {
  const { code } = req.params;
  const { isMainAdmin } = req.body;

  if (!isMainAdmin) {
    return res.status(403).json({ error: 'Only main admin can delete codes' });
  }

  const codeIndex = adminCodes.findIndex(ac => ac.code === code && !ac.is_main_admin);

  if (codeIndex === -1) {
    return res.status(400).json({ error: 'Cannot delete main admin code or code not found' });
  }

  adminCodes.splice(codeIndex, 1);
  res.json({ message: 'Admin code deleted successfully' });
});

// Serve the main page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// For local development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
module.exports = app;
