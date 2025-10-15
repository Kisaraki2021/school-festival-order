const products = {
    A: { name: '商品A', price: 100 },
    B: { name: '商品B', price: 100 },
    C: { name: '商品C', price: 200 }
};

let ws;

// WebSocket接続
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
        console.log('WebSocket接続成功');
    };

    ws.onclose = () => {
        console.log('WebSocket切断。5秒後に再接続します...');
        setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = (error) => {
        console.error('WebSocketエラー:', error);
    };
}

connectWebSocket();

// 数量変更
function changeQuantity(productId, delta) {
    const input = document.getElementById(`quantity-${productId}`);
    let value = parseInt(input.value) || 0;
    value = Math.max(0, value + delta);
    input.value = value;
    updateOrderSummary();
}

// 注文内容更新
function updateOrderSummary() {
    const orderItemsDiv = document.getElementById('order-items');
    const totalPriceSpan = document.getElementById('total-price');

    let total = 0;
    let hasItems = false;
    let html = '';

    for (const [id, product] of Object.entries(products)) {
        const quantity = parseInt(document.getElementById(`quantity-${id}`).value) || 0;
        if (quantity > 0) {
            hasItems = true;
            const subtotal = product.price * quantity;
            total += subtotal;
            html += `
        <div class="order-item">
          <span>${product.name} × ${quantity}</span>
          <span>¥${subtotal.toLocaleString()}</span>
        </div>
      `;
        }
    }

    if (!hasItems) {
        html = '<p style="text-align: center; color: #999; padding: 20px;">商品を選択してください</p>';
    }

    orderItemsDiv.innerHTML = html;
    totalPriceSpan.textContent = `¥${total.toLocaleString()}`;
}

// 注文クリア
function clearOrder() {
    for (const id of Object.keys(products)) {
        document.getElementById(`quantity-${id}`).value = 0;
    }
    updateOrderSummary();
}

// 注文送信
function submitOrder() {
    const items = [];

    for (const [id, product] of Object.entries(products)) {
        const quantity = parseInt(document.getElementById(`quantity-${id}`).value) || 0;
        if (quantity > 0) {
            items.push({
                id: id,
                name: product.name,
                price: product.price,
                quantity: quantity
            });
        }
    }

    if (items.length === 0) {
        showMessage('商品を選択してください', 'error');
        return;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'newOrder',
            items: items
        }));

        showMessage('注文を送信しました！', 'success');
        clearOrder();
    } else {
        showMessage('サーバーに接続できません', 'error');
    }
}

// メッセージ表示
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type} show`;

    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 3000);
}

// 初期化
updateOrderSummary();
