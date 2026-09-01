# 姿勢改善サロン HP＋予約システム

名古屋市北区・完全予約制の姿勢改善サロン向けの、ホームページ兼予約管理システムです。
週数日の稼働・1名運営・ランニングコストほぼゼロを前提に設計しています。

- **ホームページ**：コンセプト／プロフィール／メニュー・料金／ご利用の流れ／アクセス／FAQ
- **予約（お客様）**：メニュー選択 → カレンダーで空き枠選択 → 情報入力 → 確定。キャンセルURL付き
- **予約（管理者）**：予約一覧・施術メモ、営業日カレンダーでの臨時休業／臨時営業／枠のブロック、定期営業日の編集

---

## 技術構成

| レイヤー | 採用 |
|---|---|
| フレームワーク | Next.js 16（App Router）/ TypeScript |
| UI | Tailwind CSS v4 / lucide-react |
| データベース | Supabase（PostgreSQL） |
| 管理者認証 | Supabase Auth（メールのマジックリンク） |
| メール送信 | Resend |
| ボット対策 | Cloudflare Turnstile（任意） |

**二重予約はデータベースの排他制約で防いでいます。** アプリ側の「空きを確認してから書き込む」処理は同時アクセスで破綻するため、最終的な整合性は `bookings` テーブルの `EXCLUDE USING gist` 制約が担保します（`supabase/migrations/0001_init.sql`）。

---

## セットアップ

### 1. 依存関係のインストール

```bash
cd web
npm install
```

### 2. 環境変数

```bash
cp .env.example .env.local
```

`.env.local` に各サービスの値を入れます。**何も設定しなくても `npm run dev` は動きます**（デモモード：設定ファイルの営業時間からサンプルの空き枠を表示し、予約の確定だけができない状態）。

| 変数 | 取得元 | 必須 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | ○ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同上 | ○ |
| `SUPABASE_SERVICE_ROLE_KEY` | 同上（⚠️ 公開厳禁） | ○ |
| `ADMIN_EMAIL` | 管理画面にログインできる唯一のアドレス | ○ |
| `NEXT_PUBLIC_SITE_URL` | 本番URL（例 `https://example.com`） | ○ |
| `RESEND_API_KEY` / `MAIL_FROM` | Resend | 推奨 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile | 任意 |

### 3. データベースの作成

Supabase ダッシュボード → **SQL Editor** で `supabase/migrations/0001_init.sql` の内容を貼り付けて実行します。テーブル、排他制約、RLS、初期の営業日が作られます。

### 4. 管理者アカウントの作成

Supabase ダッシュボード → **Authentication → Users → Add user** で、`ADMIN_EMAIL` と同じアドレスのユーザーを1件作成します（パスワードは何でも構いません。ログインはマジックリンクで行います）。

さらに **Authentication → URL Configuration** で以下を設定します。

- Site URL：`http://localhost:3000`（開発中）／本番URL
- Redirect URLs：`http://localhost:3000/auth/callback` と `https://あなたのドメイン/auth/callback`

### 5. 起動

```bash
npm run dev      # http://localhost:3000
```

---

## 開業前に必ず書き換える箇所

コード内の **`=== TODO`** を検索してください。主なものは以下です。

```bash
grep -rn "=== TODO" src/
```

- `src/config/site.ts` — **ここがサイトの設定の中心です**
  - 屋号、ドメイン、連絡先、住所、Googleマップの埋め込みURL
  - プロフィール（トレーナー名、経歴文、写真、保有資格）
  - **メニューと料金**（`menus`）
  - 予約ポリシー（受付リードタイム、何日先まで、キャンセル規定）
  - 定期営業日の初期値（`defaultBusinessHours`）
- `src/app/terms/page.tsx` — 利用規約のたたき台
- `src/app/privacy/page.tsx` — プライバシーポリシーのたたき台
- `supabase/migrations/0001_init.sql` の末尾 — 初期の営業曜日

> ⚠️ **回数券・継続プランを追加する場合の注意**
> 「契約期間1ヶ月超 かつ 総額5万円超」は特定商取引法の特定継続的役務提供に該当する可能性があり、概要書面・契約書面の交付とクーリング・オフ対応が必要になります。詳しくは `../01_Manager/salon_opening_checklist.md` を参照してください。

写真は `public/` に置き、`src/config/site.ts` の `profile.photo` にパスを指定します。未設定のあいだはプレースホルダーが表示されます。

---

## デプロイ

### Cloudflare Workers（無料・商用利用可／推奨）

```bash
npm install --save-dev @opennextjs/cloudflare wrangler
npx opennextjs-cloudflare build
npx wrangler deploy
```

環境変数は Cloudflare のダッシュボード、または `wrangler secret put` で登録します。

### Vercel

GitHubリポジトリを接続し、**Root Directory を `web` に設定**して環境変数を登録すればデプロイされます。

> ⚠️ **Vercel の Hobby（無料）プランは非商用の個人利用に限定されています。** 収益を上げるサロンの公式サイトは商用利用にあたるため、本番運用には Pro プラン（月20USD）が必要です。無料で商用運用したい場合は Cloudflare を選んでください。開発・プレビュー用途で Hobby を使うことは問題ありません。

### デプロイ後に必ずやること

1. **Supabase のスリープ対策**：無料プロジェクトは1週間アクセスが無いと一時停止されます。Cloudflare Cron Triggers か GitHub Actions（どちらも無料）で、定期的に `/api/availability?menuId=trial` を叩く仕組みを入れてください。
2. Supabase の **Redirect URLs** に本番の `/auth/callback` を追加。
3. Resend で**独自ドメインの認証**を済ませ、`MAIL_FROM` をそのドメインのアドレスにする。
4. Google Search Console にサイトを登録（`/sitemap.xml` が自動生成されます）。

---

## コマンド

```bash
npm run dev     # 開発サーバー
npm run build   # 本番ビルド
npm run lint    # ESLint
npm test        # 空き枠計算ロジックのテスト
```

`npm test` は、営業時間テンプレート・臨時休業・予約済み枠・受付リードタイムの組み合わせで
空き枠が正しく算出されるかを検証します（`tests/availability.test.js`）。
予約ロジックに手を入れたら必ず実行してください。

---

## 構成

```
web/
├── src/
│   ├── config/site.ts          # ★サイト設定の中心（屋号・メニュー・営業ポリシー）
│   ├── lib/
│   │   ├── availability.ts     # 空き枠の算出（純粋関数・テスト対象）
│   │   ├── bookings.ts         # 予約の取得と作成（サーバー専用）
│   │   ├── time.ts             # 日本時間の扱い（DBはUTC、表示はJST）
│   │   ├── calendar.ts         # 月カレンダーの組み立て
│   │   ├── mail.ts             # Resendによる通知メール
│   │   └── supabase/           # DBクライアント（admin=service_role / server=セッション）
│   ├── app/
│   │   ├── page.tsx            # トップページ
│   │   ├── reserve/            # 予約フロー（お客様側）
│   │   ├── cancel/[token]/     # お客様によるキャンセル
│   │   ├── admin/              # 管理画面（(dashboard)=要ログイン / login=公開）
│   │   ├── api/                # 空き枠API・予約API
│   │   └── auth/callback/      # マジックリンクの受け口
│   ├── components/
│   │   ├── site/               # トップページの各セクション
│   │   ├── reserve/            # カレンダー・予約フォーム
│   │   └── admin/              # 予約カード・営業日エディタ
│   └── proxy.ts                # 管理画面のセッション更新（Next.js 16のmiddleware）
├── supabase/migrations/        # データベーススキーマ
└── tests/                      # 空き枠ロジックのテスト
```

---

## 設計上の判断

- **メニューはDBではなく設定ファイル（`src/config/site.ts`）に置いています。** 変更頻度が低く、トップページと予約フローで同じ内容を使うため、1か所で完結させたほうが齟齬が起きません。予約時のメニュー名・料金・時間はDBに控えるので、後からメニューを変えても過去の予約履歴は壊れません。
- **予約枠は「施術時間＋バッファ」を占有します。** 60分の施術でバッファ15分なら、DB上は75分をブロックし、お客様には「60分」と表示します。片付けと記録の時間を確保するためです。バッファは `src/config/site.ts` のメニューごとに設定できます。
- **匿名ユーザーからのDB直接アクセスはRLSで全面的に禁止しています。** 読み書きはすべてサーバー側を経由し、お客様のブラウザに返すのは「予約可能な開始時刻の配列」だけです。他のお客様の氏名・連絡先・お悩みがブラウザに渡る経路はありません。
- **管理画面の操作はすべて素の `<form>` + Server Action です。** JavaScriptが無効でも動き、状態管理のコードが不要になります。
