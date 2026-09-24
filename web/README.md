# TONEKA ホームページ（LP）

名古屋・名城公園のパーソナルコンディショニングサロン **TONEKA（トネカ）** の
公式サイトです。**1枚完結型のランディングページ**として実装しています。

- **予約と決済は Square で完結**します。このサイトは予約ページへ送り出す役割です
- 完全に静的なサイト（サーバー不要）としてビルドされます

---

## 技術構成

| レイヤー | 採用 |
|---|---|
| フレームワーク | Next.js 16（App Router）/ TypeScript |
| UI | Tailwind CSS v4 / lucide-react |
| フォント | Shippori Mincho（見出し）/ Noto Sans JP（本文） |
| ホスティング | Cloudflare Pages（無料・商用可）を推奨 |

外部サービスへの依存がないため、**環境変数なしでそのまま動きます。**

---

## セットアップ

```bash
cd web
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # 本番ビルド
npm run lint     # ESLint
```

---

## 文言を自分で直したいとき

**[`編集ガイド.md`](./編集ガイド.md) を読んでください。**
コードを書いたことがなくても直せるよう、手順を分けて書いてあります。

---

## 公開前に必ず書き換える箇所

**`src/config/site.ts` がこのサイトの設定の中心です。** ここだけ直せば全ページに反映されます。

```bash
grep -n "=== TODO" src/config/site.ts
```

| 項目 | 場所 |
|---|---|
| **Square予約ページのURL** | `booking.squareUrl`（**未設定のあいだ、予約ボタンは「準備中」表示**） |
| ドメイン | `site.url` |
| 連絡先メール | `site.email` |
| 住所・郵便番号 | `site.address` |
| Googleマップの埋め込みURL | `site.address.mapEmbedUrl` |
| Instagram / LINE | `site.sns` |
| 営業曜日・時間 | `businessHours` |
| プロフィール写真 | `profile.photo`（`public/` に画像を置いてパスを指定） |
| 保有資格 | `profile.credentials`（空のままなら、その欄ごと非表示） |
| 利用規約の制定日 | `src/app/terms/page.tsx` |

**料金・プラン・お悩み・セッションの流れ・FAQ も、すべて `site.ts` の配列を直すだけで変わります。**

---

## ⚠️ 公開前の法務チェック

`src/app/terms/page.tsx` の**第4条（クーリング・オフ）と第5条（中途解約）**は、
月額プランが特定商取引法の「特定継続的役務提供」に該当する可能性を踏まえて入れています。

**該当有無そのものが未確定です。公開前に名古屋市消費生活センターの事業者相談（無料）で
チェックを受けてください。** 詳細は [`../01_Manager/会員規約_追加条項ドラフト.md`](../01_Manager/会員規約_追加条項ドラフト.md)。

また、広告表現として以下は使っていません。**追記する際もこの方針を守ってください。**

- 「治療」「治る」「改善します」など効果を断定する表現
- 「矯正」「歪み」（医業類似行為と誤認されうる表現）
- 効果の保証、誇大な数値

---

## デプロイ

完全に静的なので、どこにでも置けます。

### Cloudflare Pages（無料・商用利用可／推奨）

```bash
npm install --save-dev @opennextjs/cloudflare wrangler
npx opennextjs-cloudflare build
npx wrangler deploy
```

### Vercel

GitHubリポジトリを接続し、**Root Directory を `web` に設定**するだけです。

> ⚠️ **Vercel の Hobby（無料）プランは非商用の個人利用に限定されています。**
> 商用サイトの本番運用には Pro（月20USD）が必要です。無料で商用運用したい場合は
> Cloudflare を選んでください。

### 公開後にやること

1. Google Search Console にサイトを登録（`/sitemap.xml` が自動生成されます）
2. Googleビジネスプロフィールの登録（**住所公開を伴うため、管理会社の了承と安全面の判断を先に**）
3. Instagram のプロフィールにサイトURLを設置

---

## 構成

```
web/
├── src/
│   ├── config/site.ts        # ★ここを直せばサイトが変わる（文言・料金・営業日すべて）
│   ├── app/
│   │   ├── page.tsx          # トップページ（1枚完結型LP）
│   │   ├── layout.tsx        # メタデータ・フォント
│   │   ├── globals.css       # デザイントークン（和モダンの配色）
│   │   ├── terms/            # 利用規約
│   │   ├── privacy/          # プライバシーポリシー
│   │   ├── robots.ts         # robots.txt
│   │   └── sitemap.ts        # sitemap.xml
│   ├── components/site/      # LPの各セクション
│   └── lib/utils.ts
└── public/                   # 写真を置く場所
```

### セクションの並び

Hero → Concept（お悩み・屋号の由来）→ Reasons（選ばれる3つの理由）→ Flow（90分の流れ）
→ Price（メニュー・料金）→ Profile → Access（アクセス・ご利用にあたって）→ FAQ → 予約CTA

---

## 予約システムについて

以前このリポジトリには、Supabaseを使った自作の予約システム（顧客向け予約フロー・
管理画面・二重予約防止の排他制約つき）がありました。**予約をSquareで完結させる方針に
決まったため、2026-09-23 に削除しています。**

**コードはGitの履歴に残っています。** Squareが手狭になった場合は、
`git log --diff-filter=D -- web/src/app/reserve` で削除コミットを特定して復元できます。
