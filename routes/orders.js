const express = require('express');
const router = express.Router();

module.exports = function(db) {

    router.get('/orders', (req, res) => {
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
                console.error('Error fetching orders:', error);
                return res.status(500).json({ success: false, error: 'Database query failed' });
            }
            res.json(results);
        });
    });
    router.get('/orders/:customerName', (req, res) => {
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
                console.error('Error fetching customer orders:', error);
                return res.status(500).json({ success: false, error: 'Database query failed' });
            }
            res.json(results);
        });
    });
    router.post('/checkout', (req, res) => {
        const { customer_name, phone, address, payment_method, items, cart } = req.body;
        
        const cartItems = items || cart;

        if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({ success: false, message: 'No items in cart.' });
        }

        let total = 0;
        cartItems.forEach(item => {
            total += Number(item.price) * Number(item.quantity);
        });

        const orderQuery = `INSERT INTO orders (customer_name, phone, address, total, payment_method) VALUES (?, ?, ?, ?, ?)`;
        db.query(orderQuery, [customer_name, phone, address, total, payment_method || 'Cash on Delivery'], (err, orderResult) => {
            if (err) {
                console.error('Checkout error (orders):', err);
                return res.status(500).json({ success: false, error: err.message });
            }

            const orderId = orderResult.insertId;
            
            const orderItemsValues = cartItems.map(item => [
                orderId, 
                Number(item.product_id || item.id), 
                Number(item.quantity), 
                Number(item.price)
            ]);
            
            const orderItemsQuery = `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?`;

            db.query(orderItemsQuery, [orderItemsValues], (itemErr) => {
                if (itemErr) {
                    console.error('Checkout error (order_items):', itemErr);
                    return res.status(500).json({ success: false, error: itemErr.message });
                }

                let stockUpdatesCompleted = 0;
                cartItems.forEach(item => {
                    const productId = Number(item.product_id || item.id);
                    const quantity = Number(item.quantity);
                    const updateStockQuery = `UPDATE products SET stock = stock - ? WHERE id = ?`;
                    
                    db.query(updateStockQuery, [quantity, productId], (stockErr, stockResult) => {
                        if (stockErr) {
                            console.error(`Failed to update stock for product ${productId}:`, stockErr);
                        } else {
                            console.log(`Successfully subtracted ${quantity} from Product ID ${productId}. Affected rows: ${stockResult.affectedRows}`);
                        }
                        
                        stockUpdatesCompleted++;
                        if (stockUpdatesCompleted === cartItems.length) {
                            res.status(201).json({
                                success: true,
                                message: 'Order placed successfully and stock updated!',
                                orderId: orderId
                            });
                        }
                    });
                });
            });
        });
    });
    router.delete('/orders', (req, res) => {
        const deleteItemsQuery = 'DELETE FROM order_items';
        const deleteOrdersQuery = 'DELETE FROM orders';

        db.query(deleteItemsQuery, (err) => {
            if (err) {
                console.error('Error clearing order items:', err);
                return res.status(500).json({ success: false, error: err.message });
            }
            db.query(deleteOrdersQuery, (err2) => {
                if (err2) {
                    console.error('Error clearing orders:', err2);
                    return res.status(500).json({ success: false, error: err2.message });
                }
                res.json({ success: true, message: 'All orders cleared successfully' });
            });
        });
    });

    return router;
};