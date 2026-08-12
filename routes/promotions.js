const express = require('express');

module.exports = function(db) {
    const router = express.Router();

    router.put('/products/:id/promotion', (req, res) => {
        const productId = req.params.id;
        const { promo_price, promo_start, promo_end, promo_limit } = req.body;

        const updateQuery = `
            UPDATE products 
            SET discount_price = ?, 
                discount_start = ?, 
                discount_end = ?, 
                limit_per_user = ? 
            WHERE id = ?
        `;

        const parsedPromoPrice = (promo_price !== undefined && promo_price !== null && promo_price !== "" && parseFloat(promo_price) >= 0)
            ? parseFloat(promo_price)
            : null;

        const parsedStart = (promo_start && promo_start.trim() !== "") ? promo_start : null;
        const parsedEnd = (promo_end && promo_end.trim() !== "") ? promo_end : null;
        
        // Fixed: Use promo_limit instead of limit_per_user
        const parsedLimit = (promo_limit !== undefined && promo_limit !== null && promo_limit !== "") ? parseInt(promo_limit, 10) : 0;

        const values = [
            parsedPromoPrice,
            parsedStart,
            parsedEnd,
            parsedLimit,
            productId
        ];

        db.query(updateQuery, values, (err, result) => {
            if (err) {
                console.error('Error updating product promotion:', err);
                return res.status(500).json({ success: false, error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Product not found.' });
            }

            res.json({
                success: true,
                message: 'Promotional configuration updated successfully!'
            });
        });
    });

    return router;
};