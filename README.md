# lumier-gym

姿勢改善サロン（名古屋市北区・完全予約制）の開業準備と、HP兼予約システムのリポジトリです。

## 構成

| ディレクトリ | 内容 |
|---|---|
| [`web/`](./web) | **HP兼予約システム（Next.js 16 + Supabase）**。実装はこちら。セットアップ手順は [`web/README.md`](./web/README.md) |
| [`docs/`](./docs) | 開業タスクリストと、システムの技術選定・ロードマップ |
| `src/`, `index.html` ほか | 初期に作成した React + Vite のランディングページ（参考用。`web/` に移行済み） |

## ドキュメント

- [開業タスクリスト](./docs/salon-opening-checklist.md) — 物件交渉からオープン後30日までを、優先度と実行タイミング付きのチェックリストにしたもの
- [予約システムの技術選定・ロードマップ](./docs/booking-system-roadmap.md) — 技術スタックの選定理由、DB設計、フェーズ別の開発手順

## はじめかた

```bash
cd web
npm install
cp .env.example .env.local   # 空のままでもデモモードで起動します
npm run dev                  # http://localhost:3000
```

環境変数の設定、データベースの作成、デプロイ手順は [`web/README.md`](./web/README.md) を参照してください。
