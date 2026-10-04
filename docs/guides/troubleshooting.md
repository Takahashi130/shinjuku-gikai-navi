# うまくいかないとき

症状で探す。ここに無いときは、`.logs/` の該当するログの末尾だけを読む（全文を読み込まない）。

## 開発・検査

| 症状 | 原因 | 対処 |
|---|---|---|
| ターミナルに貼ったコマンドの `cd` が失敗する・パスが文字化けする | フォルダ名が日本語（直民アプリ） | 英数字だけのコマンドで移動する：`cd "$(ls -d ~/Desktop/Downloads/*/.git/ \| head -1)/.."`（Downloads 直下で `.git` がフォルダなのはこのリポジトリだけ。以前の `*/packages/shinjuku-importer` を使う形は、ワークツリーが残っていると別のフォルダに移動する） |
| 外付け SSD の上で `pnpm install` などが失敗する | SSD が exFAT（シンボリックリンクを作れない） | リポジトリは SSD に置かない。SSD は設定ファイルの受け渡しだけ（[windows.md](windows.md)） |
| 開発サーバーが起動しない・動きがおかしい | 同じフォルダで `next dev` を2つ起動している | 1つだけにする（ポート 3000） |
| integration テスト（`*.integration.test.ts`、`tests/supabase`）を手元で動かしたくなった | `.env` が開発用のクラウド DB を指している | 手元では実行しない。理由は [AGENTS.md](../../AGENTS.md) の「Supabase」（CI で回る。`pnpm check` には入っていない） |
| `pnpm lint` に warning が多い | 前からある warning（145件） | error が 0 ならよい |
| 編集のたびに lint の長い出力が出る | 古い設定のままのセッション | 今のフックは編集したファイルだけを整形し、問題が無ければ何も出さない（`.claude/scripts/format-edited.mjs`）。セッションを開き直すと効く |
| スキルの一覧に同じスキルが何度も出る | 兄弟フォルダ（マージ済みのワークツリーなど）にも `.claude/skills` がある | ワークツリーを片付けると減る（先に `.materials` を移す。ユーザーの確認を取る） |
| ブラウザのプレビューの設定（`launch.json`）がリポジトリに無い | 設定はリポジトリの外（`../.claude/launch.json`）に置いている | リポジトリの中に作り直さない |
| サブエージェントが利用上限（session limit）で止まる | 利用上限 | ワークフローは `resumeFromRunId` で再開。`pnpm check`・`pnpm release` はそのまま再実行すれば済んだ工程を飛ばす |

## DB・データ

| 症状 | 原因 | 対処 |
|---|---|---|
| 開発用の画面が急にエラー・`pnpm status` の開発用 DB の行が失敗 | Supabase の無料プランは1週間アクセスが無いと一時停止する | Supabase のダッシュボードで再開する（ユーザーに頼む） |
| `supabase db push` が履歴の食い違いで失敗する | 当てたマイグレーションを後から書き換えた、または別ブランチから同じ DB に当てた | `npx supabase migration list --linked` で差を見る。当てたファイルは元に戻し、変更は新しいマイグレーションで行う。別の方法（SQL エディタ）で当てた版を履歴に記録するのは `npx supabase migration repair --linked --status applied <版>`（ユーザーと相談してから） |
| 投票の帯に「現在、投票の受付を停止しています」 | `PARTICIPATION_HASH_SECRET` が無い・32文字未満 | 環境変数を確かめる（[participation-ops.md](participation-ops.md) の 2.4） |
| 投票ボタンで匿名サインインのエラー | 匿名サインインが無効 | Supabase の Authentication で匿名サインインを確かめる（2026-10 時点で開発用・本番とも有効） |
| `explainers:check` や release の explainers が「.materials がありません」 | `.materials` は Git に入らない | マージ済みのワークツリーにあればコピーする（今の場所は `pnpm status` と [HANDOFF](../HANDOFF.md)）。無ければ `materials <会期URL>` で取り直す（区のサイトにアクセスする） |
| 会派の賛否が出ない会期・取り込めていない議案がある | 既知の欠け | [data-import.md](data-import.md) の「既知の欠け」 |

## 公開（Vercel）

| 症状 | 原因 | 対処 |
|---|---|---|
| `vercel deploy` が "Not authorized" で失敗する | 一時的なもの（初回に起きたことがある） | もう一度実行する（`pnpm release` は1回だけ自動でやり直す） |
| デプロイのあと `.env.local` ができている・`.gitignore` に `.env*` が増えた | vercel CLI がリンク時に作る | [release.md](release.md) の「手で行うとき → 本番」の片付け（`pnpm release` は自動で片付ける） |

## Windows

| 症状 | 対処 |
|---|---|
| `winget がありません` と出る | Microsoft Store で「アプリ インストーラー」を更新して、もう一度実行する |
| `pnpm` や `node` が見つからないと出る | PowerShell を閉じて開き直し、もう一度実行する（インストール直後は PATH が反映されていないことがある） |
| スクリプトが文字化けする | スクリプトは UTF-8（BOM付き）で保存してある。手で編集した場合は、同じ形式で保存し直す |
| 改行のせいで差分が大量に出る | `git config --global core.autocrlf false` を実行してから、プロジェクトをコピーし直す |
