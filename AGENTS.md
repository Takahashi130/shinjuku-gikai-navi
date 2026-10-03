# Repository Guidelines

> **Note**: `CLAUDE.md` は `AGENTS.md` へのシンボリックリンクです。ルールの追加・編集は必ず `AGENTS.md` を直接編集してください。

## このリポジトリについて
- 「新宿区議会ナビ」は、AGPL-3.0 で公開されている「みらい議会」（https://github.com/team-mirai/mirai-gikai ）をもとにした個人開発アプリです。
- サービス名・説明文・テーマカラー・免責文言は `web/src/config/site.ts` で一元管理しています。名前を変える場合はまずここを変更すること。
- 元のソフトウェアのライセンス追加条件により、免責文言「これは政党チームみらいが運営しているものではありません」と、チームみらいのロゴ・配色を使わないことが求められています。
- 新宿区議会のデータ取り込みは `packages/shinjuku-importer/` で行います（`pnpm --filter @mirai-gikai/shinjuku-importer ingest <会期ページURL>`）。区のサイトへのアクセスは1秒以上の間隔をあけること。

## 開発の進め方（個人開発）
- `develop` ブランチで直接作業してよい。worktree や PR は必須ではない。
- コミット・push はユーザーの確認を取ってから行う。
- コミット前に `pnpm lint`・`pnpm typecheck`・関連するテストを通すこと。

## Project Structure & Module Organization
- `web/` は公開用 Next.js アプリ。共通 UI は `src/components`、Vitest のテストは `src/**/*.test.ts` に配置します。
- `admin/` はポート 3001 で動く管理用 Next.js。審議フローやダッシュボードはここに集約します。
- `packages/supabase/` は共有 Supabase クライアントと型定義を提供し、生成結果は `types/` に保存します。
- `packages/shared/` は `web` と `admin` の両方で使う共通ロジック（AI モデル定義、ストリーム処理等）を提供します。
- `packages/seed/` はローカルデータ投入用の TypeScript スクリプト (`run.ts`, `data.ts`) を管理します。
- `supabase/` はマイグレーションと設定ファイルを保持します。
- 設計ドキュメントは `docs/` に格納し、ルートの設定ファイル（`biome.json`, `pnpm-workspace.yaml` など）は全体ポリシーとして扱います。
- **web と admin でのコード共有**: 同一ロジックを `web/` と `admin/` の両方で使う場合は、`packages/` 配下の workspace パッケージに切り出すこと。同じコードを両アプリに重複配置するのは禁止。既存の `@mirai-gikai/shared` パッケージに追加するか、用途に応じて新しいパッケージを作成する。

## Next.js アーキテクチャ指針
- Bulletproof React の feature ベース構成を採用します。
- `app/` 配下の `page.tsx` は、URL パラメータ（`params` や `searchParams`）の取得と Feature コンポーネントへの受け渡しのみを担当する薄いラッパーとし、ビューやロジックは `features/` 配下に実装します。
- export 用の `index.ts` は作成せず、必要なファイルから直接 import します。
- Server Components を標準とし、状態管理・イベント処理が必要な場合のみ `"use client"` を付与した Client Component を追加します。
- ファイル名はケバブケース、コンポーネントはパスカルケース、関数はキャメルケースで統一します。

### Feature ディレクトリ構造
複雑な feature では server/client/shared の3層構造を採用します：

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

`web/` と `admin/` の両方で同じ server/client/shared 構成を採用します。ただし `admin/` では Server Components が中心のため `client/` ディレクトリを省略している feature もあります。

- Server側ファイルには `"server-only"` を、Client Componentsには `"use client"` を付与
- 型定義やServer/Client両方で使う関数は `shared/` に配置
- **純粋関数の切り出し**: 新規実装時、外部依存（DB・API・認証等）を持たない計算・変換・判定ロジックは純粋関数として `utils/` に切り出すこと。配置先は用途に応じて `shared/utils/`、`server/utils/`、`client/utils/` を選択する。
- シンプルな feature は従来の `components|actions|api|types` 構成でも可

Repository レイヤーの詳細は [docs/repository-layer.md](docs/repository-layer.md) を参照。

## Build, Test, and Development Commands
- 依存導入は `pnpm install`、全てのスクリプトは pnpm 経由で実行します。
- `pnpm dev` は `.env` を共有しつつ `web`・`admin`・各パッケージの dev サーバーを並列起動します。
- `pnpm test` でワークスペース横断の Vitest を実行。局所実行は `pnpm --filter web test` や `test:watch` を利用します。
- 品質ゲートとして `pnpm lint`（Biome format+lint）と `pnpm typecheck` を PR 前に通過させます。
- DB 関連は `pnpm db:reset`、`pnpm db:migrate`、`pnpm db:types:gen`、`pnpm seed` を用途に応じて組み合わせます。

## Coding Style & Naming Conventions
- Biome が 2 スペースインデント、LF、ダブルクォート、セミコロン、80 文字幅を強制します。
- React コンポーネントと公開型は PascalCase、フックやユーティリティは camelCase を維持します。
- ファイル名は `bill-contents-data.ts` のようにローワーハイフンで表記し、スタイルは Tailwind ユーティリティを先に検討します。
- **アイコン**: インラインSVGは禁止です。必ず `lucide-react` からアイコンコンポーネントをインポートして使用してください。
- **ボタン**: `<button>` タグの使用は禁止です。必ず `@/components/ui/button` の `Button` コンポーネントを使用してください。
- **色**: インラインカラーコード（`text-[#xxx]`, `bg-[#xxx]`, `border-[#xxx]` 等の arbitrary value や style 属性での直接指定）は**禁止**です。必ず `globals.css` の `@theme inline` で定義済みのカラートークン（`text-mirai-text`, `bg-primary`, `border-primary-accent` 等）を使用してください。新しい色が必要な場合は、まず `globals.css` にトークンを追加してから使用すること。既存トークン一覧は `web/src/app/globals.css` の `@theme inline` ブロックを参照。
- **ブランド色**: ブランドの色は `globals.css` の `:root` の `--brand-*` で決め、コンポーネントからは `bg-brand-header`・`bg-brand-accent`・`text-brand-link` などの名前で使う。アクセント（`brand-accent`）は塗り（地の色）専用で、白地の文字色には使わない（コントラスト不足。白地のリンク・強調は `brand-link`）。アクセント地の上の文字は `brand-on-accent`。
- **配色の切り替え**: `:root` の `--brand-*` を差し替える（試すだけなら `<html data-palette="a">`）。あわせて `pnpm brand:assets --palette <a|b|c>` でロゴ・アプリアイコン・OGP・仮サムネイル・manifest を作り直し、`web/src/config/brand-colors.ts`（OG 画像とテーマカラー）を同じ値にそろえる。
- **Figma実装**: FigmaのURLからUIを実装する際、スクリーンショットだけで色やサイズを推測しないこと。必ず `get_variable_defs` や `get_design_context` でカラーコード・フォントサイズ・スペーシング等の正確な値を取得し、既存のデザイントークンとの対応を確認してから実装する。

### admin 内部ルート定義
- admin アプリの内部リンク（Link href, router.push, redirect）には `@/lib/routes` の関数を使用すること。文字列リテラルでのルート直書きは禁止。
- 新しいページ（page.tsx）を追加したら `admin/src/lib/routes.ts` にもルート関数を追加すること。テスト（routes.test.ts）が page.tsx との同期を検証する。

### web 内部ルート定義
- web アプリの内部リンク（Link href, router.push, redirect, revalidatePath）には `@/lib/routes` の関数を使用すること。文字列リテラルでのルート直書きは禁止。
- 新しいページ（page.tsx）を追加したら `web/src/lib/routes.ts` にもルート関数を追加すること。テスト（routes.test.ts）が page.tsx との同期を検証する。
- preview 付きリンク生成は `interview-links.ts` のラッパー関数を使用すること。

## Testing Guidelines
- Vitest の単体テストを `*.test.ts` として実装と同階層に配置し、AI コスト計算や Markdown 処理などデータ変換の変更時は必ず回帰テストを追加します。
- **純粋関数にはテスト必須**: `utils/` に切り出した純粋関数は、新規作成時に必ず `*.test.ts` を同階層に作成してテストを書いてください。
- **mock は極力使わない**: `vi.mock("server-only")` 等のモックに頼らず、テスト対象のロジックを純粋関数として `shared/` に切り出してからテストしてください。`server-only` や外部依存を含むファイルからは re-export で参照を維持します。
- **ローカルサービスは real で動かす**: Supabase などローカルで起動できるサービスはモックせず、実際のローカルインスタンスに接続してテストします。
- **DB function（RPC）には統合テスト必須**: `supabase/migrations/` でDB function を追加・変更した場合、`tests/supabase/db-function/` に統合テストを作成すること。テストファイル名は `{function-name}.test.ts` とし、`tests/supabase/utils.ts` のヘルパーを利用する。ソート・フィルタ・集計ロジックがDB側にある場合、アプリ層のユニットテストでは検出できないバグ（例: フルテーブルスキャン、不正なソート順）を防止できます。
- **外部 API は DI でモックする**: OpenAI などの外部 API クライアントはインターフェースを定義し、テストでは Fake/Mock 実装に差し替えます。
- PR 前に `pnpm --filter web test:watch` で失敗を早期検知し、必要に応じて `vitest run --coverage` でカバレッジ低下を確認します。
- テストの書き方・構造化・コード例などの詳細は [docs/テストガイドライン.md](docs/20260219_1000_テストガイドライン.md) を参照。

## Commit Guidelines
- コミットメッセージは短い命令形（日本語可）とします。
- スキーマ変更時は `supabase/migrations` のマイグレーションと `packages/supabase/types/supabase.types.ts` の再生成ファイルをセットでコミットします。

## Supabase & Environment Notes
- ローカル開発前に `npx supabase start` を実行し、`.env.example` を `.env` にコピーして値を整えます。
- スキーマ変更時は `supabase/migrations` のマイグレーションと `packages/supabase/types/supabase.types.ts` の再生成ファイルをセットでコミットします。
- `pnpm seed` は `admin@example.com / admin123456` を含む検証データを投入するため、開発用途に限定してください。
- **RLSとアクセスパターン**: マイグレーションでは必ず `alter table <テーブル名> enable row level security;` を記述してRLSを有効化すること。ただし **ポリシーは定義しない**（デフォルト全拒否）。データアクセスはすべて `createAdminClient()`（Supabase Secret Key）経由で行い、認可ロジックはアプリケーション層（Server Actions / Loaders）で実装する。

## ドキュメント作成ルール
- 要件定義や実装計画をまとめる際は論点を先に洗い出し、不明点を確認してから Markdown で整理します。
- 設計文書は `docs/` 配下に `YYYYMMDD_HHMM_作業内容.md` で保存してください（例: `docs/20250815_1430_ユーザー認証システム設計.md`）。
- 既存資料に大きな変更を加える場合は新しいファイルとして残し、更新履歴をたどれるようにします。
