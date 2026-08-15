const express = require("express");

module.exports = function (db) {
  const router = express.Router();

  router.put("/products/:id/promotion", async (req, res) => {
    const productId = Number.parseInt(req.params.id, 10);

    const {
      promo_price,
      promo_start,
      promo_end,
      promo_limit,
      bulk_min_quantity,
      bulk_discount_percent,
    } = req.body;

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid product ID is required.",
      });
    }

    const parsedPromoPrice =
      promo_price === undefined || promo_price === null || promo_price === ""
        ? null
        : Number(promo_price);

    const parsedStart =
      typeof promo_start === "string" && promo_start.trim() !== ""
        ? promo_start.trim()
        : null;

    const parsedEnd =
      typeof promo_end === "string" && promo_end.trim() !== ""
        ? promo_end.trim()
        : null;

    const parsedLimit =
      promo_limit === undefined || promo_limit === null || promo_limit === ""
        ? 0
        : Number.parseInt(promo_limit, 10);

    const parsedBulkMinimum =
      bulk_min_quantity === undefined ||
      bulk_min_quantity === null ||
      bulk_min_quantity === ""
        ? 0
        : Number.parseInt(bulk_min_quantity, 10);

    const parsedBulkPercent =
      bulk_discount_percent === undefined ||
      bulk_discount_percent === null ||
      bulk_discount_percent === ""
        ? 0
        : Number(bulk_discount_percent);

    if (!Number.isInteger(parsedLimit) || parsedLimit < 0) {
      return res.status(400).json({
        success: false,
        message: "Purchase limit must be zero or a positive whole number.",
      });
    }

    const bulkPromotionIsDisabled =
      parsedBulkMinimum === 0 && parsedBulkPercent === 0;

    const bulkPromotionIsValid =
      Number.isInteger(parsedBulkMinimum) &&
      parsedBulkMinimum >= 2 &&
      Number.isFinite(parsedBulkPercent) &&
      parsedBulkPercent > 0 &&
      parsedBulkPercent <= 100;

    if (!bulkPromotionIsDisabled && !bulkPromotionIsValid) {
      return res.status(400).json({
        success: false,
        message:
          "For a quantity discount, minimum quantity must be at least 2 and discount must be between 1% and 100%. Set both fields to 0 to disable it.",
      });
    }

    if (
      parsedStart &&
      parsedEnd &&
      new Date(parsedEnd) <= new Date(parsedStart)
    ) {
      return res.status(400).json({
        success: false,
        message: "Promotion expiration must be later than its start time.",
      });
    }

    try {
      const [products] = await db.promise().query(
        `
            SELECT id, price
            FROM products
            WHERE id = ?
            LIMIT 1
          `,
        [productId],
      );

      if (products.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      const regularPrice = Number(products[0].price);

      if (
        parsedPromoPrice !== null &&
        (!Number.isFinite(parsedPromoPrice) ||
          parsedPromoPrice <= 0 ||
          parsedPromoPrice >= regularPrice)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Promotional price must be greater than zero and lower than the original price.",
        });
      }

      await db.promise().query(
        `
          UPDATE products
          SET
            discount_price = ?,
            discount_start = ?,
            discount_end = ?,
            limit_per_user = ?,
            bulk_min_quantity = ?,
            bulk_discount_percent = ?
          WHERE id = ?
        `,
        [
          parsedPromoPrice,
          parsedStart,
          parsedEnd,
          parsedLimit,
          parsedBulkMinimum,
          parsedBulkPercent,
          productId,
        ],
      );

      return res.json({
        success: true,
        message: "Promotional configuration updated successfully!",
      });
    } catch (error) {
      console.error("Error updating product promotion:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update the promotion.",
      });
    }
  });

  return router;
};
