const TelegramBot = require('node-telegram-bot-api');
const token = '6837472952:AAE_uj8Ovl5ult8urjEVQUWptSKSJKBzws4';
const webAppUrl = 'https://milliyfront-last.vercel.app/';

// Botni yaratamiz
const bot = new TelegramBot(token, { polling: true });

// Bot uchun /start komandasi
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'View Order', web_app: { url: webAppUrl } }]
            ]
        }
    };

    bot.sendMessage(chatId, 'Давайте начнем 🥩 Нажмите кнопку ниже, чтобы заказать идеальный обед!', opts);
});

// Web botga o'tishni amalga oshirish uchun tugmani yaratamiz
bot.on('message', (msg) => {
    if (msg.text === 'View Order') {
        bot.sendMessage(msg.chat.id, 'Opening web bot...', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Open Web Bot', web_app: { url: webAppUrl } }]
                ]
            }
        });
    }
});
