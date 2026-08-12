const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

module.exports = function(db) {

    // Ensure uploads folder exists
    const uploadDir = path.join(__dirname, '../public/image/uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'public/image/uploads/');
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    });

    const upload = multer({ storage: storage });

    router.get('/products', (req, res) => {
        const searchQuery = req.query.search;
        let sqlQuery = 'SELECT * FROM products';
        let queryParams = [];

        if (searchQuery) {
            sqlQuery += ' WHERE title LIKE ? OR brand LIKE ? OR category LIKE ?';
            const wildCard = `%${searchQuery}%`;
            queryParams = [wildCard, wildCard, wildCard];
        }

        sqlQuery += ' ORDER BY id DESC';

        db.query(sqlQuery, queryParams, (error, results) => {
            if (error) {
                console.error('Error fetching products:', error);
                return res.status(500).json({ success: false, error: 'Database query failed' });
            }

            const formattedProducts = results.map(product => {
                let finalImageUrl = product.image_url;

                if (finalImageUrl) {
                    if (finalImageUrl.startsWith('./image/uploads/')) {
                        const cleanPath = finalImageUrl.substring(2);
                        finalImageUrl = `http://localhost:3000/${cleanPath}`;
                    } else if (finalImageUrl.startsWith('image/uploads/')) {
                        finalImageUrl = `http://localhost:3000/${finalImageUrl}`;
                    } else if (finalImageUrl.startsWith('./')) {
                        finalImageUrl = `http://localhost:3000/${finalImageUrl.substring(2)}`;
                    }
                } else {
                    finalImageUrl = 'http://localhost:3000/image/logo copy.png';
                }

                return {
                    id: product.id,
                    sku: product.sku,
                    title: product.title,
                    brand: product.brand,
                    category: product.category,
                    price: parseFloat(product.price),
                    discount_price: product.discount_price !== null && product.discount_price !== undefined ? parseFloat(product.discount_price) : null,
                    discount_start: product.discount_start ? product.discount_start.toISOString().slice(0, 19).replace('T', ' ') : null,
                    discount_end: product.discount_end ? product.discount_end.toISOString().slice(0, 19).replace('T', ' ') : null,
                    limit_per_user: product.limit_per_user !== undefined ? parseInt(product.limit_per_user) : 0,
                    stock: product.stock !== undefined ? parseInt(product.stock) : 0,
                    image_url: finalImageUrl,
                    description: product.description,
                    ingredients: product.ingredients
                };
            });

            res.json(formattedProducts);
        });
    });
    router.post('/products', upload.single('image_file'), (req, res) => {
        const { title, price, stock, category, ingredients, brand, description, discount_price, discount_start, discount_end, limit_per_user } = req.body;

        if (!title || !price) {
            return res.status(400).json({ success: false, message: 'Title and price are required.' });
        }

        let imageUrl = './image/logo copy.png';
        if (req.file) {
            imageUrl = `./image/uploads/${req.file.filename}`;
        }

        const lastIdQuery = 'SELECT id FROM products ORDER BY id DESC LIMIT 1';
        db.query(lastIdQuery, (err, lastProduct) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            const nextId = (lastProduct && lastProduct.length > 0) ? lastProduct[0].id + 1 : 1;
            const generatedSku = `MB-${nextId}`;

            const insertQuery = `
                INSERT INTO products (sku, title, brand, category, price, discount_price, stock, image_url, description, ingredients, discount_start, discount_end, limit_per_user)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const parsedDiscountPrice = (discount_price !== undefined && discount_price !== null && discount_price !== "" && parseFloat(discount_price) > 0) ? parseFloat(discount_price) : null;
            const parsedDiscountStart = (discount_start && discount_start.trim() !== "") ? discount_start : null;
            const parsedDiscountEnd = (discount_end && discount_end.trim() !== "") ? discount_end : null;

            const values = [
                generatedSku, title.trim(), brand ? brand.trim() : 'Minee Beauty Core',
                category ? category.trim() : null, parseFloat(price) || 0, parsedDiscountPrice,
                parseInt(stock, 10) || 0, imageUrl, description ? description.trim() : `${title} formula.`,
                ingredients && ingredients.trim() !== "" ? ingredients.trim() : null,
                parsedDiscountStart, parsedDiscountEnd, parseInt(limit_per_user, 10) || 0
            ];

            db.query(insertQuery, values, (insertErr, result) => {
                if (insertErr) {
                    return res.status(500).json({ success: false, error: insertErr.message });
                }
                res.status(201).json({ success: true, message: 'Product added successfully!', productId: result.insertId, sku: generatedSku });
            });
        });
    });

    router.put('/products/:id', upload.single('image_file'), (req, res) => {
        const productId = req.params.id;
        const { title, price, stock, category, ingredients, brand, description, image_url, image, img, discount_price, discount_start, discount_end, limit_per_user } = req.body;

        if (!title || !price) {
            return res.status(400).json({ success: false, message: 'Title and price are required.' });
        }

        let finalImageUrl = image_url || image || img || './image/logo copy.png';
        if (req.file) {
            finalImageUrl = `./image/uploads/${req.file.filename}`;
        }

        const updateQuery = `
            UPDATE products 
            SET title = ?, brand = ?, category = ?, price = ?, discount_price = ?, 
                stock = ?, image_url = ?, description = ?, ingredients = ?, 
                discount_start = ?, discount_end = ?, limit_per_user = ? 
            WHERE id = ?
        `;

        const parsedDiscountPrice = (discount_price !== undefined && discount_price !== null && discount_price !== "" && parseFloat(discount_price) > 0) ? parseFloat(discount_price) : null;
        const parsedDiscountStart = (discount_start && discount_start.trim() !== "") ? discount_start : null;
        const parsedDiscountEnd = (discount_end && discount_end.trim() !== "") ? discount_end : null;

        const values = [
            title.trim(), brand ? brand.trim() : 'Minee Beauty Core', category ? category.trim() : null,
            parseFloat(price) || 0, parsedDiscountPrice, parseInt(stock, 10) || 0, finalImageUrl,
            description ? description.trim() : `${title} formula.`, ingredients && ingredients.trim() !== "" ? ingredients.trim() : null,
            parsedDiscountStart, parsedDiscountEnd, parseInt(limit_per_user, 10) || 0, productId
        ];

        db.query(updateQuery, values, (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Product not found.' });
            }
            res.json({ success: true, message: 'Product updated successfully!' });
        });
    });

    router.delete('/products/:id', (req, res) => {
        const productId = req.params.id;
        db.query('DELETE FROM products WHERE id = ?', [productId], (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Product not found.' });
            }
            res.json({ success: true, message: 'Product deleted successfully!' });
        });
    });

    // ==========================================
    // GET /api/orders
    // ==========================================
    router.get('/orders', (req, res) => {
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
        cartItems.forEach(item => { total += Number(item.price) * Number(item.quantity); });

        const orderQuery = `INSERT INTO orders (customer_name, phone, address, total, payment_method) VALUES (?, ?, ?, ?, ?)`;
        db.query(orderQuery, [customer_name, phone, address, total, payment_method || 'Cash on Delivery'], (err, orderResult) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            const orderId = orderResult.insertId;
            const orderItemsValues = cartItems.map(item => [orderId, item.product_id || item.id, item.quantity, item.price]);
            const orderItemsQuery = `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?`;

            db.query(orderItemsQuery, [orderItemsValues], (itemErr) => {
                if (itemErr) {
                    return res.status(500).json({ success: false, error: itemErr.message });
                }

                let stockUpdatesCompleted = 0;
                cartItems.forEach(item => {
                    const productId = item.product_id || item.id;
                    db.query(`UPDATE products SET stock = stock - ? WHERE id = ?`, [item.quantity, productId], () => {
                        stockUpdatesCompleted++;
                        if (stockUpdatesCompleted === cartItems.length) {
                            res.status(201).json({ success: true, message: 'Order placed successfully!', orderId: orderId });
                        }
                    });
                });
            });
        });
    });

    // ==========================================
    // DELETE /api/orders
    // ==========================================
    router.delete('/orders', (req, res) => {
        db.query('DELETE FROM order_items', () => {
            db.query('DELETE FROM orders', () => {
                res.json({ success: true, message: 'All orders cleared successfully' });
            });
        });
    });

    router.get('/expenses', (req, res) => {
        db.query('SELECT * FROM expenses ORDER BY id DESC', (error, results) => {
            if (error) {
                return res.status(500).json({ success: false, error: 'Database query failed' });
            }
            res.json(results);
        });
    });

    router.post('/expenses', (req, res) => {
        const { title, category, amount } = req.body;
        if (!title || !amount) {
            return res.status(400).json({ success: false, message: 'Title and amount are required.' });
        }

        const query = 'INSERT INTO expenses (title, category, amount) VALUES (?, ?, ?)';
        db.query(query, [title.trim(), category || 'Inventory', parseFloat(amount) || 0], (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            res.status(201).json({ success: true, message: 'Expense added successfully!', expenseId: result.insertId });
        });
    });

    return router;
};