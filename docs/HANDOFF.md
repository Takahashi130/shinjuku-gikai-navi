# 引き継ぎメモ（最初に読む）

更新：2026-10-04。目的と起動の手順は [README](../README.md)、守る規約は [AGENTS.md](../AGENTS.md)。ほかは下の「作業別の参照先」から必要なものだけ開く。最初に `pnpm status` で今の状態を確かめる。

## 現在地

- **develop**（origin/develop と一致）：新しいデザイン（配色C）、議案の解説（令和8年第3回定例会、`explainers/r8-teirei-3/`）、誰でも投票（1ブラウザ1票・参考値。締切は採決の 10/15 14:00）、議員カルテ（`/members`）、Windows の手順。develop のコミットで web 1678件・packages 572件・型・lint（error 0）が通過。
- **検査（2026-10-04、b92f1126 の内容で確認）**：`pnpm check` の全工程が通過（上に加えて admin 581件・scripts 49件）。
- **開発用 Supabase**：マイグレーションは最新（〜20261006100000）。議案940件・解説・投票の回・議員38人・質問654件・政務活動費・会派の賛否7,922件が入っている。
- **本番は古いまま（ユーザーの「本番OK」待ち）**：本番 DB に 20261004 以降のマイグレーションが当たっていない。議員・解説・投票の回が入っていない。Vercel に `PARTICIPATION_HASH_SECRET` が無い。公開サイトのコードは f0aaf759 相当。
- **引き継ぎの整理**（`pnpm check`・`release`・`status`・`env:export`、編集フック、`docs/guides/`、archive への移動、README・AGENTS.md の書き直し）は b92f1126 で origin/develop に push 済み（2026-10-04）。
- **ブランチ**：feat/participation・feat/members とそのワークツリー（`../chokumin-participation`・`../chokumin-members`）は develop にマージ済みで、まだ残っている。backup/before-email-rewrite は手元だけのブランチで、push しない。

## 次にやること（順番）

1. `pnpm status` → `pnpm check`（変わった工程だけ実行される）
2. `git status` に未コミットの変更があれば、ユーザーに見せて OK ならコミットする。push も確認を取ってから。
3. `.materials`（解説の材料。git 管理外）は 2026-10-04 にこのリポジトリへコピー済みで、`pnpm explainers:check` は 22件・error 0。ワークツリーを片付けるかはユーザーに聞く（`git worktree remove ../chokumin-participation` など）。
4. 「本番OK」が出たら：`pnpm release -- --env prod` で計画を見せる → [release.md](guides/release.md) の「本番の前に確かめること」を確認 → `pnpm release -- --env prod --yes --confirm-prod --only env` → 続けて `--only db`、`--only data`、`--only explainers`、`--only deploy`、`--only smoke` と1工程ずつ進める（書き込む工程を選ぶと preflight と env は自動で先に通る）。
   - 時期：今の会期の投票を本番で使うなら、締切（10/15 14:00）より前に反映が要る。本番OKを聞くときに、ユーザーに確かめる。
5. ユーザーの仕様の続き（設計は [20261003_1900](20261003_1900_区民参加機能の実装計画.md) の3章。読むのは必要な段階の節だけ）：段階4 解説へのコメント → 段階6 毎年の評価（5年）と答え合わせ → 段階7 LIVE（区の中継の利用条件を先に確かめる） → 段階8 区民認証など。

## 検証済みのコマンド

- 2026-10-04 に確認：`pnpm status`、`pnpm check`、`pnpm test:scripts`、`pnpm release -- --env dev|prod`（計画の表示と、手元だけで済む工程。`--only db` で preflight が先に入ること、本番の `--yes` だけで終了コード 2 になること）、`pnpm release -- --env dev --yes --only env,smoke`、`pnpm env:export`（一時フォルダで）。
- 2026-10-04 より前に成功（日付の記録なし）：開発サーバー（README）、取り込み（`ingest --all`・`members`・`questions`・`expenses`・`faction-votes`・`materials`）、`explainers:check`・`explainers:sync`・`explainers:status`、`polls:set-close`・`polls:hide`、開発用 DB への `supabase db push` と `pnpm db:types:gen:remote`、手で行う本番デプロイ（`vercel deploy --prod` と後片付け）。
- まだ実行していない：`pnpm release` の書き込む工程（db・data・explainers・deploy）、本番 DB へのマイグレーション、`explainers:sync --env prod`。

## 未完了（急がない）

- CI（`.github/workflows/code_check.yml`）に `pnpm test:scripts` が入っていない。
- biome の `files.includes`（`biome.json`）が `web/src`・`admin/src`・`tests` だけで、`scripts/`・`packages/` には lint も編集フックの整形も効かない。
- コミット前のフック（`package.json` の `lint-staged`）が、変えたファイルだけでなくリポジトリ全体に `pnpm run lint:fix` をかける。
- `pnpm release` の本番の env 工程（`vercel env ls`）と、本番の db 工程の「一時フォルダでの `supabase link`」は、まだ試していない（`scripts/release.mjs` の `envCheck`・`dbProd`）。
- 古いまま残っている文書：`docs/20260219_1000_テストガイドライン.md`・`docs/20260301_0700_開発用UIプレビュー環境.md`（冒頭に注記だけ入れた）、`FORK_GUIDELINES.md` の表（サービス名の場所が今は `web/src/config/site.ts`）。

## Mac と Windows

- Windows は `C:\dev\shinjuku-gikai-navi`（2026-10-04 に b92f1126 から準備。`pnpm check` 全部 OK、web・admin の表示も確認。Supabase・Vercel にはログインしていないので、反映・取り込みは Mac で行う）。手順は [guides/windows.md](guides/windows.md)。
- 始める前に `git pull`。push したら、どのコミットまで送ったかをもう一方に伝える。
- 2026-10-04 時点で Windows に未 push の変更がある：`admin/src/lib/routes.test.ts`（パスの区切り文字 `\` を `/` にそろえる）。Windows から push するので、Mac では同じ修正をしない。
- `.env` 系の値を変えたら `pnpm env:export -- --to /Volumes/<SSDの名前>/直民アプリ` で SSD にもコピーする（Windows はそこから受け取る）。

## 作業別の参照先

| 作業 | 読むもの |
|---|---|
| 区の資料の取り込み | [guides/data-import.md](guides/data-import.md) |
| 解説を書く・検査・同期 | [explainers/README.md](../explainers/README.md) |
| 投票の運用（締切・非表示・緊急停止）と画面の作り | [guides/participation-ops.md](guides/participation-ops.md) |
| 開発用・本番への反映 | [guides/release.md](guides/release.md) |
| Windows で開発する | [guides/windows.md](guides/windows.md) |
| うまくいかない | [guides/troubleshooting.md](guides/troubleshooting.md) |
| テスト・スタイル・`/dev` のプレビュー | AGENTS.md からのリンク |

## 未決（推測で決めない。ユーザーに聞く）

- 問い合わせ窓口（今は「準備中」。`SECURITY.md` も本家の窓口のまま）
- 宣伝動画（キャッチーな1本。用途・長さは未回答）
- 配色：青緑がチームみらいの色に近い件（ユーザーは C 案の継続を選んでいる）
- AI インタビュー（使わない状態で残す）、議員ページのランキング（しない方針）
- 本番で `NEXT_PUBLIC_GA_TRACKING_ID` を使うか、admin を本番で使うか
- 20261004120000 のマイグレーションは、開発用 DB に当てた後に一度書き換えられ、当てた版に戻した（変更は 20261006100000 に移した）。今の3つのブランチのファイルは同じ。DB に当たった中身と1文字ずつ同じかは確かめていない。
