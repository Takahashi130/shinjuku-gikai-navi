# Repository Guidelines

> `CLAUDE.md`・`GEMINI.md` は `AGENTS.md` へのシンボリックリンク。編集は `AGENTS.md` に直接行う。

## 最初に（トークンを無駄にしない）
- 最初に [docs/HANDOFF.md](docs/HANDOFF.md)（現在地・次にやること・作業別の参照先）を読み、`pnpm status` で状態を確かめる。
- リポジトリ全体・`docs/` 全体・長いログは読み込まない。作業に合う `docs/guides/` の1ファイルだけを開く。ログは `.logs/` の該当ファイルの末尾だけを見る。
- 検査は `pnpm check`、反映は `pnpm release`。どちらも済んだ工程は飛ばすので、同じ確認をくり返さない。
- **ユーザーとのやりとりは、必ずやさしい日本語で行う**（英語で返さない）。ユーザーは自分の仕様の機能が進むことを重視している。

## このリポジトリについて
- 「新宿区議会ナビ」は、AGPL-3.0 の「みらい議会」（team-mirai/mirai-gikai）をもとにした個人開発アプリ。目的・入出力・主要ファイルは [README.md](README.md)。
- サービス名・説明文・テーマカラー・免責文言は `web/src/config/site.ts` で一元管理する。名前を変える場合はまずここを変更すること。
- 元のソフトウェアの追加条件（免責文言「これは政党チームみらいが運営しているものではありません」、チームみらいのロゴ・配色を使わない）を守る。詳細は [FORK_GUIDELINES.md](FORK_GUIDELINES.md)。
- 区のサイトへのアクセスは1秒以上の間隔をあける（取り込みは [docs/guides/data-import.md](docs/guides/data-import.md)）。
- 使わないもの：`.claude/archive/`・`docs/archive/upstream/`（元リポジトリ由来。読まない）、`pnpm dev`（全部を並列起動）、`pnpm test:integration`・`db:reset`・`db:migrate`・`db:types:gen`・`seed`（理由は下の「Supabase」）。Linear・PR・main ブランチは運用していない。

## 開発の進め方（個人開発）
- `develop` ブランチで直接作業してよい。worktree や PR は必須ではない。
- コミット・push はユーザーの確認を取ってから行う。本番（本番 Supabase・Vercel の本番）への反映は、ユーザーの「本番OK」の後だけ（[docs/guides/release.md](docs/guides/release.md)）。
- コミット前に `pnpm check` を通すこと。

## Project Structure & Module Organization
- フォルダごとの中身は [README.md](README.md) の「主要ファイルの場所」。web の共通 UI は `web/src/components`。
- **web と admin でのコード共有**: 同一ロジックを `web/` と `admin/` の両方で使う場合は、`packages/` 配下の workspace パッケージに切り出すこと。同じコードを両アプリに重複配置するのは禁止。既存の `@mirai-gikai/shared` パッケージに追加するか、用途に応じて新しいパッケージを作成する。

## Next.js アーキテクチャ指針
- Bulletproof React の feature ベース構成を採用する。
- `app/` 配下の `page.tsx` は、URL パラメータ（`params` や `searchParams`）の取得と Feature コンポーネントへの受け渡しのみを担当する薄いラッパーとし、ビューやロジックは `features/` 配下に実装する。
- export 用の `index.ts` は作成せず、必要なファイルから直接 import する。
- Server Components を標準とし、状態管理・イベント処理が必要な場合のみ `"use client"` を付与した Client Component を追加する。
- ファイル名はケバブケース、コンポーネントはパスカルケース、関数はキャメルケースで統一する。

### Feature ディレクトリ構造
複雑な feature では server/client/shared の3層構造を採用する：

```
src/features/{feature}/
├── server/
│   ├── repositories/  # データアクセス層（Supabase呼び出しを集約）
│   ├── components/    # Server Components
│   ├── loaders/       # Server Components用データ取得関数
│   ├── actions/       # Server Actions ("use server")
│   ├── services/      # ビジネスロジック層
│   └── utils/         # Server専用ユーティリティ
├── client/
│   ├── components/    # Client Components（Server/Client両方で使えるものも含む）
│   ├── hooks/         # カスタムフック
│   └── utils/         # Client専用ユーティリティ
└── shared/
    ├── types/         # 共通型定義
    └── utils/         # 共通ユーティリティ
```

`web/` と `admin/` の両方で同じ構成を採用する。ただし `admin/` では Server Components が中心のため `client/` を省略している feature もある。

- Server側ファイルには `"server-only"` を、Client Componentsには `"use client"` を付与
- 型定義やServer/Client両方で使う関数は `shared/` に配置
- **純粋関数の切り出し**: 新規実装時、外部依存（DB・API・認証等）を持たない計算・変換・判定ロジックは純粋関数として `utils/` に切り出すこと。配置先は用途に応じて `shared/utils/`、`server/utils/`、`client/utils/` を選択する。
- シンプルな feature は従来の `components|actions|api|types` 構成でも可

Repository レイヤーの詳細は [docs/repository-layer.md](docs/repository-layer.md) を参照。

## Coding Style & Naming Conventions
- Biome が 2 スペースインデント、LF、ダブルクォート、セミコロン、80 文字幅を強制する（`web/src`・`admin/src`・`tests` の中のファイルは、編集するとフックが整形する。`packages/`・`scripts/` は biome の対象外）。
- React コンポーネントと公開型は PascalCase、フックやユーティリティは camelCase を維持する。
- ファイル名は `bill-contents-data.ts` のようにローワーハイフンで表記し、スタイルは Tailwind ユーティリティを先に検討する。
- **アイコン**: インラインSVGは禁止。必ず `lucide-react` からアイコンコンポーネントをインポートして使用する。
- **ボタン**: `<button>` タグの使用は禁止。必ず `@/components/ui/button` の `Button` コンポーネントを使用する。
- **色**: インラインカラーコード（`text-[#xxx]`, `bg-[#xxx]`, `border-[#xxx]` 等の arbitrary value や style 属性での直接指定）は**禁止**。必ず `globals.css` の `@theme inline` で定義済みのカラートークン（`text-mirai-text`, `bg-primary`, `border-primary-accent` 等）を使用する。新しい色が必要な場合は、まず `globals.css` にトークンを追加してから使用すること。既存トークン一覧は `web/src/app/globals.css` の `@theme inline` ブロックを参照。
- **ブランド色**: ブランドの色は `globals.css` の `:root` の `--brand-*` で決め、コンポーネントからは `bg-brand-header`・`bg-brand-accent`・`text-brand-link` などの名前で使う。アクセント（`brand-accent`）は塗り（地の色）専用で、白地の文字色には使わない（コントラスト不足。白地のリンク・強調は `brand-link`）。アクセント地の上の文字は `brand-on-accent`。
- **配色の切り替え**: `:root` の `--brand-*` を差し替える（試すだけなら `<html data-palette="a">`）。あわせて `pnpm brand:assets --palette <a|b|c>` でロゴ・アプリアイコン・OGP・仮サムネイル・manifest を作り直し、`web/src/config/brand-colors.ts`（OG 画像とテーマカラー）を同じ値にそろえる。
- 高さは `h-screen` を使わず `dvh` を使う（[docs/20260220_1530_スタイルガイド.md](docs/20260220_1530_スタイルガイド.md)）。コンポーネント単体の確認は `/dev/*`（[docs/20260301_0700_開発用UIプレビュー環境.md](docs/20260301_0700_開発用UIプレビュー環境.md)）。

### admin 内部ルート定義
- admin アプリの内部リンク（Link href, router.push, redirect）には `@/lib/routes` の関数を使用すること。文字列リテラルでのルート直書きは禁止。
- 新しいページ（page.tsx）を追加したら `admin/src/lib/routes.ts` にもルート関数を追加すること。テスト（routes.test.ts）が page.tsx との同期を検証する。

### web 内部ルート定義
- web アプリの内部リンク（Link href, router.push, redirect, revalidatePath）には `@/lib/routes` の関数を使用すること。文字列リテラルでのルート直書きは禁止。
- 新しいページ（page.tsx）を追加したら `web/src/lib/routes.ts` にもルート関数を追加すること。テスト（routes.test.ts）が page.tsx との同期を検証する。
- preview 付きリンク生成は `interview-links.ts` のラッパー関数を使用すること。

## Testing Guidelines
- Vitest の単体テストを `*.test.ts` として実装と同階層に配置し、データ変換の変更時は必ず回帰テストを追加する。
- **純粋関数にはテスト必須**: `utils/` に切り出した純粋関数は、新規作成時に必ず `*.test.ts` を同階層に作成してテストを書く。
- **mock は極力使わない**: `vi.mock("server-only")` 等のモックに頼らず、テスト対象のロジックを純粋関数として `shared/` に切り出してからテストする。`server-only` や外部依存を含むファイルからは re-export で参照を維持する。
- **DB はモックしない**: DB を使うテストは integration テスト（`*.integration.test.ts`、`tests/supabase/`）にする。CI で回し、手元では実行しない（理由は「Supabase」。`pnpm check` にも入っていない）。
- **DB function（RPC）には統合テスト必須**: `supabase/migrations/` でDB function を追加・変更した場合、`tests/supabase/db-function/` に統合テストを作成すること。テストファイル名は `{function-name}.test.ts` とし、`tests/supabase/utils.ts` のヘルパーを利用する。
- **外部 API は DI でモックする**: 外部 API クライアントはインターフェースを定義し、テストでは Fake/Mock 実装に差し替える。
- テストの書き方・構造化・コード例などの詳細は [docs/20260219_1000_テストガイドライン.md](docs/20260219_1000_テストガイドライン.md) を参照。

## Commit Guidelines
- コミットメッセージは短い命令形（日本語可）とする。
- スキーマ変更時は `supabase/migrations` のマイグレーションと `packages/supabase/types/supabase.types.ts` の再生成ファイル（`pnpm db:types:gen:remote`）をセットでコミットする。

## Supabase
- Docker・ローカル Supabase は使わない。開発用はクラウドの Supabase（`.env` が指す先）。マイグレーションの当て方は [docs/guides/release.md](docs/guides/release.md)。
  - ローカル Docker 用のコマンド（`db:reset`・`db:migrate`・`db:types:gen`・`seed`）は使わない。型は `pnpm db:types:gen:remote`。
  - integration テスト（`pnpm test:integration` など）は手元で実行しない。`.env` が開発用のクラウド DB を指しているので、実行するとそこに secret key でテスト用の行を作成・削除してしまう（CI の `integration_test.yml` で回る）。
- **当てたマイグレーションのファイルは後から書き換えない**。直すときは新しいマイグレーションを足す（書き換えると `db push` が履歴の食い違いで失敗する）。
- **RLSとアクセスパターン**: マイグレーションでは必ず `alter table <テーブル名> enable row level security;` を記述してRLSを有効化すること。ただし **ポリシーは定義しない**（デフォルト全拒否）。データアクセスはすべて `createAdminClient()`（Supabase Secret Key）経由で行い、認可ロジックはアプリケーション層（Server Actions / Loaders）で実装する。

## ドキュメント作成ルール
- 秘密情報（パスワード・鍵・トークン・project ref の値）と個人情報は書かない。「`.env.supabase-prod` の `SUPABASE_PROJECT_REF`」のように変数名で示す。
- 同じ説明を2か所に書かない。正本を1か所に決め、ほかはリンクする。
- 作業の手順は `docs/guides/` の該当ファイルを直接直す。作業を終えるときは `docs/HANDOFF.md` の「現在地」「次にやること」を短く更新する（経緯は書かない）。
- 要件定義や実装計画は、論点を先に洗い出し、不明点を確認してから `docs/YYYYMMDD_HHMM_作業内容.md` に保存する。大きく変えるときは新しいファイルとして残す。
