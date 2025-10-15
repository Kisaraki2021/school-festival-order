let orders = [];
let currentFilter = 'all';
let hideCancelled = true;
let ws;

const statusFlow = ['注文済み', '金券受け取り済み', '調理中', '提供済み'];

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
            playNotificationSound();
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

// 通知音（簡易版）
function playNotificationSound() {
    // ブラウザの Audio API を使用
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

// ステータスでフィルター
function filterByStatus(status) {
    currentFilter = status;

    // タブの active クラスを更新
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.status === status) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    updateDisplay();
}

// 表示更新
function updateDisplay() {
    updateBadges();
    displayOrders();
}

// バッジ更新
function updateBadges() {
    // 全体の件数
    const allCount = orders.filter(o => !o.cancelled).length;
    const allBadge = document.getElementById('badge-all');
    if (allBadge) {
        allBadge.textContent = allCount;
    }

    // 各ステータスの件数
    statusFlow.forEach(status => {
        const count = orders.filter(o => o.status === status && !o.cancelled).length;
        const badge = document.getElementById(`badge-${status}`);
        if (badge) {
            badge.textContent = count;
        }
    });
}

// キャンセル表示フィルター切り替え
function toggleCancelledFilter() {
    hideCancelled = document.getElementById('hide-cancelled').checked;
    updateDisplay();
}

// 注文表示
function displayOrders() {
    const container = document.getElementById('orders-container');

    // フィルター適用
    let filteredOrders = orders;

    // ステータスフィルター
    if (currentFilter !== 'all') {
        filteredOrders = filteredOrders.filter(o => o.status === currentFilter);
    }

    // キャンセルフィルター
    if (hideCancelled) {
        filteredOrders = filteredOrders.filter(o => !o.cancelled);
    }

    if (filteredOrders.length === 0) {
        container.innerHTML = '<p class="no-orders">注文がありません</p>';
        return;
    }

    container.innerHTML = filteredOrders
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map(order => createOrderCard(order))
        .join('');
}

// 注文カード作成
function createOrderCard(order) {
    const total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const time = new Date(order.timestamp).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const itemsHtml = order.items.map(item => `
    <div class="order-item">
      <div>
        <span class="item-name">${item.name}</span>
        <span class="item-quantity">× ${item.quantity}</span>
      </div>
      <span class="item-price">¥${(item.price * item.quantity).toLocaleString()}</span>
    </div>
  `).join('');

    const nextStatus = getNextStatus(order.status);
    const nextButtonText = nextStatus ? `→ ${nextStatus}` : '完了';

    const cancelledHtml = order.cancelled ? '<div class="cancelled-label">キャンセル済み</div>' : '';

    const actionsHtml = order.cancelled ? '' : `
    <div class="order-actions">
      ${nextStatus ? `
        <button class="btn btn-next" onclick="updateStatus(${order.id}, '${nextStatus}')">
          ${nextButtonText}
        </button>
      ` : `
        <button class="btn btn-disabled" disabled>完了</button>
      `}
      <button class="btn btn-cancel" onclick="cancelOrder(${order.id})">
        キャンセル
      </button>
    </div>
  `;

    const displayNum = order.displayNumber ? String(order.displayNumber).padStart(2, '0') : '??';

    return `
    <div class="order-card ${order.cancelled ? 'cancelled' : ''}">
      <div class="order-header">
        <div class="order-number">
          <span class="display-number">${displayNum}</span>
          <span class="internal-id">(ID: ${order.id})</span>
        </div>
        <div class="order-time">${time}</div>
      </div>
      ${cancelledHtml}
      <div class="order-items">
        ${itemsHtml}
      </div>
      <div class="order-total">
        合計: ¥${total.toLocaleString()}
      </div>
      <div class="order-status">${order.status}</div>
      ${actionsHtml}
    </div>
  `;
}

// 次のステータス取得
function getNextStatus(currentStatus) {
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex === statusFlow.length - 1) {
        return null;
    }
    return statusFlow[currentIndex + 1];
}

// ステータス更新
function updateStatus(orderId, newStatus) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'updateStatus',
            orderId: orderId,
            status: newStatus
        }));
    }
}

// 注文キャンセル
function cancelOrder(orderId) {
    if (confirm('この注文をキャンセルしますか?')) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'cancelOrder',
                orderId: orderId
            }));
        }
    }
}

// 初期化
connectWebSocket();
