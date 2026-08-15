const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

module.exports = function (db) {
  // Ensure uploads folder exists inside public/image/uploads
  const uploadDir = path.join(__dirname, "../public/image/uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "public/image/uploads/");
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });

  const upload = multer({ storage: storage });

  router.get("/products", (req, res) => {
    const searchQuery = req.query.search;
    let sqlQuery = "SELECT * FROM products";
    let queryParams = [];

    if (searchQuery) {
      sqlQuery += " WHERE title LIKE ? OR brand LIKE ? OR category LIKE ?";
      const wildCard = `%${searchQuery}%`;
      queryParams = [wildCard, wildCard, wildCard];
    }

    sqlQuery += " ORDER BY id DESC";

    db.query(sqlQuery, queryParams, (error, results) => {
      if (error) {
        console.error("Error fetching products:", error);
        return res
          .status(500)
          .json({ success: false, error: "Database query failed" });
      }

      const forwardedProtocol = req.get("x-forwarded-proto");

      const requestProtocol = forwardedProtocol
        ? forwardedProtocol.split(",")[0].trim()
        : req.protocol;

      const requestOrigin = `${requestProtocol}://${req.get("host")}`;

      const formattedProducts = results.map((product) => {
        let finalImageUrl = product.image_url || "image/logo copy.png";

        /*
         * Convert old localhost image URLs back
         * into paths before applying the current
         * server address.
         */
        finalImageUrl = finalImageUrl.replace(
          /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//i,
          "",
        );

        if (finalImageUrl.startsWith("./")) {
          finalImageUrl = finalImageUrl.substring(2);
        } else if (finalImageUrl.startsWith("/")) {
          finalImageUrl = finalImageUrl.substring(1);
        }

        const isExternalImage = /^https?:\/\//i.test(finalImageUrl);

        const absoluteImageUrl = isExternalImage
          ? finalImageUrl
          : `${requestOrigin}/${finalImageUrl}`;

        return {
          id: product.id,
          sku:
            product.sku && product.sku.trim() !== "" && product.sku !== "N/A"
              ? product.sku
              : `MB-${product.id}`,
          title: product.title,
          brand: product.brand,
          category: product.category,
          price: parseFloat(product.price),
          discount_price:
            product.discount_price !== null &&
            product.discount_price !== undefined
              ? parseFloat(product.discount_price)
              : null,
          discount_start: product.discount_start
            ? product.discount_start
                .toISOString()
                .slice(0, 19)
                .replace("T", " ")
            : null,
          discount_end: product.discount_end
            ? product.discount_end.toISOString().slice(0, 19).replace("T", " ")
            : null,
          limit_per_user:
            product.limit_per_user !== undefined
              ? parseInt(product.limit_per_user, 10)
              : 0,

          bulk_min_quantity:
            product.bulk_min_quantity !== undefined
              ? parseInt(product.bulk_min_quantity, 10)
              : 0,

          bulk_discount_percent:
            product.bulk_discount_percent !== undefined
              ? parseFloat(product.bulk_discount_percent)
              : 0,

          stock: product.stock !== undefined ? parseInt(product.stock, 10) : 0,

          image_url: absoluteImageUrl,
          description: product.description,
          ingredients: product.ingredients,
        };
      });

      res.json(formattedProducts);
    });
  });

  router.post("/products", upload.single("image_file"), (req, res) => {
    const {
      title,
      price,
      stock,
      category,
      ingredients,
      brand,
      description,
      discount_price,
      discount_start,
      discount_end,
      limit_per_user,
      sku,
    } = req.body;

    if (!title || !price) {
      return res
        .status(400)
        .json({ success: false, message: "Title and price are required." });
    }

    let imageUrl = "image/logo copy.png";
    if (req.file) {
      imageUrl = `image/uploads/${req.file.filename}`;
    }

    const lastIdQuery = "SELECT id FROM products ORDER BY id DESC LIMIT 1";
    db.query(lastIdQuery, (err, lastProduct) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }

      const nextId =
        lastProduct && lastProduct.length > 0 ? lastProduct[0].id + 1 : 1;
      const generatedSku =
        sku && sku.trim() !== "" && sku !== "N/A" ? sku.trim() : `MB-${nextId}`;

      const insertQuery = `
                INSERT INTO products (sku, title, brand, category, price, discount_price, stock, image_url, description, ingredients, discount_start, discount_end, limit_per_user)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

      const parsedDiscountPrice =
        discount_price !== undefined &&
        discount_price !== null &&
        discount_price !== "" &&
        parseFloat(discount_price) > 0
          ? parseFloat(discount_price)
          : null;
      const parsedDiscountStart =
        discount_start && discount_start.trim() !== "" ? discount_start : null;
      const parsedDiscountEnd =
        discount_end && discount_end.trim() !== "" ? discount_end : null;

      const values = [
        generatedSku,
        title.trim(),
        brand ? brand.trim() : "Minee Beauty Core",
        category ? category.trim() : null,
        parseFloat(price) || 0,
        parsedDiscountPrice,
        parseInt(stock, 10) || 0,
        imageUrl,
        description ? description.trim() : `${title} formula.`,
        ingredients && ingredients.trim() !== "" ? ingredients.trim() : null,
        parsedDiscountStart,
        parsedDiscountEnd,
        parseInt(limit_per_user, 10) || 0,
      ];

      db.query(insertQuery, values, (insertErr, result) => {
        if (insertErr) {
          return res
            .status(500)
            .json({ success: false, error: insertErr.message });
        }
        res.status(201).json({
          success: true,
          message: "Product added successfully!",
          productId: result.insertId,
          sku: generatedSku,
        });
      });
    });
  });

  router.put("/products/:id", upload.single("image_file"), (req, res) => {
    const productId = req.params.id;
    const {
      title,
      price,
      stock,
      category,
      ingredients,
      brand,
      description,
      image_url,
      image,
      img,
      discount_price,
      discount_start,
      discount_end,
      limit_per_user,
      sku,
    } = req.body;

    if (!title || !price) {
      return res
        .status(400)
        .json({ success: false, message: "Title and price are required." });
    }

    let rawImageUrl = image_url || image || img || "image/logo copy.png";
    // Strip any absolute domain prefix if present before updating database cleanly
    if (rawImageUrl.includes("localhost:3000/")) {
      rawImageUrl = rawImageUrl.split("localhost:3000/")[1];
    }
    if (rawImageUrl.startsWith("./")) {
      rawImageUrl = rawImageUrl.substring(2);
    } else if (rawImageUrl.startsWith("/")) {
      rawImageUrl = rawImageUrl.substring(1);
    }

    let finalImageUrl = rawImageUrl;
    if (req.file) {
      finalImageUrl = `image/uploads/${req.file.filename}`;
    }

    const validSku =
      sku && sku.trim() !== "" && sku !== "N/A"
        ? sku.trim()
        : `MB-${productId}`;

    const updateQuery = `
            UPDATE products 
            SET sku = ?, title = ?, brand = ?, category = ?, price = ?, discount_price = ?, 
                stock = ?, image_url = ?, description = ?, ingredients = ?, 
                discount_start = ?, discount_end = ?, limit_per_user = ? 
            WHERE id = ?
        `;

    const parsedDiscountPrice =
      discount_price !== undefined &&
      discount_price !== null &&
      discount_price !== "" &&
      parseFloat(discount_price) > 0
        ? parseFloat(discount_price)
        : null;
    const parsedDiscountStart =
      discount_start && discount_start.trim() !== "" ? discount_start : null;
    const parsedDiscountEnd =
      discount_end && discount_end.trim() !== "" ? discount_end : null;

    const values = [
      validSku,
      title.trim(),
      brand ? brand.trim() : "Minee Beauty Core",
      category ? category.trim() : null,
      parseFloat(price) || 0,
      parsedDiscountPrice,
      parseInt(stock, 10) || 0,
      finalImageUrl,
      description ? description.trim() : `${title} formula.`,
      ingredients && ingredients.trim() !== "" ? ingredients.trim() : null,
      parsedDiscountStart,
      parsedDiscountEnd,
      parseInt(limit_per_user, 10) || 0,
      productId,
    ];

    db.query(updateQuery, values, (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found." });
      }
      res.json({ success: true, message: "Product updated successfully!" });
    });
  });

  router.delete("/products/:id", (req, res) => {
    const productId = req.params.id;
    db.query(
      "DELETE FROM products WHERE id = ?",
      [productId],
      (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Product not found." });
        }
        res.json({ success: true, message: "Product deleted successfully!" });
      },
    );
  });

  // ==========================================
  // GET /api/orders
  // ==========================================
  router.get("/orders", (req, res) => {
    const query = `
            SELECT 
                o.id AS order_id, o.customer_name, o.phone AS customer_phone, o.address, 
                o.total, o.payment_method, o.status, o.created_at, 
                oi.quantity, oi.price, p.title, p.category
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            ORDER BY o.id DESC
        `;
    db.query(query, (error, results) => {
      if (error) {
        return res
          .status(500)
          .json({ success: false, error: "Database query failed" });
      }
      res.json(results);
    });
  });

  router.post("/checkout", async (req, res) => {
    const { customer_name, phone, address, payment_method, items, cart } =
      req.body;

    const requestedCart = items || cart;

    if (!Array.isArray(requestedCart) || requestedCart.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items in cart.",
      });
    }

    if (
      !String(customer_name || "").trim() ||
      !String(phone || "").trim() ||
      !String(address || "").trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Customer name, phone, and address are required.",
      });
    }

    // Combine duplicate cart rows for the same product.
    const combinedItems = new Map();

    for (const item of requestedCart) {
      const productId = Number(item.id || item.product_id);

      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(productId) ||
        productId <= 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "The cart contains an invalid product or quantity.",
        });
      }

      combinedItems.set(
        productId,
        (combinedItems.get(productId) || 0) + quantity,
      );
    }

    const productIds = [...combinedItems.keys()];

    const placeholders = productIds.map(() => "?").join(",");

    let connection;

    try {
      connection = await db.promise().getConnection();

      await connection.beginTransaction();

      // Lock products until checkout finishes.
      const [products] = await connection.query(
        `
SELECT
    id,
    title,
    price,
    discount_price,
    discount_start,
    discount_end,
    bulk_min_quantity,
    bulk_discount_percent,
    stock
                        FROM products
                        WHERE id IN (${placeholders})
                        FOR UPDATE
                    `,
        productIds,
      );

      if (products.length !== productIds.length) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: "One or more cart products no longer exist.",
        });
      }

      const now = new Date();
      const orderItems = [];
      let subtotalCents = 0;

      for (const product of products) {
        const quantity = combinedItems.get(Number(product.id));

        const availableStock = Number(product.stock) || 0;

        if (availableStock < quantity) {
          await connection.rollback();

          return res.status(409).json({
            success: false,
            outOfStock: true,
            productId: Number(product.id),
            availableStock,
            message:
              availableStock <= 0
                ? `${product.title} is out of stock.`
                : `${product.title} only has ${availableStock} item(s) available.`,
          });
        }

        // Never trust the browser price.
        const regularPrice = Number(product.price);

        const discountPrice =
          product.discount_price === null
            ? null
            : Number(product.discount_price);

        const startsAt = product.discount_start
          ? new Date(product.discount_start)
          : null;

        const endsAt = product.discount_end
          ? new Date(product.discount_end)
          : null;
        const promotionIsActive =
          Number.isFinite(discountPrice) &&
          discountPrice > 0 &&
          discountPrice < regularPrice &&
          (!startsAt || now >= startsAt) &&
          (!endsAt || now <= endsAt);

        const promotionalUnitPrice = promotionIsActive
          ? discountPrice
          : regularPrice;

        const bulkMinimum = Number(product.bulk_min_quantity);
        const bulkPercent = Number(product.bulk_discount_percent);

        const bulkPromotionIsActive =
          Number.isInteger(bulkMinimum) &&
          bulkMinimum >= 2 &&
          Number.isFinite(bulkPercent) &&
          bulkPercent > 0 &&
          bulkPercent <= 100 &&
          quantity >= bulkMinimum;

        const finalUnitPrice = bulkPromotionIsActive
          ? promotionalUnitPrice * (1 - bulkPercent / 100)
          : promotionalUnitPrice;

        const unitPriceCents = Math.round(finalUnitPrice * 100);
        subtotalCents += unitPriceCents * quantity;

        orderItems.push({
          productId: Number(product.id),
          quantity,
          unitPrice: unitPriceCents / 100,
        });
      }

      // Calculate the first-order discount
      // from database order history.
      const [previousOrders] = await connection.query(
        `
                        SELECT COUNT(*) AS order_count
                        FROM orders
                        WHERE customer_name = ?
                    `,
        [String(customer_name).trim()],
      );

      const isFirstOrder = Number(previousOrders[0].order_count) === 0;

      const discountCents = isFirstOrder ? Math.round(subtotalCents * 0.05) : 0;

      const deliveryFeeCents = 150;

      const totalCents = subtotalCents - discountCents + deliveryFeeCents;

      const finalTotal = totalCents / 100;

      const [orderResult] = await connection.query(
        `
                        INSERT INTO orders (
                            customer_name,
                            phone,
                            address,
                            total,
                            payment_method,
                            status
                        )
                        VALUES (?, ?, ?, ?, ?, ?)
                    `,
        [
          String(customer_name).trim(),
          String(phone).trim(),
          String(address).trim(),
          finalTotal,
          payment_method || "Cash on Delivery",
          "Pending",
        ],
      );

      const orderId = orderResult.insertId;

      const orderItemValues = orderItems.map((item) => [
        orderId,
        item.productId,
        item.quantity,
        item.unitPrice,
      ]);

      await connection.query(
        `
                    INSERT INTO order_items (
                        order_id,
                        product_id,
                        quantity,
                        price
                    )
                    VALUES ?
                `,
        [orderItemValues],
      );

      for (const item of orderItems) {
        const [stockResult] = await connection.query(
          `
                            UPDATE products
                            SET stock = stock - ?
                            WHERE id = ?
                              AND stock >= ?
                        `,
          [item.quantity, item.productId, item.quantity],
        );

        if (stockResult.affectedRows !== 1) {
          throw new Error("Stock changed during checkout.");
        }
      }

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: "Order placed successfully.",
        orderId,
        total: finalTotal,
        isFirstOrder,
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }

      console.error("Checkout transaction failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to complete checkout.",
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  });

  // ==========================================
  // DELETE /api/orders
  // ==========================================
  router.delete("/orders", (req, res) => {
    db.query("DELETE FROM order_items", () => {
      db.query("DELETE FROM orders", () => {
        res.json({ success: true, message: "All orders cleared successfully" });
      });
    });
  });

  router.get("/expenses", (req, res) => {
    db.query("SELECT * FROM expenses ORDER BY id DESC", (error, results) => {
      if (error) {
        return res
          .status(500)
          .json({ success: false, error: "Database query failed" });
      }
      res.json(results);
    });
  });

  router.post("/expenses", (req, res) => {
    const { title, category, amount } = req.body;
    if (!title || !amount) {
      return res
        .status(400)
        .json({ success: false, message: "Title and amount are required." });
    }

    const query =
      "INSERT INTO expenses (title, category, amount) VALUES (?, ?, ?)";
    db.query(
      query,
      [title.trim(), category || "Inventory", parseFloat(amount) || 0],
      (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        res.status(201).json({
          success: true,
          message: "Expense added successfully!",
          expenseId: result.insertId,
        });
      },
    );
  });

  return router;
};
