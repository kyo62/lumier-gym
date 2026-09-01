# lumier-gym

姿勢改善サロン（名古屋市北区・完全予約制）の開業準備と、HP兼予約システムのリポジトリです。

## 構成

プロジェクトは役割ごとのフォルダに分かれています。全体のルールは [`CLAUDE.md`](./CLAUDE.md) にあります。

| ディレクトリ | 役割 | 内容 |
|---|---|---|
| [`00_Context/`](./00_Context) | ナレッジ・共有情報 | 代表の経歴、コンセプト、物件・設備情報（**全員必読**） |
| [`01_Manager/`](./01_Manager) | 経営・進行管理 | 開業タスク一覧、スケジュール、交渉戦略、行政手続き |
| [`02_Engineer/`](./02_Engineer) | システム開発 | HP・予約システムの設計と技術選定 |
| [`03_Marketer/`](./03_Marketer) | 集客・マーケティング | キャッチコピー、料金設計、集客導線 |
| [`04_Finance/`](./04_Finance) | 財務・備品管理 | 初期費用、固定費の管理、備品リスト |
| [`web/`](./web) | — | **HP兼予約システムの実装**（Next.js 16 + Supabase） |
| `src/`, `index.html` ほか | — | 初期に作成した React + Vite のランディングページ（参考用。`web/` に移行済み） |

## 主なドキュメント

- [サロン基本情報](./00_Context/salon_info.md) — 代表者、コンセプト、物件、設備、交渉条件、未確定事項
- [開業タスクリスト](./01_Manager/salon_opening_checklist.md) — 物件交渉からオープン後30日までを、優先度と実行タイミング付きのチェックリストにしたもの
- [予約システムの技術選定・ロードマップ](./02_Engineer/booking_system_roadmap.md) — 技術スタックの選定理由、DB設計、フェーズ別の開発手順

## はじめかた

```bash
cd web
npm install
cp .env.example .env.local   # 空のままでもデモモードで起動します
npm run dev                  # http://localhost:3000
```

環境変数の設定、データベースの作成、デプロイ手順は [`web/README.md`](./web/README.md) を参照してください。
