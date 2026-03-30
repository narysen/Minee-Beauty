require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
  res.send("API is running");
});

// ================= POSTGRESQL CONNECTION =================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test DB connection
pool.connect()
  .then(() => console.log("PostgreSQL connected"))
  .catch((err) => {
    console.error("PostgreSQL connection failed:", err.message);
  });

// ================= PRODUCTS =================
app.get("/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products");
    res.json(result.rows);
  } catch (err) {
    console.log("PRODUCTS ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ================= ORDERS =================
app.get("/orders", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, customer_name, address, total, created_at FROM orders ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.log("GET ORDERS ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// ================= DELETE ORDER =================
app.delete("/orders/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await pool.query("DELETE FROM order_items WHERE order_id = $1", [id]);
    await pool.query("DELETE FROM orders WHERE id = $1", [id]);

    res.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (err) {
    console.log("DELETE ERROR:", err.message);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

// ================= CHECKOUT =================
app.post("/checkout", async (req, res) => {
  const { customer_name, address, cart } = req.body;

  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: "Cart is empty!" });
  }

  const safeName = customer_name?.trim() || "Guest";
  const safeAddress = address?.trim() || "No address";

  const total = cart.reduce((sum, item) => {
    return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
  }, 0);

  try {
    const orderResult = await pool.query(
      "INSERT INTO orders (customer_name, address, total) VALUES ($1, $2, $3) RETURNING id",
      [safeName, safeAddress, total]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of cart) {
      await pool.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)",
        [orderId, item.id || 0, item.quantity || 1, item.price || 0]
      );
    }

    res.json({
      success: true,
      message: "Order saved successfully!",
      orderId,
    });
  } catch (err) {
    console.log("CHECKOUT ERROR:", err.message);
    res.status(500).json({ error: "Checkout failed" });
  }
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});