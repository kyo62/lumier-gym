# Supabase の設定：Claude in Chrome への依頼文

作成：2026-10-16　／　状態：未実施（代表がパソコンで実行する）

## 前提
- このセッションの Claude からは、代表のブラウザを直接は操作できません（Claude in Chrome のツールが、つながっていないため）。
- そのため、**代表のパソコンの Chrome で Claude in Chrome を開き、下の依頼文を貼る**形で進めます。
- **ログイン・本人確認・支払い・パスワードの入力は、代表がご自身で行います。** Claude in Chrome には、させません。

## 依頼文（これを Claude in Chrome に貼る）

```
Supabase（https://supabase.com）で、サロンの会員ページ用のプロジェクトを作る手伝いをしてください。
次の決まりを守ってください。
- アカウントの作成・ログイン・パスワードや認証コードの入力、支払い・カード情報の入力は、私（代表）が自分で行います。その画面が出たら、手を止めて「ここは私が入力してください」と伝えてください。
- 有料プランへの変更、「Upgrade」「Add payment」などは、押さないでください。
- データベースのパスワード、service_role（secret）キーは、画面に出ても、コピー・表示・書き出しをしないでください。
- 各手順の最後に、やったことと、見えている画面の状況を、短く報告してください。迷ったら、止まって私に聞いてください。

手順
1. https://supabase.com を開く。「Start your project」から、私がログイン（GitHubまたはメール）します。→ 私がログインできたら続けてください。
2. 新しいプロジェクトを作る。
   - Organization：個人用（Free）のままで。
   - Project name：toneka-member
   - Region：Northeast Asia (Tokyo)
   - Database password：「Generate a password」で作るか、私が入力します。**このパスワードは私がパスワード管理アプリに保存します。あなたは読み取らないでください。**
   - 料金：Free のままであることを確認してください。
   - 作成が終わる（数分）まで待つ。
3. 左メニューの「SQL Editor」を開き、次の2つのSQLを、**この順に1つずつ**実行する。
   各SQLの中身は、GitHub のこのページを開いて、本文を全部コピーして貼ってください（公開リポジトリです）。
   ① https://github.com/kyo62/lumier-gym/blob/claude/posture-salon-launch-rxlgl5/web/supabase/migrations/001_member_area.sql
   ② https://github.com/kyo62/lumier-gym/blob/claude/posture-salon-launch-rxlgl5/web/supabase/migrations/002_karte.sql
   - 「Run」を押す。「Success」が出たか、エラーが出たかを報告してください。エラーが出たら、そこで止まって、エラーの文面をそのまま私に見せてください。
   - 実行の前に、「このクエリは破壊的な操作を含みます」のような確認が出たら、内容を私に見せてください（新しいテーブルを作るだけのSQLなので、通常は出ません）。
4. 左メニューの「Table Editor」で、次のテーブルがあることを確認する：
   profiles, body_logs, meal_logs, workout_logs, videos, video_assignments, clients, sessions, activity_logs, activity_comments
   また、各テーブルの横に「RLS enabled」と出ていることを確認してください（出ていなければ報告）。
5. 「Authentication」→「Sign In / Providers」（または「Providers」）を開き、次を確認・設定する。
   - Email が有効（Enabled）。
   - 「Allow new users to sign up」（新規登録を許可）を **オフ** にする。（会員は施術者が作るため。）
   - 「Confirm email」は、そのままでよい。
   変更したら、変更した項目を報告してください。
6. 「Authentication」→「Email Templates」→「Magic Link」を開き、本文に `{{ .Token }}` が入っているかを確認する。
   - 入っていなければ、件名を「TONEKA ログイン用コード」、本文を次のように直して保存する：
     `ログイン用コードは {{ .Token }} です。このコードは10分間有効です。心当たりがない場合は、このメールを破棄してください。`
7. 「Settings」→「API」（または「Project Settings → API Keys」）を開き、次の2つだけを私に見せてください（この2つは公開してよい情報です）：
   - Project URL（https://xxxx.supabase.co の形）
   - anon / publishable キー（「anon public」または「publishable」と書かれているもの）
   **service_role / secret キーは、絶対に見せない・コピーしないでください。**
8. 最後に、ここまでやったことの一覧と、まだ残っている作業を報告してください。
```

## 実行したあとに、Claude（このリポジトリのセッション）へ伝えること
- Project URL（`https://xxxx.supabase.co`）と、anon（publishable）キー。
- SQL の実行結果（成功したか、エラーが出たか）。
- ※ パスワードや service_role キーは、**伝えない**。

## 実行したあとに、代表がやること（Claude in Chrome にはさせない）
1. **自分の管理者アカウントを作る：** Authentication → Users → Add user → Create new user。自分のメールアドレスで、「Auto Confirm User」にチェック。
2. **自分を施術者（管理者）にする：** SQL Editor で、次を実行（メールアドレスは自分のもの）。
   ```sql
   update public.profiles set is_admin = true
    where id = (select id from auth.users where email = 'あなたのメールアドレス');
   ```
3. **ログインのメールを、お客様に送れるようにする：** Supabase の標準のメール送信は、**自分のチームのメールにしか送れず、1時間あたりの送信数もとても少ない**（私の理解。画面で要確認）。お客様に送るには、**独自のメール送信（SMTP。Resend など）**の設定が必要で、`toneka.jp` のDNS設定が要る。別の手順として、次に進める。
4. 無料プランは、一定期間アクセスがないとプロジェクトが一時停止することがある（私の理解。要確認）。モニター開始前に、画面で条件を確認する。

## 注意
- 本番に切り替える設定（`NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY`）は、公開先（Cloudflare Pages）の設定画面に入れる。ここに書いたキーは「公開してよい」ものだが、リポジトリには書かず、環境変数で渡す。
- この手順で、**お客様の個人情報はまだ1件も入らない。** カルテに入れる前に、プライバシーポリシー・同意画面の専門家確認と、バックアップの運用を決める。
