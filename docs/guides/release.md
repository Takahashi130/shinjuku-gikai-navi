# 反映（開発用 DB・本番）

マイグレーション・データ・解説・公開サイトを、工程に分けて反映する。ふつうは `pnpm release` を使い、手で行うのは止まったときの調べ直しだけにする。

## pnpm release

```sh
pnpm release -- --env dev                       # 計画を表示するだけ（既定。書き込まない）
pnpm release -- --env dev --yes                 # 開発用に反映する
pnpm release -- --env prod                      # 本番の計画を表示するだけ
pnpm release -- --env prod --yes --confirm-prod # 本番に反映する（ユーザーの「本番OK」の後だけ）
pnpm release -- --env dev --yes --from data:questions   # その工程から最後まで
pnpm release -- --env dev --yes --only db,explainers    # その工程だけ（"data" で data:* すべて）
pnpm release -- --list                          # 工程の一覧
```

- 工程：preflight → env → db → data:ingest → data:members → data:questions → data:expenses → data:faction-votes → explainers → deploy（本番だけ）→ smoke。
- `--only`・`--from` でも、書き込む工程を選べば preflight を必ず先に通す。本番では env も（Vercel の変数が足りないまま DB だけ進めないため）。本番は書き込まない工程だけでも preflight を通す。
- 本番で `--yes` だけ（`--confirm-prod` なし）のときは何もせず、終了コード 2 で終わる。
- 途中で止まっても、同じコマンドで続きから。成功した工程は、入力が変わっていなければ飛ばす（db＝`supabase/migrations`、data＝importer のコードと日付、explainers＝`explainers/` と navi-ops、deploy＝コミット。preflight・env・smoke は毎回）。
- 画面には工程ごとに1行。全文ログは `.logs/release-<env>/`、記録は `.cache/release-<env>.json`。
- しないこと：git push、Vercel の環境変数の設定、リポジトリの supabase のリンク先（開発用）の書き換え。本番の db は一時フォルダでリンクして当てる。
- 工程の定義と判断の基準の正本は `scripts/lib/release-plan.mjs`、実行は `scripts/release.mjs`。

**確認の状況**：計画の表示と、手元だけで済む工程（preflight、開発用の env と smoke）は動作を確認した。書き込む工程（db・data・explainers・deploy）は `pnpm release` からはまだ実行していない。初回は `--only` で1工程ずつ進め、ログを見てから次へ進む。

## 止まる条件と、人に確かめる条件

| 条件 | 動き | すること |
|---|---|---|
| 本番に反映する | `--yes --confirm-prod` が無ければ何もしない | ユーザーがチャットで「本番OK」と言ってから付ける |
| 本番で：develop でない・未コミットあり・origin/develop とずれ・`pnpm check` が今の状態で未成功 | preflight で止まる（`--only`・`--from` でも必ず通る） | コミット・push はユーザーの確認を取ってから。`pnpm check` を通す |
| 開発用で書き込む工程を選んだとき：develop でない | preflight で止まる（`--only`・`--from` でも必ず通る。別ブランチから共有の開発用 DB に当てると履歴が食い違う） | develop に切り替える |
| 必須の環境変数が無い・`PARTICIPATION_HASH_SECRET` が32文字未満（`.env` のときだけ長さを見る） | env で止まる | 本番の Vercel の値はユーザーに設定してもらう（`npx vercel@latest env add <名前> production`）。値をチャットや記録に書かない |
| `NEXT_PUBLIC_GA_TRACKING_ID` | 有無を表示するだけ | 本番で使うかは未決。ユーザーに聞く |
| 消す・名前を変える・型を変えるマイグレーション | 止まらない | 本番では db から deploy までのあいだ、古いコードが新しい DB を読む。追加だけでないときは、先にユーザーと相談する |
| data 工程（区のサイトに長くアクセスする） | 止まらない | 必要な工程だけにする（`--only data:members` など）。本番の初回は下の「本番の前に確かめること」 |

## 本番の前に確かめること

- [ ] ユーザーの「本番OK」
- [ ] マイグレーションが追加だけか。今回の6本（20261004100000〜20261006100000）は追加だけ：新しいテーブル・列の追加と、新しい polls の外部キーの張り直し・非表示の update（既存のテーブルの列の削除・名前の変更・型の変更は無い。2026-10-04 に `grep -niE "drop|rename|delete from|truncate|alter column" supabase/migrations/2026100[456]*.sql` で確認し、当たったのは polls の制約の張り直しだけ）
- [ ] 本番の初回は data:* の5つすべてが要る（議員・質問・政務活動費・会派の賛否のテーブルは空。投票の回と採決予定日は data:ingest が入れる）。あわせて explainers も
- [ ] 1工程ずつ進めるときは、最初に `--only env` を実行して Vercel の変数を確かめてから db に進む（書き込む工程を選べば env は自動で先に通るが、先に単独で見ておくと止まる場所が分かりやすい）
- [ ] Vercel（production）に `PARTICIPATION_HASH_SECRET`（32文字以上の乱数。開発用と同じ値は使わない）。無いと投票の受付が止まった状態で公開される（[participation-ops.md](participation-ops.md) の 2.4）
- [ ] `NEXT_PUBLIC_GA_TRACKING_ID` を使うか決める。設定するとプライバシーポリシーに Google アナリティクスの項目が自動で載る
- [ ] develop が origin/develop と一致している（解説の「元ファイル（GitHub）」のリンクは develop を指す）
- [ ] 本番の Supabase で、匿名サインインの上限（Authentication → Rate Limits）を確かめる（[participation-ops.md](participation-ops.md) の 2.5）
- [ ] 反映のあと、公開サイトの `/`・`/bills`・`/members`・`/privacy` が開く（smoke が確かめる）

## 手で行うとき（調べ直し用）

### 開発用 DB へのマイグレーションと型

```sh
set -a; . ./.env.supabase-dev; set +a                                   # 値は表示しない
[ "$(cat supabase/.temp/project-ref)" = "$SUPABASE_PROJECT_REF" ] && echo "開発用にリンク済み"
npx supabase db push --linked -p "$SUPABASE_DB_PASSWORD"
pnpm db:types:gen:remote      # 型を作り直す（Mac・Windows 共通）。マイグレーションと型はセットでコミット
```

使わないコマンドは [AGENTS.md](../../AGENTS.md) の「Supabase」。

### 本番

- マイグレーション：`pnpm release -- --env prod --yes --confirm-prod --only db` を使う。手で行うと本番にリンクし直すことになり、リポジトリのリンク先が開発用でなくなる（戻し忘れると、開発用のつもりの操作が本番に当たる）。
- デプロイ（リポジトリのルートで）：
  ```sh
  npx vercel@latest deploy --prod --yes   # 初回に "Not authorized" で失敗したら、もう一度
  rm -f .env.local                        # vercel が作る本番の値の写しを消す
  git diff .gitignore                     # ".env*" の行が足されていたら消す（.env.example まで除外されるため）
  ```
