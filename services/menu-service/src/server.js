const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

function validateRating(rating) {
  if (rating === undefined || rating === null) {
    return { valid: false, error: 'Rating is required' };
  }

  if (typeof rating !== 'number' || Number.isNaN(rating)) {
    return { valid: false, error: 'Rating must be a number' };
  }

  if (!Number.isInteger(rating)) {
    return { valid: false, error: 'Rating must be a whole number' };
  }

  if (rating < 1 || rating > 5) {
    return { valid: false, error: 'Rating must be between 1 and 5' };
  }

  return { valid: true };
}

app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'menu-service', port: 3002 })
);

const db = mysql.createPool({
  host:     process.env.MYSQL_HOST     || 'db',
  user:     process.env.MYSQL_USER     || 'root',
  password: process.env.MYSQL_PASSWORD || 'password',
  database: process.env.MYSQL_DATABASE || 'cloudeats',
});

// ── PASTE your /api/menu routes here ──────────────────
app.get('/api/menu', async (req, res) => {
  // copy from server.js.monolith
});
app.get('/api/menu/:id', async (req, res) => {
  // copy from server.js.monolith
});
app.get('/api/menu/category/:cat', async (req, res) => {
  // copy from server.js.monolith (if exists)
});

const PORT = process.env.PORT || 3002;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () =>
    console.log(`[menu-service] Running on http://localhost:${PORT}`)
  );
}

// ===== EXPORT FOR TESTING (add at bottom of file) =====
// Only exports when Jest sets NODE_ENV=test
// Production server is unaffected
if (process.env.NODE_ENV === 'test') {
  module.exports = { app, validateRating };
}