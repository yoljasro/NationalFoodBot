const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require("cors");

const app = express();
const PORT = 4000;

// API ma'lumotlari
const MERCHANT_ID = '27487'; // Sizning merchant ID
const SERVICE_ID = '37711'; // Sizning service ID
const MERCHANT_USER_ID = '46815'; // Sizning merchant user ID
const SECRET_KEY = 'isJihg1thilU'; // Sizning secret key

// Middleware
app.use(express.json()); // JSON formatida ma'lumotlarni qabul qilish
app.use(cors());

// Invoice yaratish
app.post('/create-invoice', async (req, res) => {
    const { amount, phoneNumber, merchantTransId } = req.body; // Telefon raqamini qabul qilish
    const timestamp = Math.floor(Date.now() / 1000); // UNIX vaqt
    const digest = crypto.createHash('sha1').update(timestamp + SECRET_KEY).digest('hex'); // sha1 hash

    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Auth': `${MERCHANT_USER_ID}:${digest}:${timestamp}`
    };

    const data = {
        service_id: SERVICE_ID,
        amount: amount,
        phone_number: phoneNumber, // Telefon raqamini yuborish
        merchant_trans_id: merchantTransId
    };

    try {
        const response = await axios.post('https://api.click.uz/v2/merchant/invoice/create', data, { headers });
        
        // Olingan invoice_id yordamida to'lov sahifasiga yo'naltirish
        const paymentUrl = `https://my.click.uz/services/pay?service_id=${SERVICE_ID}&merchant_id=${MERCHANT_ID}&amount=${amount}&transaction_param=${merchantTransId}&return_url=http://localhost:${PORT}/return-url`;

        res.json({ paymentUrl }); // To'lov sahifasiga yo'naltirish URLini yuborish
    } catch (error) {
        console.error('Error creating invoice:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Invoice creation failed', details: error.message });
    }
});

// Serverni boshlash
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
