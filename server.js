require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
  res.send("API is running");
});

// ================= MYSQL CONNECTION (SAFE) =================
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  connectTimeout: 20000
});

// DO NOT crash server if DB fails
db.connect((err) => {
  if (err) {
    console.error("MySQL connection failed:", err.message);
    console.log("Server still running, but DB may not work.");
  } else {
    console.log(" Connected to MySQL");
  }
});

// ================= PRODUCTS =================
app.get("/products", (req, res) => {
  db.query("SELECT * FROM products", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// ================= ORDERS (ADMIN) =================
app.get("/orders", (req, res) => {
  db.query(
    "SELECT id, customer_name, address, total, created_at FROM orders ORDER BY id DESC",
    (err, result) => {
      if (err) {
        console.log("GET ORDERS ERROR:", err);
        return res.status(500).json(err);
      }
      res.json(result);
    }
  );
});

// ================= DELETE ORDER =================
app.delete("/orders/:id", (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM order_items WHERE order_id = ?", [id], (err) => {
    if (err) {
      console.log("DELETE ITEMS ERROR:", err);
      return res.status(500).json(err);
    }

    db.query("DELETE FROM orders WHERE id = ?", [id], (err2) => {
      if (err2) {
        console.log("DELETE ORDER ERROR:", err2);
        return res.status(500).json(err2);
      }

      res.json({
        success: true,
        message: "Order deleted successfully"
      });
    });
  });
});

// ================= CHECKOUT (FIXED SAFE VERSION) =================
app.post("/checkout", (req, res) => {
  const { customer_name, address, cart } = req.body;

  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: "Cart is empty!" });
  }

  const safeName = customer_name?.trim() || "Guest";
  const safeAddress = address?.trim() || "No address";

  const total = cart.reduce((sum, item) => {
    return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
  }, 0);

  db.query(
    "INSERT INTO orders (customer_name, address, total) VALUES (?, ?, ?)",
    [safeName, safeAddress, total],
    (err, result) => {
      if (err) {
        console.log("ORDER INSERT ERROR:", err);
        return res.status(500).json(err);
      }

      const orderId = result.insertId;

      let completed = 0;

      if (cart.length === 0) {
        return res.json({ success: true, orderId });
      }

      cart.forEach((item) => {
        db.query(
          "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
          [orderId, item.id || 0, item.quantity || 1, item.price || 0],
          (err2) => {
            if (err2) {
              console.log("ORDER ITEM ERROR:", err2);
            }

            completed++;

            if (completed === cart.length) {
              res.json({
                success: true,
                message: "Order saved successfully!",
                orderId
              });
            }
          }
        );
      });
    }
  );
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});