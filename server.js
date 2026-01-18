const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize SQLite database
// Use /tmp directory on Vercel (serverless) or current directory locally
const dbPath = process.env.VERCEL ? '/tmp/westside_rising.db' : 'westside_rising.db';
let db;
let dbInitialized = false;

// Initialize database with error handling
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    try {
      db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Database connection error:', err);
          reject(err);
          return;
        }

        // Create tables
        db.serialize(() => {
          // Admin codes table
          db.run(`CREATE TABLE IF NOT EXISTS admin_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            sub_admin_name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_main_admin BOOLEAN DEFAULT FALSE
          )`, (err) => {
            if (err) console.error('Error creating admin_codes table:', err);
          });

          // Events table
          db.run(`CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            date TEXT NOT NULL,
            time TEXT,
            location TEXT,
            image_url TEXT,
            created_by_code TEXT,
            created_by_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by_code) REFERENCES admin_codes(code)
          )`, (err) => {
            if (err) console.error('Error creating events table:', err);
          });

          // Insert main admin code if it doesn't exist
          db.run(`INSERT OR IGNORE INTO admin_codes (code, sub_admin_name, is_main_admin)
                  VALUES ('MAIN_ADMIN_2024', 'Main Administrator', TRUE)`, (err) => {
            if (err) console.error('Error inserting admin code:', err);
          });

          // Insert sample events based on Westside Rising's actual programming
          db.run(`INSERT OR IGNORE INTO events (id, title, description, date, time, location, created_by_code, created_by_name)
                  VALUES
                  (1, 'Together WE Rise Holiday Soiree', 'Join us for our annual holiday celebration honoring collaboration and community partnerships on Chicago''s Greater West Side.', '2024-12-15', '18:00', 'West Side Community Center', 'MAIN_ADMIN_2024', 'Main Administrator'),
                  (2, 'Light Up Lawndale', 'Our annual community holiday lighting event bringing families together with free food, games, and bouncy houses for the kids.', '2024-12-07', '17:30', 'Lawndale Community Park', 'MAIN_ADMIN_2024', 'Main Administrator'),
                  (3, 'Juneteenth Celebration', 'Celebrate our heritage with music, art, educational activities, and community fellowship honoring African American culture and freedom.', '2024-06-19', '14:00', 'Douglas Park', 'MAIN_ADMIN_2024', 'Main Administrator'),
                  (4, 'Restorative Justice Summit', 'Multi-day event focused on peace, justice, and healing in our communities. Open to all residents and community organizations.', '2024-10-12', '09:00', 'West Side Cultural Center', 'MAIN_ADMIN_2024', 'Main Administrator'),
                  (5, 'Community Resource Fair', 'Free food distribution, back-to-school supplies, clothing giveaway, free haircuts, and family activities with bouncy houses.', '2024-08-24', '11:00', 'Local School Gymnasium', 'MAIN_ADMIN_2024', 'Main Administrator')`, (err) => {
            if (err) console.error('Error inserting sample events:', err);
            dbInitialized = true;
            resolve();
          });
        });
      });
    } catch (error) {
      console.error('Database initialization error:', error);
      reject(error);
    }
  });
}

// Middleware to ensure database is initialized
async function ensureDbInitialized(req, res, next) {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
    } catch (error) {
      return res.status(500).json({ error: 'Database initialization failed', details: error.message });
    }
  }
  next();
}

// Apply database middleware to all routes
app.use(ensureDbInitialized);

// API Routes

// Verify admin code
app.post('/api/verify-code', (req, res) => {
  const { code } = req.body;

  db.get('SELECT * FROM admin_codes WHERE code = ?', [code], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (row) {
      res.json({
        valid: true,
        isMainAdmin: row.is_main_admin,
        adminName: row.sub_admin_name,
        code: row.code
      });
    } else {
      res.json({ valid: false });
    }
  });
});

// Get all events
app.get('/api/events', (req, res) => {
  db.all('SELECT * FROM events ORDER BY date ASC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Add new event
app.post('/api/events', (req, res) => {
  const { title, description, date, time, location, imageUrl, createdByCode, createdByName } = req.body;

  db.run(
    `INSERT INTO events (title, description, date, time, location, image_url, created_by_code, created_by_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, date, time, location, imageUrl, createdByCode, createdByName],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, message: 'Event created successfully' });
    }
  );
});

// Delete event
app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const { code, isMainAdmin } = req.body;

  if (isMainAdmin) {
    // Main admin can delete any event
    db.run('DELETE FROM events WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Event deleted successfully' });
    });
  } else {
    // Sub-admin can only delete their own events
    db.run('DELETE FROM events WHERE id = ? AND created_by_code = ?', [id, code], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(403).json({ error: 'You can only delete your own events' });
      }
      res.json({ message: 'Event deleted successfully' });
    });
  }
});

// Create new admin code (main admin only)
app.post('/api/admin-codes', (req, res) => {
  const { subAdminName, isMainAdmin } = req.body;

  if (!isMainAdmin) {
    return res.status(403).json({ error: 'Only main admin can create codes' });
  }

  const newCode = uuidv4().substring(0, 8).toUpperCase();

  db.run(
    'INSERT INTO admin_codes (code, sub_admin_name) VALUES (?, ?)',
    [newCode, subAdminName],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ code: newCode, message: 'Admin code created successfully' });
    }
  );
});

// Get all admin codes (main admin only)
app.get('/api/admin-codes', (req, res) => {
  const { isMainAdmin } = req.query;

  if (isMainAdmin !== 'true') {
    return res.status(403).json({ error: 'Only main admin can view codes' });
  }

  db.all('SELECT * FROM admin_codes ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Delete admin code (main admin only)
app.delete('/api/admin-codes/:code', (req, res) => {
  const { code } = req.params;
  const { isMainAdmin } = req.body;

  if (!isMainAdmin) {
    return res.status(403).json({ error: 'Only main admin can delete codes' });
  }

  db.run('DELETE FROM admin_codes WHERE code = ? AND is_main_admin = FALSE', [code], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(400).json({ error: 'Cannot delete main admin code or code not found' });
    }
    res.json({ message: 'Admin code deleted successfully' });
  });
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