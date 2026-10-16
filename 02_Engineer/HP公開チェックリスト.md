# HP公開チェックリスト

最終更新：2026-10-16　／　状態：**HPの中身（文言・料金・メニュー）は反映済み。公開に必要な情報と設定が残っている**

## 代表の情報待ち（`web/src/config/site.ts`）
- [ ] **電話番号（070）** → `site.phone`（空のあいだは非表示）
- [ ] **メールアドレス** → `site.email`（いまは仮の `contact@example.com`）
- [ ] **ドメイン** → `site.url`（`https://toneka.jp`）
- [ ] **住所の公開範囲**／郵便番号／Googleマップ → `address`
- [ ] **プロフィール写真**（10/20の撮影後）→ `trainer.photo`
- [ ] **保有資格**：なし（空のままでセクションが非表示）
- [ ] **Instagram** → `sns.instagram`
- [ ] **Square予約URL**（審査後）→ `booking.squareUrl`

## 設定・確認
- [ ] Cloudflare Pages への公開。公開できたら `vercel.json` を削除し、`NEXT_PUBLIC_NOINDEX` を外す
- [ ] 利用規約・プライバシーポリシーの専門家確認（公開日の記載も）
- [ ] 保健所への確認（任意・おすすめ）→ [`保健所への確認メモ.md`](../01_Manager/保健所への確認メモ.md)
- [ ] 回数券（パーソナル・ストレッチ）をHPに載せるか
- [ ] 公開前の最終確認（代表）
