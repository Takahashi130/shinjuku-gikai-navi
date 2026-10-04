# 新宿区議会ナビ

新宿区議会の議案を区民が知り、賛成・反対の1票で意思を示し、議会の議決とのズレを見える化する個人開発アプリです（めざすのは直接民主主義の実現）。公開サイト：https://shinjuku-gikai-navi.vercel.app

AGPL-3.0 で公開されている「みらい議会」（[team-mirai/mirai-gikai](https://github.com/team-mirai/mirai-gikai)）をもとにしています。政党チームみらいが運営しているものではありません。ライセンスは [LICENSE](LICENSE)、元のソフトウェアの追加条件は [FORK_GUIDELINES.md](FORK_GUIDELINES.md)。

> 作業を引き継ぐ人・AI は、最初に [docs/HANDOFF.md](docs/HANDOFF.md) を読んでください。

## 最短の実行手順

### 最初の準備（パソコンごとに1回）

- **Mac**：Node.js 22.18 以上（手元は 24 で確認）と pnpm（`corepack enable`）を入れ、GitHub から clone し、[設定ファイル](#設定ファイル)をルートに置いて `pnpm install`。
- **Windows**：[docs/guides/windows.md](docs/guides/windows.md)（`scripts/setup-windows.ps1` がまとめて行う）。
- Docker・ローカル Supabase は使いません。開発用の DB はクラウドの Supabase です。

### 毎回

```sh
pnpm exec dotenv -e .env -- pnpm --filter web dev   # 開発サーバー http://localhost:3000（同じフォルダで2つ起動しない）
pnpm check    # 検査一式（lint・型・単体テスト）。前回から変わった工程だけ実行し、結果は1工程1行
pnpm status   # 今の状態を約10行で（ブランチ・マイグレーション・開発用 DB・check の結果）
```

`pnpm check` の全文ログは `.logs/check/`、`-- --force` で全部やり直し、`-- --list` で工程の一覧。

## 入出力

| 入力 | どこで使う |
|---|---|
| 区の公開資料（会期ページ・審議結果 PDF・議員名簿・質問一覧・政務活動費 PDF） | `packages/shinjuku-importer`（[取り込み](docs/guides/data-import.md)） |
| 議案の解説（`explainers/<会期>/<議案>.json`。AI が作成し、別の AI が資料と照合） | `packages/navi-ops`（[explainers/README.md](explainers/README.md)） |
| 区民の票 | 公開サイトの投票（1ブラウザ1票・参考値）。本番に反映済みかどうかは [HANDOFF](docs/HANDOFF.md) の「現在地」 |
| 設定ファイル（下の表） | すべて |

| 出力 | |
|---|---|
| Supabase（開発用・本番）のデータ | 議案・会派の賛否・投票の回・議員・質問・政務活動費・解説 |
| 公開サイト | Vercel（プロジェクト shinjuku-gikai-navi、ルートディレクトリ `web`）。[反映の手順](docs/guides/release.md) |
| 手元の記録（Git に入れない） | `.cache/`（check・release の記録）、`.logs/`（全文ログ）、`.materials/`（解説の材料） |

### 設定ファイル

どれも Git に入れません（`.gitignore` 済み）。値をドキュメントやチャットに書かないこと。変数名の例は `.env.example`。

| ファイル | 役割 | 使うもの |
|---|---|---|
| `.env` | 開発用 Supabase の接続先と鍵、アプリの環境変数 | 開発サーバー・取り込み・運用コマンド |
| `.env.supabase-dev` | 開発用 Supabase の project ref・DB パスワード・鍵 | マイグレーション・型の作り直し・`pnpm status` |
| `.env.supabase-prod` | 本番 Supabase の project ref・DB パスワード・鍵・`REVALIDATE_SECRET` | 本番への反映（`--env prod`） |
| `.env.local-docker` | 以前の Docker 用の退避 | 使わない |

ほかに、supabase CLI（このリポジトリは開発用プロジェクトにリンク：`supabase/.temp/project-ref`）と vercel CLI（`.vercel/project.json`）へのログインが要ります。

## 主要ファイルの場所

| 場所 | 中身 |
|---|---|
| `web/` | 公開サイト（Next.js 15）。名前・説明・免責文言は `web/src/config/site.ts` |
| `admin/` | 管理画面（ポート 3001） |
| `packages/shinjuku-importer/` | 区の公開資料の取り込み |
| `packages/navi-ops/` | 解説・投票の運用コマンド（`pnpm explainers:*`・`pnpm polls:*`） |
| `packages/shared/` | web・admin・importer で共通のコード（解説のスキーマなど） |
| `packages/supabase/` | Supabase の型（`types/supabase.types.ts`） |
| `supabase/migrations/` | DB の変更 |
| `explainers/` | 議案の解説 |
| `scripts/` | `check`・`release`・`status`・`env:export`・型の作り直し・Windows の準備 |
| `docs/` | `HANDOFF.md`（最初に読む）・`guides/`（作業別）・設計書。元リポジトリの設計書は `docs/archive/upstream/` |

`packages/seed/`（ローカル Docker 用）、`worker/`・`infra/`（元リポジトリのトピック分析用）は、今は使っていません。
