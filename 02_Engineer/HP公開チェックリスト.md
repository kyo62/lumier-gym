# HP公開チェックリスト

最終更新：2026-10-21　／　状態：**https://toneka.jp で公開中**（Cloudflare Pages・公開ブランチ `claude/posture-salon-launch-rxlgl5`）

## 完了
- [x] 公開先：Cloudflare Pages（`toneka.jp` / `www.toneka.jp`、HTTPS）。環境変数は Pages の設定画面で管理（値はここに書かない）
- [x] 会員ページ：Supabase につないだ（東京リージョン・サインアップ無効・メールのコード8桁・Site URL は `https://toneka.jp`）
- [x] ログインのメール送信：Resend（送信元 `noreply@toneka.jp`）
- [x] 受信：`info@toneka.jp` → 代表のメールに転送（Cloudflare Email Routing。受信テスト済み）
- [x] 連絡先・住所・営業日・プロフィール写真を `site.ts` に反映
- [x] 検索に出す設定（`NEXT_PUBLIC_NOINDEX` を削除済み）
- [x] 2026-10-21：地図の欄に設定用の文言が出ていたのを、住所＋「Googleマップで見る」に変更／「予約ページ準備中」を、LINE（なければお電話・メール）の入口に変更／営業日の注記の確認先を「LINEまたはお電話」に／ヒーローの営業欄を「火・水・土・日／水・土は隔週」に／初回体験（60分・3,300円）を「初めての方」に追記／利用規約の「制定日」の未記入の文言を非表示に

- [x] 2026-10-23：D-2ロゴ（正式ロゴ）をヘッダー・フッター・ファビコン・ホーム画面アイコンに反映

## 未完了
- [ ] **Squareの予約URL**（審査後）→ `booking.squareUrl`。入れると、予約ボタンと注記の文言が自動で「予約ページ」に切り替わる
- [ ] **埋め込み地図のURL** → `address.mapEmbedUrl`（なくても、住所とリンクは出る）
- [ ] 保有資格（なし）／Instagram URL（未登録）
- [ ] **利用規約・プライバシーポリシーの専門家確認：今はやらない（当面OK・代表判断 2026-10-23）。** 規約の制定日（`terms/page.tsx` の `ENACTED_ON`）は、そのときに入れる。（AIの意見：会員の個人情報を本格的に預かる前〈モニター開始〜〉に、一度見直すと安心）
- [ ] 保健所への確認（ストレッチ）→ [`保健所への確認メモ.md`](../01_Manager/保健所への確認メモ.md)
- [ ] Google Search Console の登録（`https://toneka.jp/sitemap.xml` を送信）、Google ビジネスプロフィール
- [ ] `info@` から返信（送信）する設定
- [ ] 公開ブランチを `main` に切り替えるか（急ぎではない）。ルートの `vercel.json` の削除
