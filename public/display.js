let orders = [];
let ws;
let previousPendingNumbers = new Set();
let previousCompletedNumbers = new Set();

// WebSocket接続
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
        console.log('WebSocket接続成功');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };

    ws.onclose = () => {
        console.log('WebSocket切断。5秒後に再接続します...');
        setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = (error) => {
        console.error('WebSocketエラー:', error);
    };
}

// メッセージ処理
function handleMessage(data) {
    switch (data.type) {
        case 'init':
            orders = data.orders;
            updateDisplay();
            break;
        case 'orderCreated':
            orders.push(data.order);
            updateDisplay();
            break;
        case 'orderUpdated':
            const index = orders.findIndex(o => o.id === data.order.id);
            if (index !== -1) {
                orders[index] = data.order;
                updateDisplay();
            }
            break;
        case 'orderCancelled':
            const cancelIndex = orders.findIndex(o => o.id === data.orderId);
            if (cancelIndex !== -1) {
                orders[cancelIndex].cancelled = true;
                updateDisplay();
            }
            break;
    }
}

// 表示更新
function updateDisplay() {
    displayPendingNumbers();
    displayCompletedNumbers();
}

// 提供済み以外の番号を表示（左側）
function displayPendingNumbers() {
    const container = document.getElementById('pending-numbers');

    // 提供済み以外でキャンセルされていない注文
    const pendingOrders = orders.filter(o => 
        !o.cancelled && 
        o.status !== '提供済み' && 
        o.displayNumber
    );

    if (pendingOrders.length === 0) {
        container.innerHTML = '<p class="empty-message">現在調理中の注文はありません</p>';
        previousPendingNumbers.clear();
        return;
    }

    // 表示番号を取得
    const numbers = pendingOrders
        .map(o => o.displayNumber)
        .sort((a, b) => a - b);

    // 新しい番号を検出
    const currentNumbers = new Set(numbers);
    const newNumbers = new Set();
    currentNumbers.forEach(num => {
        if (!previousPendingNumbers.has(num)) {
            newNumbers.add(num);
        }
    });

    container.innerHTML = numbers
        .map(num => {
            const displayNum = String(num).padStart(2, '0');
            const isNew = newNumbers.has(num);
            return `<div class="number-box ${isNew ? 'new' : ''}">${displayNum}</div>`;
        })
        .join('');

    previousPendingNumbers = currentNumbers;
}

// 提供済みの番号を表示（右側）
function displayCompletedNumbers() {
    const container = document.getElementById('completed-numbers');

    // 提供済みでキャンセルされていない注文
    const completedOrders = orders.filter(o => 
        !o.cancelled && 
        o.status === '提供済み' && 
        o.displayNumber
    );

    if (completedOrders.length === 0) {
        container.innerHTML = '<p class="empty-message">お渡し可能な注文はありません</p>';
        previousCompletedNumbers.clear();
        return;
    }

    // 表示番号を取得
    const numbers = completedOrders
        .map(o => o.displayNumber)
        .sort((a, b) => a - b);

    // 新しい番号を検出
    const currentNumbers = new Set(numbers);
    const newNumbers = new Set();
    currentNumbers.forEach(num => {
        if (!previousCompletedNumbers.has(num)) {
            newNumbers.add(num);
        }
    });

    container.innerHTML = numbers
        .map(num => {
            const displayNum = String(num).padStart(2, '0');
            const isNew = newNumbers.has(num);
            return `<div class="number-box ${isNew ? 'new' : ''}">${displayNum}</div>`;
        })
        .join('');

    previousCompletedNumbers = currentNumbers;
}

// 初期化
connectWebSocket();
