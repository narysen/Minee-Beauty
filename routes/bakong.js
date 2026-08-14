const express = require('express');
const router = express.Router();
const axios = require('axios');
const { KHQR, CURRENCY, COUNTRY, TAG } = require('ts-khqr');

module.exports = function(db) {
    // Generate dynamic KHQR code locally using config credentials
    router.post('/bakong/generate-qr', (req, res) => {
        const { amount, currency, description } = req.body;

        try {
            const accountId = process.env.KHQR_ACCOUNT_ID || "sokheng_sour@bkrt";
            const merchantName = process.env.KHQR_ACCOUNT_NAME || "SOKHENG SOUR";
            const merchantCity = process.env.KHQR_ACCOUNT_CITY || "Phnom Penh";
            const curEnum = (currency === "KHR") ? CURRENCY.KHR : CURRENCY.USD;

            // Generate KHQR payload and MD5 hash string
            const khqrData = KHQR.generate({
                tag: TAG.INDIVIDUAL,
                accountID: accountId,
                merchantName: merchantName,
                merchantCity: merchantCity,
                currency: curEnum,
                amount: Number(amount) || 1.00,
                countryCode: COUNTRY.KH,
                expirationTimestamp: Date.now() + 10 * 60 * 1000, // 10 mins expiry
                additionalData: {
                    purposeOfTransaction: description || "Minee Beauty Store Order"
                }
            });

            if (!khqrData || !khqrData.data) {
                return res.status(400).json({ success: false, error: "Failed to build KHQR data package." });
            }

            res.json({
                success: true,
                data: {
                    qrString: khqrData.data.qr,
                    md5: khqrData.data.md5
                }
            });
        } catch (error) {
            console.error('KHQR generation module error:', error.message);
            res.status(500).json({ success: false, error: 'Failed to generate Bakong KHQR code locally' });
        }
    });

    // Check transaction status endpoint against official Bakong API
    router.post('/bakong/check-transaction', async (req, res) => {
        const { md5 } = req.body;

        if (!md5) {
            return res.status(400).json({ success: false, error: 'Transaction MD5 hash is required' });
        }

        try {
            const response = await axios.post(`${process.env.BAKONG_API_BASE_URL}/v1/check_transaction_by_md5`, {
                md5: md5
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.BAKONG_API_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            res.json({
                success: true,
                data: response.data
            });
        } catch (error) {
            console.error('Bakong verification error:', error.response?.data || error.message);
            res.status(500).json({ success: false, error: 'Transaction verification failed' });
        }
    });

    return router;
};