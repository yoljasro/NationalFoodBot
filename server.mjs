import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

const CLICK_SECRET_KEY = 'QhnGBRmx2WOexDJKgL';
const CLICK_MERCHANT_ID = '333605228';
const SERVICE_ID = '58676';  // O'zingizning xizmat id'sini yozing
const CLICK_LIVE_API_KEY = '27487_AB04A064D77602E082F3BEC3F515E4258EF99F5C'; // Sizning Live API kaliti
const BASE_URL = 'https://fc17-90-156-162-59.ngrok-free.app'; // O'zingizning saytingiz manzili

// Click orqali to'lov yaratish
app.post('/api/payment', async (req, res) => {
    const { amount, order_id } = req.body;

    try {
        console.log('Payment request:', { amount, order_id }); // Log payment request

        // Sign stringni yaratish
        const sign_string = crypto
            .createHash('md5')
            .update(`${CLICK_SECRET_KEY}${amount}${order_id}${CLICK_LIVE_API_KEY}`) // Live API kalitini qo'shish
            .digest('hex');

        const response = await axios.post('https://my.click.uz/services/pay', {
            click_trans_id: null,  // Click orqali to'lov yaratishda boshida bo'sh bo'lishi mumkin
            merchant_trans_id: order_id,
            merchant_prepare_id: order_id,
            amount: amount,
            action: 1, // Transaction yaratish uchun action 1 bo'lishi kerak
            merchant_id: CLICK_MERCHANT_ID,
            service_id: SERVICE_ID,
            sign_time: new Date().toISOString(),
            sign_string: sign_string,
            return_url: `${BASE_URL}/payment-success`,  // To'lov muvaffaqiyatli bo'lganida qaytish manzili
            cancel_url: `${BASE_URL}/payment-failed`,   // To'lov muvaffaqiyatsiz bo'lganda qaytish manzili
        });

        console.log('Click response:', response.data); // Log Click API response

        const paymentUrl = response.data.payment_url;  // Clickdan qaytgan URL
        res.status(200).json({ paymentUrl });  // Frontendga URLni yuborish

    } catch (error) {
        console.error('Payment error:', error.message);  // Log xatoni
        res.status(500).json({ error: error.message });
    }
});

// To'lov statusini olish
app.post('/api/click-webhook', (req, res) => {
    const { merchant_trans_id, amount, status, click_trans_id } = req.body;

    // To'lov muvaffaqiyatli bo'lganligini tekshirish
    if (status === 1) {
        // To'lov qabul qilindi
        console.log('To\'lov muvaffaqiyatli:', merchant_trans_id, amount, click_trans_id);
    } else {
        // To'lov muvaffaqiyatsiz
        console.log('To\'lovda xato:', status);
    }

    res.status(200).send('OK');
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
