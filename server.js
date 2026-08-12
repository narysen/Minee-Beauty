require("dotenv").config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. Ensure 'uploads/' directory exists automatically
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded images statically
app.use('/uploads', express.static(uploadDir));

// Database connection setup
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT, 
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection((err, connection) => {
  if (err) {
    console.error(' Database connection failed: ' + err.message);
  } else {
    console.log(` Connected successfully to MySQL database: ${process.env.DB_NAME}`);
    connection.release();
  }
});
const productRoutes = require('./routes/products')(db);
app.use('/api', productRoutes); 

const ordersRouter = require('./routes/orders')(db);
app.use('/api', ordersRouter);

const promotionRoutes = require('./routes/promotions')(db);
app.use('/api', promotionRoutes);

app.get('/api/categories', (req, res) => {
  const sqlQuery = 'SELECT * FROM categories ORDER BY name ASC';
  db.query(sqlQuery, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  const sqlQuery = 'INSERT INTO categories (name) VALUES (?)';
  db.query(sqlQuery, [name.trim()], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Category already exists.' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ 
      message: 'Category added successfully!', 
      id: result.insertId, 
      name: name.trim() 
    });
  });
});

app.listen(PORT, () => {
  console.log(` Minee Beauty Server running at http://localhost:${PORT}`);
});