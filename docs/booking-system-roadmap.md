# 姿勢改善サロン HP＋予約システム 開発ロードマップ／技術選定

対象：週2〜3日稼働・完全予約制・1名運営のサロン。ランニングコスト実質ゼロを目標とする。

---

## 0. 結論（先に読む3行）

1. **技術スタックは「Next.js（App Router）＋ Supabase（Postgres）＋ Tailwind CSS」を推奨**。既存の React + Vite のLPコンポーネントはほぼそのまま移植できる。
2. **ホスティングは開発中は Vercel、本番公開時に「Vercel Pro（有料）」か「Cloudflare（無料・商用可）」を選択**する。理由は下の「⚠️ 無料枠の注意」に記載。ここは前提の修正が必要な箇所なので必ず読んでほしい。
3. **HPと予約システムは同時に作らない**。HPを先に公開して集客導線を先行させ、予約は暫定運用（LINE公式＋フォーム）でも開業日は死守する。

---

## ⚠️ 無料枠についての重要な注意（前提の訂正）

ご要望は「Vercel＋Supabaseで無料」でしたが、実務上そのままだと1点だけリスクがあります。

**Vercel の Hobby（無料）プランは、非商用の個人利用に限定されています。** 収益を上げるサロンの公式サイトは商用利用にあたるため、厳密には Pro プラン（月20USD／約3,000円）が必要になります。開発・検証段階で Hobby を使うことは問題ありません。

完全に無料で商用運用したい場合の選択肢：

| 選択肢 | 商用利用 | 月額 | 備考 |
|---|---|---|---|
| **Cloudflare Workers / Pages** | ○ 可 | 0円 | `@opennextjs/cloudflare` で Next.js をそのまま載せられる。無料枠が非常に大きい。**本命** |
| **Netlify（Free）** | ○ 可 | 0円 | Next.js対応。ビルド時間の月間上限あり |
| **Vercel Pro** | ○ 可 | 約3,000円 | 最も手間がかからない。DX（開発体験）は最良 |
| Vercel Hobby | ✕ 非商用のみ | 0円 | 開発・プレビュー用途に限定して使う |

**推奨する進め方**：まず Vercel Hobby で開発を進め（コードはホスティング非依存）、一般公開の直前に「月3,000円を払って Vercel Pro にする」か「Cloudflare に移して0円にする」かを判断する。**同じ Next.js のコードなので、どちらを選んでも作り直しは発生しません。**

**Supabase の無料プロジェクトは、1週間まったくアクセスが無いと自動的に一時停止されます。** 週2〜3日稼働のサロンでも通常のアクセスがあれば問題ありませんが、開業直後の閑散期に予約システムが止まると事故になります。**定期的に軽いリクエストを打つ Cron（Cloudflare Cron Triggers または GitHub Actions／どちらも無料）を必ず設定してください。**

### 想定ランニングコスト

| 項目 | サービス | 年額 |
|---|---|---|
| ドメイン | お名前.com / Cloudflare Registrar 等 | 約1,500〜2,000円 |
| ホスティング | Cloudflare | 0円 |
| データベース | Supabase Free | 0円 |
| メール送信 | Resend Free（月3,000通） | 0円 |
| スパム対策 | Cloudflare Turnstile | 0円 |
| **合計** | | **年 約2,000円** |

---

## 1. 推奨技術スタックと選定理由

| レイヤー | 採用技術 | 選定理由 |
|---|---|---|
| フレームワーク | **Next.js 15（App Router）／TypeScript** | ①HPのSEOとSNSシェア用OGP画像にサーバーレンダリングが必須。②予約確定処理・メール送信・管理者認証といった「ブラウザに置けない処理」をRoute Handlersで同一プロジェクト内に書ける。フロントとバックエンドが1つのリポジトリで完結する |
| UI | **Tailwind CSS ＋ 既存コンポーネント流用** | 既存LP（Hero/Concept/Pricing等）がTailwindで書かれており、そのまま移植できる。スマホ対応はTailwindのレスポンシブ記法で完結 |
| アニメーション | **Framer Motion**（既存を継続） | 既に導入済み。Next.jsでは `'use client'` を付けるだけで動く |
| データベース | **Supabase（PostgreSQL）** | ①無料枠でPostgresの全機能が使える。②**予約の二重取りを、アプリのif文ではなくDBの制約（排他制約）で防げる**のが決定的な採用理由。③管理画面をGUIで触れるので、緊急時に手動で予約を直せる |
| 認証 | **Supabase Auth（マジックリンク）** | 管理者が1名のみ。パスワード管理不要のメールリンク認証が最も安全かつ実装が軽い |
| メール送信 | **Resend** | 無料枠で月3,000通。API1本で送れる。予約数が月100件でも通知は往復200通程度なので無料枠で十分 |
| カレンダーUI | **react-day-picker ＋ 自作の時間枠リスト** | FullCalendar等は多機能すぎて重く、管理者向け機能は有料。日付選択は軽量ライブラリ、時間枠は自作ボタンのリストで十分かつ速い |
| 日付処理 | **date-fns / date-fns-tz** | 日本時間（Asia/Tokyo）はサマータイムが無いため処理が単純。DBはUTCで保存し、表示のみJSTに変換する |
| ボット対策 | **Cloudflare Turnstile** | 無料。CAPTCHAのような操作をユーザーに強いない |
| ホスティング | **Cloudflare（本番）／Vercel（開発）** | 上記「無料枠の注意」参照 |

### なぜ Firebase / Google Sheets ではないのか

- **Firebase（Firestore）**：ドキュメント型のため「同じ時間帯の予約が既に無いか」を確実に排他制御するのが難しく、二重予約対策で無駄な苦労が発生する。予約システムはリレーショナルDBが素直。
- **Google Sheets API**：手軽だが、①同時アクセス時の整合性が保証されない、②APIのレート制限が厳しい、③顧客の連絡先や身体の悩みという**個人情報をスプレッドシートに置く運用リスク**が高い。管理画面の代わりとして使うにも、Supabaseのダッシュボードで十分に代替できる。

### 既存リポジトリ（React + Vite）の扱い

現在の `src/components/` にある Hero / Concept / Features / Trainers / Pricing / Contact / Footer は、**ファイル先頭に `'use client'` を追記するだけでほぼそのまま Next.js に移植できます**。`tailwind.config.js` の配色トークン（`primary: #D4AF37` 等）とフォント指定も持ち込みます。

> 補足：現在の `tailwind.config.js` は `plugins: []` が `theme` の内側に入っており、位置としては誤りです（今は空配列なので実害はありません）。移植の際に `theme` の外へ出してください。

---

## 2. 開発ロードマップ（フェーズ別）

### Phase 0：環境構築（0.5日）
1. 各種アカウント作成（第3章のリスト）
2. Next.js プロジェクト作成、既存リポジトリへの取り込み
3. Supabase プロジェクト作成、環境変数の設定
4. 空のページを1回デプロイして**公開までの導線を先に通しておく**（最後にまとめてデプロイして詰まるのが最悪のパターン）

**このフェーズの完了条件**：ブラウザで公開URLに「Hello」が表示される

---

### Phase 1：HP部分の実装と先行公開（2〜3日）
1. 既存コンポーネントの移植（`'use client'` 付与、`next/image` への置き換え）
2. サロン向けに文言を書き換え
   - コンセプト
   - **プロフィール（2017年からのパーソナルトレーナー実績）** ← 最大の差別化要素なので最も文字数を割く
   - メニュー・料金
   - アクセス（Googleマップ埋め込み、最寄り駅からの徒歩ルート）
3. メタタグ／OGP／構造化データ（`LocalBusiness` schema.org）の設定 ← ローカル検索に効く
4. 独自ドメインを接続して**公開**

**このフェーズの完了条件**：スマホでHPが崩れず表示され、LINEでURLを共有するとOGP画像が出る

> **重要**：ここで一度公開してしまう。予約機能は「準備中・予約はLINEから」ボタンで代替できる。**HPの公開が早いほど検索エンジンの評価が育つ**ため、完成を待つ理由がない。

---

### Phase 2：データベース設計と空き枠ロジック（2日）

Supabase上に以下のテーブルを作成する。

```sql
-- 排他制約に等値条件（将来ベッドを2台にする等）を混ぜる場合に必要。
-- 1部屋・1台運用のうちは無くても動くが、入れておいて損はない
create extension if not exists btree_gist;

-- メニュー
create table menus (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  duration_min int  not null,        -- 施術時間（分）
  buffer_min   int  not null default 15, -- 前後の準備・記録時間
  price        int  not null,
  is_active    boolean not null default true,
  sort_order   int  not null default 0
);

-- 定期営業日テンプレート（例：火・木・土の10:00-19:00）
create table business_hours (
  id         uuid primary key default gen_random_uuid(),
  weekday    int  not null check (weekday between 0 and 6), -- 0=日曜
  start_time time not null,
  end_time   time not null,
  is_open    boolean not null default true
);

-- 臨時の休業・臨時営業（テンプレートを日付単位で上書きする）
create table schedule_overrides (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  kind       text not null check (kind in ('closed','open')),
  start_time time,
  end_time   time,
  note       text
);

-- 部分的なブロック（私用・移動時間など）
create table slot_blocks (
  id        uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  reason    text
);

-- 予約
create table bookings (
  id            uuid primary key default gen_random_uuid(),
  menu_id       uuid references menus(id),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  customer_name text not null,
  phone         text not null,
  email         text,
  concern       text,                 -- 現在の身体の悩み
  status        text not null default 'confirmed'
                check (status in ('confirmed','cancelled','done')),
  cancel_token  uuid not null default gen_random_uuid(), -- 顧客用キャンセルURL
  created_at    timestamptz not null default now(),

  -- ★ここが要：有効な予約どうしの時間帯重複をDBが物理的に拒否する
  constraint no_overlap exclude using gist (
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmed')
);
```

**この排他制約が本システムの心臓部です。** アプリ側で「空いているか確認 → 書き込む」という処理を書くと、2人が同時に送信した瞬間に二重予約が発生します。DBの制約で弾けば、どんなタイミングでも後から来た方が必ずエラーになります。

**空き枠の算出ロジック（サーバー側）**：

```
候補枠 = business_hours（曜日テンプレ）
       ± schedule_overrides（臨時休業を除外／臨時営業を追加）
       − bookings（status='confirmed' と重なる枠）
       − slot_blocks（ブロックと重なる枠）
       − 受付リードタイム（例：来店の24時間前を過ぎた枠は非表示）
       − 受付上限（例：60日より先は非表示）
```

**RLS（行単位セキュリティ）の方針**：`bookings` テーブルは匿名ユーザーからの読み書きを**すべて拒否**する。予約の作成・取得はNext.jsのサーバー側（service_roleキー使用）経由のみとする。顧客に返す空き枠情報は「開始時刻の配列」だけで、他人の予約情報は一切ブラウザに渡さない。

**このフェーズの完了条件**：SQLで営業日テンプレを入れると、APIが正しい空き枠の配列を返す

---

### Phase 3：顧客側の予約フロー（2〜3日）
1. `/reserve` ページ：メニュー選択 → カレンダーで日付選択 → 空き時間ボタン選択
2. 入力フォーム：氏名／電話／メール／**現在の身体の悩み**／要望、規約同意チェック
3. 確認画面 → 送信 → 完了画面
4. Turnstileによるボット対策、サーバー側での入力値検証（Zod）
5. `/reserve/cancel/[token]` ：顧客が自分でキャンセルできるページ

**このフェーズの完了条件**：スマホの実機で予約が通り、取った枠がカレンダーから消える

---

### Phase 4：管理者画面（2日）
1. Supabase Auth のマジックリンクでログイン（許可メールアドレスを環境変数で1件に限定）
2. `/admin` 予約一覧：今日・今週・今後の予約をリスト表示、詳細（悩み・連絡先）閲覧、ステータス変更
3. `/admin/schedule` 週表示カレンダー：
   - 日付をクリックして**臨時休業／臨時営業**を設定
   - 時間帯をドラッグまたは選択して**ブロック**を作成
   - 定期営業日テンプレート（曜日・時間帯）の編集
4. `/admin/menus` メニューと料金の編集

**このフェーズの完了条件**：スマホから営業日を追加・削除でき、顧客側の表示に即座に反映される

---

### Phase 5：通知と運用の仕上げ（1日）
1. Resendで**予約完了メール**（顧客宛：日時・場所・持ち物・キャンセルURL／管理者宛：予約内容）
2. 前日リマインドメール（Cronで毎日1回実行）
3. Supabaseスリープ防止のヘルスチェックCron
4. Googleアナリティクス／Search Console設置
5. **本番ホスティングの最終決定**（Cloudflare へ移すか Vercel Pro にするか）
6. 通しテスト：予約 → メール受信 → 管理画面で確認 → キャンセル → 枠が復活

**このフェーズの完了条件**：自分が客としてスマホで予約し、メールが届き、管理画面に出る

---

### 合計：実働 約10〜12日

> **削っていい機能（MVPに入れない）**：オンライン決済、会員登録・ログイン、ポイント、複数スタッフ対応、予約変更機能（キャンセル→再予約で代替）、多言語対応。
> 週数日・1名運営では**これらは全て過剰**で、作った分だけ保守コストになります。決済は現地で現金・QR決済、リマインドはメールで十分に回ります。

---

## 3. 最初に準備するもの

### 3-1. 作成すべき外部サービスアカウント

| # | サービス | 用途 | 費用 | 優先 |
|---|---|---|---|---|
| 1 | **GitHub** | ソースコード管理（既にお持ち） | 無料 | 必須 |
| 2 | **Supabase** | データベース・管理者認証 | 無料 | 必須 |
| 3 | **Vercel** | 開発中のデプロイ先（GitHubアカウントで連携） | 無料 | 必須 |
| 4 | **Cloudflare** | 本番ホスティング／DNS／Turnstile | 無料 | 必須 |
| 5 | **ドメイン登録業者** | 独自ドメイン取得（Cloudflare Registrar が最安級） | 年1,500円〜 | 必須 |
| 6 | **Resend** | 予約完了メールの送信 | 無料 | 必須 |
| 7 | **Google ビジネス プロフィール** | 地図検索対策（名古屋市北区での最重要施策） | 無料 | 必須 |
| 8 | **LINE公式アカウント** | 予約リマインド・再来店促進の予備導線 | 無料枠あり | 推奨 |
| 9 | Google Search Console / Analytics | アクセス解析 | 無料 | 推奨 |

> 注：LINE Notify は2025年3月にサービス終了しています。管理者への即時通知に使う予定があった場合は、**Resendのメール通知**か、必要なら Discord / Slack の Webhook（いずれも無料）で代替してください。

### 3-2. PCで最初に実行するコマンド

```bash
# --- 0. 前提の確認（Node.js 20以上が必要） -------------------
node -v          # v20.x 以上であること。無ければ https://nodejs.org からLTS版を導入
git --version

# --- 1. Next.js プロジェクトを作成 --------------------------
# 既存の lumier-gym リポジトリとは別に、まず新規で作って中身を移植するのが安全
npx create-next-app@latest salon-web \
  --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"

cd salon-web

# --- 2. 必要なライブラリを導入 ------------------------------
npm install @supabase/supabase-js @supabase/ssr    # DB・認証
npm install date-fns date-fns-tz                   # 日時処理（JST変換）
npm install react-day-picker                       # カレンダーUI
npm install zod react-hook-form @hookform/resolvers # フォーム検証
npm install resend                                 # メール送信
npm install framer-motion lucide-react clsx tailwind-merge  # 既存LPからの移植用

# --- 3. Supabase CLI（ローカル開発とマイグレーション管理） ----
npm install -D supabase
npx supabase init
npx supabase login          # ブラウザが開くので認証する

# --- 4. 環境変数ファイルを作成 ------------------------------
cat > .env.local <<'ENV'
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
RESEND_API_KEY=re_xxxxx
ADMIN_EMAIL=your-address@example.com
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAA...
TURNSTILE_SECRET_KEY=0x4AAA...
ENV
# ↑ 値は各サービスの管理画面から取得して書き換える

# --- 5. .env.local が絶対にコミットされないことを確認 --------
grep -n ".env" .gitignore     # ".env*" が含まれていることを確認する

# --- 6. ローカル起動 ----------------------------------------
npm run dev                   # http://localhost:3000 が開けばOK

# --- 7. 空の状態で一度デプロイしておく ----------------------
git init && git add -A && git commit -m "chore: scaffold salon web app"
# GitHubにpush後、Vercelの管理画面から Import Project → 環境変数を登録 → Deploy
```

> **`SUPABASE_SERVICE_ROLE_KEY` は絶対にブラウザ側のコードで使わない**でください。このキーはRLSを無視して全データにアクセスできます。`NEXT_PUBLIC_` が付いていない環境変数はサーバー側でのみ読めるので、Route Handler や Server Action の中だけで使用します。

### 3-3. 事前に決めておくべきこと（コードより先に）

コーディングを始める前に、以下が決まっていないと手戻りします。

- [ ] **営業曜日と時間帯**（例：火・木・土／10:00〜19:00）
- [ ] **メニュー名・施術時間・料金**（初回体験を含む2〜4種類）
- [ ] **1枠あたりの実所要時間**（施術60分＋前後15分＝75分 など）
- [ ] **予約の受付範囲**（何日先まで予約可能か／何時間前まで受付か）
- [ ] **キャンセルポリシー**（前日まで無料／当日50% など）
- [ ] **屋号とドメイン名**
- [ ] **プロフィール文と実績**（2017年からの活動歴、指導人数、得意領域）
- [ ] **掲載する写真**（外観・室内・施術風景・プロフィール）※これが一番時間がかかるので早めに撮る

---

## 4. リスクと対策

| リスク | 対策 |
|---|---|
| 二重予約 | DBの排他制約（`EXCLUDE USING gist`）で物理的に防ぐ。アプリのチェックだけに頼らない |
| Supabase無料プロジェクトの一時停止 | 定期Cronでヘルスチェックを打つ |
| いたずら予約 | Turnstile＋電話番号必須＋前日リマインドで実在確認。悪質な場合はIPと連絡先で拒否リストを作る |
| 個人情報（悩み・連絡先）の漏えい | RLSで匿名アクセスを全拒否、管理画面は許可メール1件のみ、`.env` をコミットしない、プライバシーポリシーを掲載 |
| 開発が開業日に間に合わない | Phase 1（HP）を先に公開し、予約はLINE公式＋Googleフォームで暫定運用。**システムを開業日のクリティカルパスに置かない** |
| Vercel Hobbyの商用利用規約 | 公開前にCloudflareへ移行するか、Pro（月約3,000円）に切り替える |

---

## 5. 次のアクション

1. 上記「3-3. 事前に決めておくべきこと」を埋める
2. アカウント（Supabase / Cloudflare / Resend / ドメイン）を作成する
3. 「Phase 0〜1（HPの移植と先行公開）から実装して」と指示をもらえれば、既存の React コンポーネントを Next.js へ移植して実装に着手します
