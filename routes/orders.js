const crypto = require("crypto");
const express = require("express");

const {
  KHQRServiceError,
  generateIndividualKHQR,
  verifyTransactionByMd5,
} = require("../services/khqr");

const router = express.Router();

async function buildServerCheckout(db, requestCart, customerName) {
  if (!Array.isArray(requestCart) || requestCart.length === 0) {
    throw new KHQRServiceError("The cart is empty.");
  }

  const combinedItems = new Map();

  for (const item of requestCart) {
    const productId = Number(item.id || item.product_id);
    const quantity = Number(item.quantity);

    if (
      !Number.isInteger(productId) ||
      productId <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw new KHQRServiceError(
        "The cart contains an invalid product or quantity.",
      );
    }

    combinedItems.set(
      productId,
      (combinedItems.get(productId) || 0) + quantity,
    );
  }

  const productIds = [...combinedItems.keys()];
  const placeholders = productIds.map(() => "?").join(",");

  const [products] = await db.promise().query(
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
    `,
    productIds,
  );

  if (products.length !== productIds.length) {
    throw new KHQRServiceError("One or more cart products no longer exist.");
  }

  const now = new Date();
  const normalizedCart = [];
  let subtotalCents = 0;

  for (const product of products) {
    const quantity = combinedItems.get(Number(product.id));
    const availableStock = Number(product.stock || 0);

    if (availableStock < quantity) {
      throw new KHQRServiceError(
        `${product.title} only has ${availableStock} item(s) available.`,
      );
    }

    const regularPrice = Number(product.price);
    const discountPrice =
      product.discount_price === null ? null : Number(product.discount_price);

    const startsAt = product.discount_start
      ? new Date(product.discount_start)
      : null;

    const endsAt = product.discount_end ? new Date(product.discount_end) : null;

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

    normalizedCart.push({
      id: Number(product.id),
      title: product.title,
      quantity,
      price: unitPriceCents / 100,
    });
  }

  const [previousOrders] = await db.promise().query(
    `
      SELECT COUNT(*) AS order_count
      FROM orders
      WHERE customer_name = ?
    `,
    [customerName],
  );

  const isFirstOrder = Number(previousOrders[0].order_count) === 0;

  const discountCents = isFirstOrder ? Math.round(subtotalCents * 0.05) : 0;

  const deliveryFeeCents = 150;

  const totalCents = subtotalCents - discountCents + deliveryFeeCents;

  return {
    cart: normalizedCart,
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    deliveryFee: deliveryFeeCents / 100,
    total: totalCents / 100,
    isFirstOrder,
  };
}
module.exports = function (db) {
  router.post("/payments/khqr", async (req, res) => {
    const { customer_name, phone, address, items, cart } = req.body;

    const customerName = String(customer_name || "").trim();

    const customerPhone = String(phone || "").trim();

    const customerAddress = String(address || "").trim();

    if (!customerName || !customerPhone || !customerAddress) {
      return res.status(400).json({
        success: false,
        message: "Customer name, phone, and address are required.",
      });
    }

    try {
      const checkout = await buildServerCheckout(
        db,
        items || cart,
        customerName,
      );

      const paymentAttemptId = crypto.randomUUID();

      const paymentReference = `MB-${paymentAttemptId
        .slice(0, 8)
        .toUpperCase()}`;

      const generated = await generateIndividualKHQR(
        checkout.total,
        paymentReference,
      );

      await db.promise().query(
        `
                    INSERT INTO khqr_payment_attempts (
                        id,
                        khqr_md5,
                        qr_payload,
                        expected_amount,
                        currency,
                        receiver_account,
                        customer_name,
                        phone,
                        address,
                        cart_snapshot,
                        status,
                        expires_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
        [
          paymentAttemptId,
          generated.md5,
          generated.qr,
          generated.amount,
          generated.currency,
          generated.receiverAccount,
          customerName,
          customerPhone,
          customerAddress,
          JSON.stringify(checkout.cart),
          "Generated",
          generated.expiresAt,
        ],
      );

      return res.status(201).json({
        success: true,
        paymentAttemptId,
        paymentReference,
        qrImage: generated.qrImage,
        amount: generated.amount,
        currency: generated.currency,
        receiverAccount: generated.receiverAccount,
        expiresAt: generated.expiresAt.toISOString(),
        breakdown: {
          subtotal: checkout.subtotal,
          discount: checkout.discount,
          deliveryFee: checkout.deliveryFee,
          isFirstOrder: checkout.isFirstOrder,
        },
      });
    } catch (error) {
      console.error("KHQR generation failed:", error);

      if (error instanceof KHQRServiceError) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unable to generate the payment QR.",
      });
    }
  });
  router.get("/orders", (req, res) => {
    const query = `
            SELECT 
                o.id AS order_id,
                o.customer_name,
                o.phone AS customer_phone,
                o.address,
                o.total,
                o.payment_method,
                o.status,
                o.created_at,
                oi.quantity,
                oi.price,
                p.title,
                p.category
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            ORDER BY o.id DESC
        `;

    db.query(query, (error, results) => {
      if (error) {
        console.error("Error fetching orders:", error);
        return res
          .status(500)
          .json({ success: false, error: "Database query failed" });
      }
      res.json(results);
    });
  });
  router.post("/payments/khqr/verify", async (req, res) => {
    const paymentAttemptId = String(req.body.paymentAttemptId || "").trim();

    if (!paymentAttemptId) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: "A payment attempt ID is required.",
      });
    }

    const maxAttempts =
      Number.parseInt(process.env.KHQR_MAX_VERIFY_ATTEMPTS, 10) || 3;

    const cooldownSeconds =
      Number.parseInt(process.env.KHQR_VERIFY_COOLDOWN_SECONDS, 10) || 60;

    let attempt;
    let firstConnection;

    try {
      firstConnection = await db.promise().getConnection();

      await firstConnection.beginTransaction();

      const [rows] = await firstConnection.query(
        `
                            SELECT *
                            FROM khqr_payment_attempts
                            WHERE id = ?
                            FOR UPDATE
                        `,
        [paymentAttemptId],
      );

      if (rows.length === 0) {
        await firstConnection.rollback();

        return res.status(404).json({
          success: false,
          verified: false,
          message: "Payment attempt not found.",
        });
      }

      attempt = rows[0];

      if (attempt.status === "Verified") {
        await firstConnection.commit();

        return res.json({
          success: true,
          verified: true,
          orderId: attempt.order_id,
          message: "Payment is already verified.",
        });
      }

      const expiresAt = new Date(attempt.expires_at);

      if (
        Number.isNaN(expiresAt.getTime()) ||
        Date.now() >= expiresAt.getTime()
      ) {
        await firstConnection.query(
          `
                            UPDATE khqr_payment_attempts
                            SET status = 'Expired'
                            WHERE id = ?
                        `,
          [paymentAttemptId],
        );

        await firstConnection.commit();

        return res.status(400).json({
          success: false,
          verified: false,
          expired: true,
          message: "This KHQR has expired. Generate a new QR.",
        });
      }

      if (attempt.status !== "Generated") {
        await firstConnection.rollback();

        return res.status(400).json({
          success: false,
          verified: false,
          message: "This payment attempt cannot be verified.",
        });
      }

      const attemptsUsed = Number(attempt.verification_attempts || 0);

      if (attemptsUsed >= maxAttempts) {
        await firstConnection.rollback();

        return res.status(429).json({
          success: false,
          verified: false,
          attemptsRemaining: 0,
          message: "Maximum verification attempts reached for this QR.",
        });
      }

      if (attempt.last_verification_at) {
        const lastAttemptAt = new Date(attempt.last_verification_at);

        const elapsedSeconds = Math.floor(
          (Date.now() - lastAttemptAt.getTime()) / 1000,
        );

        if (
          Number.isFinite(elapsedSeconds) &&
          elapsedSeconds < cooldownSeconds
        ) {
          const retryAfter = cooldownSeconds - elapsedSeconds;

          await firstConnection.rollback();

          res.set("Retry-After", String(retryAfter));

          return res.status(429).json({
            success: false,
            verified: false,
            retryAfter,
            attemptsRemaining: maxAttempts - attemptsUsed,
            message: "Please wait before checking payment again.",
          });
        }
      }

      await firstConnection.query(
        `
                        UPDATE khqr_payment_attempts
                        SET
                            verification_attempts =
                                verification_attempts + 1,
                            last_verification_at =
                                CURRENT_TIMESTAMP
                        WHERE id = ?
                    `,
        [paymentAttemptId],
      );

      await firstConnection.commit();

      attempt.verification_attempts = attemptsUsed + 1;
    } catch (error) {
      if (firstConnection) {
        await firstConnection.rollback();
      }

      console.error("Unable to prepare KHQR verification:", error);

      return res.status(500).json({
        success: false,
        verified: false,
        message: "Unable to prepare payment verification.",
      });
    } finally {
      if (firstConnection) {
        firstConnection.release();
      }
    }

    let verification;

    try {
      const verificationMode = String(
        process.env.PAYMENT_VERIFICATION_MODE || "bakong",
      )
        .trim()
        .toLowerCase();

      if (verificationMode === "mock") {
        verification = {
          verified: true,
          transaction: {
            hash: `mock-${crypto.randomUUID()}`,
            amount: Number(attempt.expected_amount),
            currency: attempt.currency,
            toAccountId: attempt.receiver_account,
          },
        };
      } else {
        verification = await verifyTransactionByMd5(attempt.khqr_md5);
      }
    } catch (error) {
      console.error("Bakong verification failed:", error);

      const statusCode = error instanceof KHQRServiceError ? 502 : 500;

      return res.status(statusCode).json({
        success: false,
        verified: false,
        attemptsRemaining: Math.max(
          0,
          maxAttempts - attempt.verification_attempts,
        ),
        message:
          error instanceof KHQRServiceError
            ? error.message
            : "Unable to verify payment.",
      });
    }

    if (!verification.verified) {
      return res.json({
        success: true,
        verified: false,
        attemptsRemaining: Math.max(
          0,
          maxAttempts - attempt.verification_attempts,
        ),
        message:
          "Payment was not found yet. Confirm the transfer and try again later.",
      });
    }

    const transaction = verification.transaction;

    const receivedAmountCents = Math.round(Number(transaction.amount) * 100);

    const expectedAmountCents = Math.round(
      Number(attempt.expected_amount) * 100,
    );

    const receivedCurrency = String(transaction.currency || "")
      .trim()
      .toUpperCase();

    const expectedCurrency = String(attempt.currency || "")
      .trim()
      .toUpperCase();

    const receivedAccount = String(transaction.toAccountId || "")
      .trim()
      .toLowerCase();

    const expectedAccount = String(attempt.receiver_account || "")
      .trim()
      .toLowerCase();

    const paymentMatches =
      Number.isFinite(receivedAmountCents) &&
      receivedAmountCents === expectedAmountCents &&
      receivedCurrency === expectedCurrency &&
      receivedAccount === expectedAccount;

    if (!paymentMatches) {
      await db.promise().query(
        `
                        UPDATE khqr_payment_attempts
                        SET status = 'Failed'
                        WHERE id = ?
                          AND status = 'Generated'
                    `,
        [paymentAttemptId],
      );

      return res.status(409).json({
        success: false,
        verified: false,
        message:
          "The transaction does not match the expected amount, currency, or receiver.",
      });
    }

    const transactionHash = String(transaction.hash || attempt.khqr_md5).trim();

    let finalConnection;

    try {
      finalConnection = await db.promise().getConnection();

      await finalConnection.beginTransaction();

      const [lockedRows] = await finalConnection.query(
        `
                            SELECT *
                            FROM khqr_payment_attempts
                            WHERE id = ?
                            FOR UPDATE
                        `,
        [paymentAttemptId],
      );

      const lockedAttempt = lockedRows[0];

      if (!lockedAttempt) {
        await finalConnection.rollback();

        return res.status(404).json({
          success: false,
          verified: false,
          message: "Payment attempt not found.",
        });
      }

      if (lockedAttempt.status === "Verified") {
        await finalConnection.commit();

        return res.json({
          success: true,
          verified: true,
          orderId: lockedAttempt.order_id,
          message: "Payment is already verified.",
        });
      }

      if (lockedAttempt.status !== "Generated") {
        await finalConnection.rollback();

        return res.status(409).json({
          success: false,
          verified: false,
          message: "This payment attempt cannot be completed.",
        });
      }

      const cart = JSON.parse(lockedAttempt.cart_snapshot);

      if (!Array.isArray(cart) || cart.length === 0) {
        throw new Error("Stored cart snapshot is invalid.");
      }

      const productIds = cart.map((item) => Number(item.id));

      const placeholders = productIds.map(() => "?").join(",");

      const [products] = await finalConnection.query(
        `
                            SELECT id, title, stock
                            FROM products
                            WHERE id IN (${placeholders})
                            FOR UPDATE
                        `,
        productIds,
      );

      if (products.length !== productIds.length) {
        await finalConnection.rollback();

        return res.status(409).json({
          success: false,
          verified: false,
          message:
            "One or more paid products no longer exist. Manual review is required.",
        });
      }

      for (const item of cart) {
        const product = products.find(
          (row) => Number(row.id) === Number(item.id),
        );

        if (!product || Number(product.stock) < Number(item.quantity)) {
          await finalConnection.rollback();

          return res.status(409).json({
            success: false,
            verified: false,
            message:
              "A paid product is no longer in stock. Manual review is required.",
          });
        }
      }

      const [orderResult] = await finalConnection.query(
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
          lockedAttempt.customer_name,
          lockedAttempt.phone,
          lockedAttempt.address,
          lockedAttempt.expected_amount,
          "Bank QR",
          "Paid",
        ],
      );

      const orderId = orderResult.insertId;

      const orderItems = cart.map((item) => [
        orderId,
        Number(item.id),
        Number(item.quantity),
        Number(item.price),
      ]);

      await finalConnection.query(
        `
                        INSERT INTO order_items (
                            order_id,
                            product_id,
                            quantity,
                            price
                        )
                        VALUES ?
                    `,
        [orderItems],
      );

      for (const item of cart) {
        const [stockResult] = await finalConnection.query(
          `
                                UPDATE products
                                SET stock = stock - ?
                                WHERE id = ?
                                  AND stock >= ?
                            `,
          [Number(item.quantity), Number(item.id), Number(item.quantity)],
        );

        if (stockResult.affectedRows !== 1) {
          throw new Error("Stock changed during payment finalization.");
        }
      }

      await finalConnection.query(
        `
                        UPDATE khqr_payment_attempts
                        SET
                            order_id = ?,
                            status = 'Verified',
                            bakong_transaction_hash = ?,
                            verified_at =
                                CURRENT_TIMESTAMP
                        WHERE id = ?
                          AND status = 'Generated'
                    `,
        [orderId, transactionHash, paymentAttemptId],
      );

      await finalConnection.commit();

      return res.json({
        success: true,
        verified: true,
        orderId,
        paymentStatus: "Paid",
        message: "Payment verified and order created successfully.",
      });
    } catch (error) {
      if (finalConnection) {
        await finalConnection.rollback();
      }

      console.error("Payment finalization failed:", error);

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          verified: false,
          message: "This Bakong transaction has already been used.",
        });
      }

      return res.status(500).json({
        success: false,
        verified: false,
        message:
          "Payment was received but the order could not be finalized. Manual review is required.",
      });
    } finally {
      if (finalConnection) {
        finalConnection.release();
      }
    }
  });
  router.get("/orders/:customerName", (req, res) => {
    const customerName = req.params.customerName;
    const query = `
            SELECT 
                o.id AS order_id,
                o.customer_name,
                o.phone AS customer_phone,
                o.address,
                o.total,
                o.payment_method,
                o.status,
                o.created_at,
                oi.quantity,
                oi.price,
                p.title,
                p.category
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.customer_name = ?
            ORDER BY o.id DESC
        `;

    db.query(query, [customerName], (error, results) => {
      if (error) {
        console.error("Error fetching customer orders:", error);
        return res
          .status(500)
          .json({ success: false, error: "Database query failed" });
      }
      res.json(results);
    });
  });

  router.delete("/orders", (req, res) => {
    const deleteItemsQuery = "DELETE FROM order_items";
    const deleteOrdersQuery = "DELETE FROM orders";

    db.query(deleteItemsQuery, (err) => {
      if (err) {
        console.error("Error clearing order items:", err);
        return res.status(500).json({ success: false, error: err.message });
      }
      db.query(deleteOrdersQuery, (err2) => {
        if (err2) {
          console.error("Error clearing orders:", err2);
          return res.status(500).json({ success: false, error: err2.message });
        }
        res.json({ success: true, message: "All orders cleared successfully" });
      });
    });
  });

  return router;
};
