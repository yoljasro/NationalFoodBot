const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(bodyParser.json());
app.use(cors());

// Sandboxda foydalanadigan kalitlar
const MERCHANT_ID = '6710e2a6ddf30f131300fd27';
const SECRET_KEY = 'aX0u@gUV#Bm5NR0gDZbUN?Iet?AfvFain3J?';

// Imzo (sign) yaratish funksiyasi
function createSignature(payload) {
    return crypto.createHmac('sha1', SECRET_KEY)
        .update(MERCHANT_ID + JSON.stringify(payload))  // payload to'liq stringga aylantiring
        .digest('hex');
}
// To'lovni boshlash uchun endpoint
app.post('/payme/payment', async (req, res) => {
    const { amount, phone } = req.body;  // orderId o'rniga phone kiritiladi

    try {
        const id = Date.now().toString(); // Yangi id yaratish
        const time = id; // time parametri uchun vaqtni olamiz

        const payload = {
            method: "CreateTransaction",
            params: {
                merchant_id: MERCHANT_ID,  // to'g'ri merchant_id
                account: { order_id: phone },  // telefon raqami to'g'ri bo'lishi kerak
                amount: amount * 100,  // so'mni tiyinlarga o'tkazish
                detail: "To'lov detallari"
            },
            id: Date.now() // Request identifikatori
        };
        // Imzo yaratish
        const sign = createSignature(JSON.stringify(payload));
        const headers = {
            'Content-Type': 'application/json',
            'X-Auth': sign
        };

        const response = await axios.post('https://test.paycom.uz/api', payload, { headers });

        console.log('API response:', response.data);

        const { result, error } = response.data;
        if (error) {
            console.error('API Error:', error);
            return res.status(500).json({ error: `To‘lovni amalga oshirishda xato yuz berdi: ${error.message || error}` });
        }

        return res.json({
            payment_url: `https://test.paycom.uz/${result.token}`
        });

    } catch (error) {
        console.error('To‘lovni yuborishda xato:', error.message, error.response ? error.response.data : '');
        return res.status(500).json({ error: `To‘lovni amalga oshirishda xato yuz berdi: ${error.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`Server ishga tushdi: http://localhost:${PORT}`);
});
