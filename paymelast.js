const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const MERCHANT_ID = '6710e2a6ddf30f131300fd27'; // O'zingizning merchant ID bilan almashtiring
const SECRET_KEY = 'aX0u@gUV#Bm5NR0gDZbUN?Iet?AfvFfain3J?'; // O'zingizning sir kalitingiz bilan almashtiring

function createSignature(payload) {
    const stringToSign = MERCHANT_ID + JSON.stringify(payload);
    return crypto.createHmac('sha1', SECRET_KEY)
        .update(stringToSign)
        .digest('hex');
}

function createErrorResponse(id, code, message, data) {
    return {
        jsonrpc: "2.0",
        id: id,
        error: {
            code: code,
            message: message,
            data: data
        }
    };
}

const orders = [
    { id: 'order_r1yd38', amount: 5000 },
    { id: 'order_xyz123', amount: 10000 }
];

const transactions = {};

app.post('/api', (req, res) => {
    const { jsonrpc, id, method, params } = req.body;

    switch (method) {
        case 'CheckPerformTransaction':
            handleCheckPerformTransaction(id, params, res);
            break;
        case 'CreateTransaction':
            handleCreateTransaction(id, params, res);
            break;
        case 'PerformTransaction':
            handlePerformTransaction(id, params, res);
            break;
        case 'CancelTransaction':
            handleCancelTransaction(id, params, res);
            break;
        case 'CheckTransaction':
            handleCheckTransaction(id, params, res);
            break;
        case 'GetStatement':
            handleGetStatement(id, params, res);
            break;
        case 'ChangePassword':
            handleChangePassword(id, params, res);
            break;
        default:
            res.status(400).json(createErrorResponse(id, -32601, "Method not found", {}));
    }
});

function handleCheckPerformTransaction(id, params, res) {
    const { amount, account } = params;

    if (!account || !account.order_id) {
        return res.json(createErrorResponse(id, -32504, "Неверная авторизация", { reason: "order_id is missing or invalid" }));
    }

    // 1. Summani tekshirish
    if (amount <= 0) {
        return res.json(createErrorResponse(id, -31001, "Неверная сумма", { reason: "Amount must be greater than zero" }));
    }

    // 2. Mavjud buyurtmani tekshirish
    const order = orders.find(order => order.id === account.order_id);
    if (!order) {
        return res.json(createErrorResponse(id, -31099, "Несуществующий счёт", { reason: "Account does not exist" }));
    }

    // 3. Miqdor to'g'ri kelish-kelmasligini tekshirish
    if (amount > order.amount) {
        return res.json(createErrorResponse(id, -31001, "Неверная сумма", { reason: "Amount exceeds order amount" }));
    }

    const payload = { amount, account };
    const signature = createSignature(payload);

    res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
            allow: true,
            reason: null,
            success: true,
            signature: signature
        }
    });
}

// CreateTransaction handler
function handleCreateTransaction(id, params, res) {
    const { amount, account, time } = params;

    // 1. Order_id mavjudligini tekshirish
    if (!account || !account.order_id) {
        return res.json(createErrorResponse(id, -32504, "Неверная авторизация", { reason: "order_id is missing or invalid" }));
    }

    // 2. Tranzaksiya summasini tekshirish
    if (typeof amount !== 'number' || amount <= 0) {
        return res.json(createErrorResponse(id, -31001, "Неверная сумма", { reason: "Amount must be a positive number greater than zero" }));
    }

    // 3. Mavjud buyurtma va tranzaksiyani tekshirish
    const order = orders.find(order => order.id === account.order_id);
    if (!order) {
        return res.json(createErrorResponse(id, -31099, "Несуществующий счёт", { reason: "Account does not exist" }));
    }

    // 4. Miqdor to'g'ri kelish-kelmasligini tekshirish
    if (amount > order.amount) {
        return res.json(createErrorResponse(id, -31001, "Неверная сумма", { reason: "Amount exceeds order amount" }));
    }

    // 5. Agar mavjud tranzaksiya bo'lsa, xatoni qaytarish
    if (transactions[account.order_id] && transactions[account.order_id].state === 1) {
        return res.json(createErrorResponse(id, -31008, "Транзакция уже существует", { reason: "A pending transaction already exists for this account" }));
    }

    // 6. Yangi tranzaksiyani yaratish
    const transactionId = `txn_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`;
    transactions[account.order_id] = { amount, account, state: 1, id: transactionId };

    // 7. Javobni qaytarish
    res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
            create_time: Date.now(),
            transaction: transactionId,
            state: 1,
            success: true,
            receivers: null
        }
    });
}

// PerformTransaction handler
function handlePerformTransaction(id, params, res) {
    const { transactionId, account } = params;

    if (!account || !account.order_id) {
        return res.json(createErrorResponse(id, -32504, "Неверная авторизация", { reason: "order_id is missing or invalid" }));
    }

    const transaction = Object.values(transactions).find(tx => tx.id === transactionId);
    if (!transaction) {
        return res.json(createErrorResponse(id, -31099, "Несуществующий транзакция", { reason: "Transaction does not exist" }));
    }

    // Perform transaction logic
    transaction.state = 2; // 2 - indicating the transaction is performed
    res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
            transactionId: transactionId,
            success: true,
            state: transaction.state
        }
    });
}

// CancelTransaction handler
function handleCancelTransaction(id, params, res) {
    const { transactionId, account } = params;

    if (!account || !account.order_id) {
        return res.json(createErrorResponse(id, -32504, "Неверная авторизация", { reason: "order_id is missing or invalid" }));
    }
    if (pendingTransactionExists) {
        return createErrorResponse(-31008, "Транзакция уже существует", { reason: "A pending transaction already exists for this account" });
    }

    const transaction = Object.values(transactions).find(tx => tx.id === transactionId);
    if (!transaction) {
        return res.json(createErrorResponse(id, -31099, "Несуществующий транзакция", { reason: "Transaction does not exist" }));
    }

    // Cancel transaction logic
    delete transactions[transactionId];
    res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
            transactionId: transactionId,
            success: true
        }
    });
}

// CheckTransaction handler
function handleCheckTransaction(id, params, res) {
    const { transactionId, account } = params;

    if (!account || !account.order_id) {
        return res.json(createErrorResponse(id, -32504, "Неверная авторизация", { reason: "order_id is missing or invalid" }));
    }

    const transaction = Object.values(transactions).find(tx => tx.id === transactionId);
    if (!transaction) {
        return res.json(createErrorResponse(id, -31099, "Несуществующий транзакция", { reason: "Transaction does not exist" }));
    }

    res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
            transactionId: transactionId,
            state: transaction.state === 1 ? 'pending' : 'completed' // Return transaction state
        }
    });
}

// GetStatement handler
function handleGetStatement(id, params, res) {
    const { account } = params;

    if (!account || !account.order_id) {
        return res.json(createErrorResponse(id, -32504, "Неверная авторизация", { reason: "order_id is missing or invalid" }));
    }

    // Placeholder for statement retrieval logic
    res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
            transactions: Object.values(transactions).filter(tx => tx.account.order_id === account.order_id) // Filter transactions for the account
        }
    });
}

// ChangePassword handler
function handleChangePassword(id, params, res) {
    const { account, oldPassword, newPassword } = params;

    if (!account || !account.order_id) {
        return res.json(createErrorResponse(id, -32504, "Неверная авторизация", { reason: "order_id is missing or invalid" }));
    }

    // Placeholder for password change logic
    res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
            success: true
        }
    });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});