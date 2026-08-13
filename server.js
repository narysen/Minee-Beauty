require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, "public/image/uploads");
const publicDir = path.join(__dirname, "public");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve files from public/ (Includes /image/uploads, etc.)
app.use(express.static(publicDir));

// Also serve root-level assets if needed
app.use(express.static(path.join(__dirname, ".")));

// Database connection
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Aiven MySQL SSL
if (process.env.DB_SSL === "true") {
  dbConfig.ssl = {
    rejectUnauthorized: false
  };
}

const db = mysql.createPool(dbConfig);

db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:");
    console.error(err.message);
  } else {
    console.log("Connected successfully to MySQL database!");
    console.log(`Database: ${process.env.DB_NAME}`);
    connection.release();
  }
});

// ==========================================
// AUTO-INITIALIZE TABLES & SEED DATA FOR RENDER
// ==========================================
const initDatabase = () => {
    const queries = [
        `CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE
        );`,
        `CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sku VARCHAR(50) DEFAULT NULL,
            title VARCHAR(255) NOT NULL,
            brand VARCHAR(100),
            category VARCHAR(100),
            price DECIMAL(10, 2) NOT NULL,
            discount_price DECIMAL(10, 2) DEFAULT NULL,
            discount_start DATETIME DEFAULT NULL,
            discount_end DATETIME DEFAULT NULL,
            stock INT DEFAULT 0,
            limit_per_user INT DEFAULT 0,
            image_url VARCHAR(255),
            description TEXT,
            ingredients TEXT
        );`,
        `CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_name VARCHAR(150) NOT NULL,
            phone VARCHAR(50) NOT NULL,
            address TEXT NOT NULL,
            total DECIMAL(10, 2) NOT NULL,
            payment_method VARCHAR(50) DEFAULT 'Cash on Delivery',
            status VARCHAR(50) DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT NOT NULL,
            price DECIMAL(10, 2) NOT NULL
        );`,
        `CREATE TABLE IF NOT EXISTS expenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(100) DEFAULT 'Inventory',
            amount DECIMAL(10, 2) NOT NULL,
            expense_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,
        `INSERT IGNORE INTO categories (name) VALUES 
        ('Sunscreen'), ('Serum'), ('Cream'), ('Sheet Mask'), ('Wash Off Mask'), 
        ('Sun Stick'), ('Eye Cream'), ('Clay Mask'), ('Ampoule'), ('Foam Cleanser'), 
        ('Sleeping Pack'), ('Toner'), ('Lip Makeup'), ('Eye Makeup');`,
        `INSERT IGNORE INTO products (id, sku, title, brand, category, price, discount_price, stock, image_url, description, ingredients) VALUES 
        (1, 'MB-1', 'Mary&May Vegan Primer Glow Sun Cream SPF50+ PA++++ 50ml', 'Mary&May', 'Sunscreen', 8.50, 1.50, 9, './image/mary&maysunscreen/sun2.webp', 'A gorgeous glowing vegan sun primer...', 'Water, Dibutyl Adipate...'),
        (2, 'MB-2', 'Mary&May Centella Asiatica Serum', 'Mary&May', 'Serum', 8.30, NULL, 0, './image/mary&mayserum/serum2 copy.jpeg', 'Infused with pure Centella Asiatica...', 'Centella Asiatica Extract (95%)...'),
        (3, 'MB-3', 'Mary&May Sensitive Shooting Gel Cream', 'Mary&May', 'Cream', 9.50, 7.50, 49, './image/mary&maycream/shooting.webp', 'A deeply calming gel-cream formula...', 'Houttuynia Cordata Extract...')`
    ];

    queries.forEach(query => {
        db.query(query, err => {
            if (err) console.error("Database seed error:", err.message);
        });
    });
};

initDatabase();

const productRoutes = require("./routes/products")(db);
app.use("/api", productRoutes);

const ordersRouter = require("./routes/orders")(db);
app.use("/api", ordersRouter);

const promotionRoutes = require("./routes/promotions")(db);
app.use("/api", promotionRoutes);

app.get("/api/categories", (req, res) => {
  const sqlQuery = "SELECT * FROM categories ORDER BY name ASC";

  db.query(sqlQuery, (err, results) => {
    if (err) {
      console.error("Category error:", err.message);

      return res.status(500).json({
        error: err.message
      });
    }

    res.json(results);
  });
});

app.post("/api/categories", (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({
      error: "Category name is required."
    });
  }

  const sqlQuery = "INSERT INTO categories (name) VALUES (?)";

  db.query(sqlQuery, [name.trim()], (err, result) => {
    if (err) {
      console.error("Add category error:", err.message);

      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          error: "Category already exists."
        });
      }

      return res.status(500).json({
        error: err.message
      });
    }

    res.status(201).json({
      message: "Category added successfully!",
      id: result.insertId,
      name: name.trim()
    });
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Minee Beauty API is running!"
  });
});

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Other HTML pages
const htmlPages = [
  "about.html",
  "admin.html",
  "checkout.html",
  "contact.html",
  "cosmetic.html",
  "dasique.html",
  "discountpopup.html",
  "etude.html",
  "lipbalm.html",
  "Mary&May.html",
  "mascara.html"
];

htmlPages.forEach((page) => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, page));
  });
});

// Root JavaScript files
const jsFiles = [
  "checkout.js",
  "detail.js",
  "outstock.js",
  "product.js",
  "admin.js"
];

jsFiles.forEach((file) => {
  app.get(`/${file}`, (req, res) => {
    res.sendFile(path.join(__dirname, file));
  });
});

app.get("/favicon.png", (req, res) => {
  res.sendFile(path.join(__dirname, "favicon.png"));
});

app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Minee Beauty Server Started");
  console.log(`Port: ${PORT}`);
  console.log(`Server URL: http://localhost:${PORT}`);
});