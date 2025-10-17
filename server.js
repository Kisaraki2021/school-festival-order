const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 静的ファイルの提供
app.use(express.static('public'));
app.use(express.json());

// 注文データを保存するファイル
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// 注文データの読み込み
function loadOrders() {
    try {
        if (fs.existsSync(ORDERS_FILE)) {
            const data = fs.readFileSync(ORDERS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('注文データの読み込みエラー:', error);
    }
    return [];
}

// 注文データの保存
function saveOrders(orders) {
    try {
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    } catch (error) {
        console.error('注文データの保存エラー:', error);
    }
}

let orders = loadOrders();
let orderIdCounter = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1;
let displayNumberCounter = orders.length > 0 ? Math.max(...orders.map(o => o.displayNumber || 0)) : 0;

// WebSocket接続
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('新しいクライアントが接続しました');
    clients.add(ws);

    // 既存の注文データを送信
    ws.send(JSON.stringify({
        type: 'init',
        orders: orders
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(data);
        } catch (error) {
            console.error('メッセージ処理エラー:', error);
        }
    });

    ws.on('close', () => {
        console.log('クライアントが切断しました');
        clients.delete(ws);
    });
});

// メッセージ処理
function handleMessage(data) {
    switch (data.type) {
        case 'newOrder':
            createOrder(data.items);
            break;
        case 'updateStatus':
            updateOrderStatus(data.orderId, data.status);
            break;
        case 'cancelOrder':
            cancelOrder(data.orderId);
            break;
    }
}

// 新規注文作成
function createOrder(items) {
    // 表示番号を01~20で循環
    displayNumberCounter = (displayNumberCounter % 20) + 1;

    const order = {
        id: orderIdCounter++,
        displayNumber: displayNumberCounter,
        items: items,
        status: '注文済み',
        timestamp: new Date().toISOString(),
        cancelled: false
    };
    orders.push(order);
    saveOrders(orders);
    broadcastToClients({
        type: 'orderCreated',
        order: order
    });
}

// 注文ステータス更新
function updateOrderStatus(orderId, status) {
    const order = orders.find(o => o.id === orderId);
    if (order && !order.cancelled) {
        order.status = status;
        saveOrders(orders);
        broadcastToClients({
            type: 'orderUpdated',
            order: order
        });
    }
}

// 注文キャンセル
function cancelOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.cancelled = true;
        saveOrders(orders);
        broadcastToClients({
            type: 'orderCancelled',
            orderId: orderId
        });
    }
}

// 全クライアントに送信
function broadcastToClients(data) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// ルート
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reception.html'));
});

app.get('/store', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'store.html'));
});

app.get('/display', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'display.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`サーバーが起動しました: http://localhost:${PORT}`);
    console.log(`受付端末: http://localhost:${PORT}/`);
    console.log(`店端末: http://localhost:${PORT}/store`);
    console.log(`番号表示端末: http://localhost:${PORT}/display`);
});
