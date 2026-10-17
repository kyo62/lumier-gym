# Cloudflare Pages へ公開する：Claude in Chrome への依頼文

作成：2026-10-17　／　状態：未実施

## 確認した事実（リポジトリから）
| 項目 | 内容 |
|---|---|
| リポジトリ | `kyo62/lumier-gym`（公開） |
| 公開するブランチ | **`claude/posture-salon-launch-rxlgl5`**（最新の作業がある。`main` より56コミット進んでいる）。`main` には、001のSQLまでしかなく、カルテ・自主トレ・002のSQLが入っていない |
| フレームワーク | Next.js 16（静的書き出し `output: 'export'`）。サーバーは不要 |
| ルートディレクトリ | `web` |
| ビルドコマンド | `npm ci && npm run build`（`npm run build` だけでも可） |
| 出力ディレクトリ | `out`（ルートの `web` からの相対。Pagesの設定では `out`） |
| Node のバージョン | 22（`web/.node-version` にある）。環境変数 `NODE_VERSION` = `22` も入れる |
| 環境変数 | `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`NEXT_PUBLIC_NOINDEX`、（任意）`NEXT_PUBLIC_SITE_URL` |
| service_role / DBパスワード | **使っていない。** コードのどこにも出てこない。HPには入れない |

- `NEXT_PUBLIC_` の変数は、**ビルドのときにサイトの中へ埋め込まれる**。値を変えたら、再ビルド（再デプロイ）が必要。
- `NEXT_PUBLIC_NOINDEX` = `1` のあいだは、検索結果に出ない設定になる。公開の準備ができるまで、`1` のままにする。
- `NEXT_PUBLIC_SITE_URL` は、サイトのURLの基準（`https://toneka.jp`）。コードの中の `site.url` は、まだ仮の `https://example.com` のため、これを環境変数で上書きする（コードの直しは別途）。
- ルートの `vercel.json` は、Vercel用の古い設定。Cloudflare Pages には関係しない（あとで削除）。

## 先に、代表が決めること
1. **どのブランチを公開するか。** 私のおすすめは、いまは `claude/posture-salon-launch-rxlgl5` のままで進めること。`main` に取り込む（Pull Request）のは、代表が「取り込んでよい」と言ってから、私が行う。
2. **独自ドメイン `toneka.jp` をつなぐ方法。**
   - A（私の理解で、いちばん素直）：ドメインのネームサーバーを、お名前.com から Cloudflare に変える。`toneka.jp`（ルートのドメイン）を Pages につなぐには、Cloudflare にDNSを預ける必要がある、というのが私の理解（画面で要確認）。メールの転送（`info@toneka.jp`）も、あとで同じ Cloudflare でできる。
   - B：ネームサーバーはお名前.comのままにして、`www.toneka.jp` だけを Pages につなぐ（CNAME）。`toneka.jp` だけで開く人は、`www` へ転送する設定が別に要る。
   - **ネームサーバーの変更は、ドメイン全体に効く操作なので、代表が決めてから。** いまは、ほかに使っているものはない（メールなし・HP公開前）ので、影響は小さい。

## 依頼文 ①（Cloudflare Pages にプロジェクトを作って、まず `*.pages.dev` で公開する）
```
Cloudflare Pages に、サロンのHPを公開する手伝いをしてください。次の決まりを守ってください。
- アカウントの作成・ログイン・パスワードや認証コードの入力、GitHub の認可（Authorize）、支払い・カード情報の入力は、私（代表）が自分で行います。その画面が出たら、手を止めて「ここは私が入力・操作してください」と伝えてください。
- 有料プランへの変更、「Upgrade」「Add payment」などは、押さないでください。
- 私が渡した値以外の秘密情報（service_role キー、データベースのパスワード、API トークン）は、扱わないでください。画面に出ても、コピー・表示しないでください。
- 各手順の最後に、やったことと画面の状況を短く報告してください。迷ったら、止まって私に聞いてください。

手順
1. https://dash.cloudflare.com を開く。ログインは私が行います。アカウントがなければ、無料プランで私が作ります。
2. 左メニューの「Workers & Pages」→「Create application」→「Pages」→「Connect to Git」を選ぶ。
3. GitHub との連携は、私が認可します。リポジトリは、`kyo62/lumier-gym` だけに限定してください（All repositories にはしない）。
4. リポジトリ `kyo62/lumier-gym` を選び、「Begin setup」。
5. 設定は次のとおりにする。
   - Project name：toneka
   - Production branch：claude/posture-salon-launch-rxlgl5
   - Framework preset：None（または Next.js (Static HTML Export) があればそちらを選んでもよい。ただし、ビルドコマンドと出力先は下の値を手で入れる）
   - Build command：npm ci && npm run build
   - Build output directory：out
   - Root directory（Advanced）：web
6. 「Environment variables」に、次の4つを追加する（Production と Preview の両方）。
   - NODE_VERSION = 22
   - NEXT_PUBLIC_SUPABASE_URL = https://lwaqjsyfpjmqifjaraky.supabase.co
   - NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_2ir58Fkj_00I8DjURKnz0Q_j0OdbLyJ
   - NEXT_PUBLIC_NOINDEX = 1
   （NEXT_PUBLIC_SITE_URL は、独自ドメインをつないでから、私が指示します。）
7. 「Save and Deploy」を押し、ビルドが終わるまで待つ。失敗したら、ログの最後の20行ほどを、そのまま私に見せてください。直そうとして設定を変えないでください。
8. 成功したら、`https://toneka-xxxx.pages.dev`（実際のURL）を報告し、次を確認する。
   - トップページが開く（TONEKAのHP）。
   - `/member` が開き、ログイン画面（メールアドレスの入力欄）が出る。「デモモード：入力内容は、この端末の中にだけ保存されます」の帯が出ていなければ、Supabase につながっている。
   - 確認はここまで。ログインの操作は、まだしないでください。
9. 最後に、やったことの一覧と、まだ残っている作業を報告してください。
```

## 依頼文 ②（独自ドメイン `toneka.jp` をつなぐ）— **①が成功して、代表が方法A・Bを決めてから**
```
Cloudflare Pages のプロジェクト「toneka」に、独自ドメイン toneka.jp をつなぐ手伝いをしてください。決まりは①と同じです（ログイン・認可・支払い・パスワードは私が行う。有料プランにしない。各手順の最後に報告する。迷ったら止まる）。

【方法Aの場合：Cloudflare にDNSを預ける】
1. プロジェクト「toneka」→「Custom domains」→「Set up a custom domain」→ toneka.jp を入力して進む。
2. 「ドメインを Cloudflare に追加する（Add a site）」を求められたら、Free プランを選んで追加する。
3. Cloudflare が指定する2つのネームサーバー（例：xxx.ns.cloudflare.com）を、画面からそのまま私に見せてください。
4. ここで止まってください。お名前.com のネームサーバー変更は、私が自分で行います。変更したら「変更した」と伝えます。
5. 私が伝えたら、Cloudflare の画面で「Check nameservers」（ネームサーバーの確認）を押し、有効になるまで状況を報告してください（数分〜数時間かかることがあります）。
6. 有効になったら、Custom domains で toneka.jp が「Active」になるまで待ち、状況を報告してください。
7. www.toneka.jp も、同じ手順で追加してください。（toneka.jp への転送でもよい。画面で選べる方を選んで、報告してください。）
8. https://toneka.jp を開いて、HPが表示されること（鍵マークがあること）を確認し、報告してください。

【方法Bの場合：www だけをつなぐ】
1. Custom domains で www.toneka.jp を追加し、Cloudflare が指示する CNAME の「名前」と「値」を、そのまま私に見せてください。
2. ここで止まってください。お名前.com のDNS設定の追加は、私が自分で行います。
3. 追加したと伝えたら、Cloudflare の画面で状況を確認し、「Active」になるまで報告してください。
```

## 公開が終わったあと（Claude へ伝えること・次の作業）
- 公開URL（`*.pages.dev` と、つないだ場合は `toneka.jp`）。
- 私が行う作業：`site.url` を `https://toneka.jp` にし、`NEXT_PUBLIC_SITE_URL` を設定、`vercel.json` の削除。
- Supabase 側：Authentication →「URL Configuration」の **Site URL** を、公開URLにする。
- 管理者アカウントの作成と `is_admin` の設定（`Supabase設定_Chrome依頼文.md` の「実行したあとに、代表がやること」）。
- お客様へのログインのメール送信（独自SMTP）の設定。これがないと、モニターの方にコードが届かない。
- `NEXT_PUBLIC_NOINDEX` を外すのは、公開の最終確認（規約・プライバシーの専門家確認、保健所への確認）のあと。
