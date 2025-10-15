# 学園祭注文管理システム

簡単な注文管理システムです。受付端末と店端末の2つの画面で構成されています。

## 機能

### 受付端末
- 商品A, B, C の選択と個数入力
- 合計金額の表示
- 注文の送信

### 店端末
- 注文の受信と管理
- ステータス管理（注文済み → 金券受け取り済み → 調理中 → 提供済み）
- 注文のキャンセル機能
- リアルタイム更新

## 商品情報
- 商品A: ¥100
- 商品B: ¥100
- 商品C: ¥200

## セットアップ

1. 依存パッケージのインストール:
```bash
npm install
```

2. サーバーの起動:
```bash
npm start
```

3. ブラウザでアクセス:
- 受付端末: http://localhost:3000/
- 店端末: http://localhost:3000/store

## 技術スタック
- Node.js + Express (サーバー)
- WebSocket (リアルタイム通信)
- HTML/CSS/JavaScript (フロントエンド)
- JSON (データ保存)

## ファイル構成
```
school-festival-order/
├── server.js              # サーバー本体
├── orders.json            # 注文データ保存
├── package.json           # パッケージ設定
├── README.md              # このファイル
└── public/
    ├── reception.html     # 受付端末画面
    ├── reception.css      # 受付端末スタイル
    ├── reception.js       # 受付端末スクリプト
    ├── store.html         # 店端末画面
    ├── store.css          # 店端末スタイル
    └── store.js           # 店端末スクリプト
```
