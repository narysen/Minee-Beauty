require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");


const app = express();
app.use(cors());
app.use(express.json());

// Connect to MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});

db.connect(err => {
  if (err) throw err;
  console.log("Connected to MySQL");
});

// GET ALL PRODUCTS
app.get("/products", (req, res) => {
  db.query("SELECT * FROM products", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// CHECKOUT (SAVE ORDER + ITEMS)
app.post("/checkout", (req, res) => {
  const { customer_name, address, cart } = req.body;

  console.log("BODY:", req.body); 

  if (!cart || cart.length === 0) {
    return res.status(400).json({ error: "Cart is empty!" });
  }

  // calculate total
  let total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // insert order
  db.query(
    "INSERT INTO orders (customer_name, address, total) VALUES (?, ?, ?)",
    [customer_name, address, total],
    (err, result) => {
      if (err) {
        console.log("ORDER ERROR:", err);
        return res.status(500).send(err);
      }

      const orderId = result.insertId;

      // insert each product into order_items
      cart.forEach(item => {
        db.query(
          "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
          [orderId, item.id, item.quantity, item.price]
        );
      });

      console.log("ORDER SAVED:", orderId);

      res.json({ message: "Order saved successfully!", orderId });
    }
  );
});