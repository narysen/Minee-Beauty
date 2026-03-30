require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ================= MYSQL CONNECTION =================
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});

db.connect(err => {
  if (err) {
    console.error("MySQL connection error:", err);
    return;
  }
  console.log("Connected to MySQL");
});

// ================= GET PRODUCTS =================
app.get("/products", (req, res) => {
  db.query("SELECT * FROM products", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// ================= CHECKOUT (FIXED) =================
app.post("/checkout", (req, res) => {
  const { customer_name, address, cart } = req.body;
  console.log("USER:", user);
  console.log("ADDRESS:", user.address);

  //console.log("ADDRESS FROM FRONTEND:", req.body);

  // validate cart
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: "Cart is empty!" });
  }

  // safe values (PREVENT NULL)
  const safeName = customer_name?.trim() || "Guest";
  const safeAddress = address?.trim() || "No address";

  // calculate total safely
  const total = cart.reduce((sum, item) => {
    return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
  }, 0);

  // insert order
  db.query(
    "INSERT INTO orders (customer_name, address, total) VALUES (?, ?, ?)",
    [safeName, safeAddress, total],
    (err, result) => {
      if (err) {
        console.log("ORDER INSERT ERROR:", err);
        return res.status(500).json(err);
      }

      const orderId = result.insertId;

      // insert order items
      cart.forEach(item => {
        db.query(
          "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
          [
            orderId,
            item.id || 0,
            item.quantity || 1,
            item.price || 0
          ]
        );
      });

      console.log("ORDER SAVED:", orderId);

      res.json({
        success: true,
        message: "Order saved successfully!",
        orderId
      });
    }
  );
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});