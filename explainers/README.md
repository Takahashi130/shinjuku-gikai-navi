# 議案の解説（explainers/）

議案ページに出す「この議案の解説」の元データです。1議案1ファイルで、`explainers/<会期slug>/<議案slug>.json` に置きます（例：`explainers/r8-teirei-3/r8-teirei-3-gian-63.json`）。

- 形はスキーマ `packages/shared/src/bill-explainer/schema.ts`（`explainerFileSchema`）のとおりです。
- `body` と `sources` は、そのまま DB の `bill_explainers.body` / `sources` に入ります。
- 解説は AI（Claude）が区の公開資料だけを材料に作り、別の AI が資料と照合してから公開します。照合が済んだら `status: "published"` にし、`review` に `{ "reviewedBy": "ai-crosscheck", "reviewedAt": "<日時>" }` を入れます。

## 書き方のきまり

- 目的（purpose）・背景（background）・効果（merits）・論点（concerns）・主な数字（keyFacts）の各項目に、出典（`sourceRefs`：`sources[].id`）と、資料からの短い抜き出し（`evidence`：120字まで）を必ず付けます。
- 数字・日付・金額は資料に書かれている値をそのまま使います。
- 「約」「程度」などを付けるときは、その項目の抜き出し（`evidence`）に元の数を入れ、その数を表示する桁で四捨五入か切り捨てした値にします（例：抜き出しが「193,612,345,678」なら「約1,936億円」。「約1,940億円」は可、「約1,937億円」は不可）。整数の末尾の0は位取りとみなします（「約3,000人」は2,500人以上4,000人未満）。見出し（title）とひとこと（oneLiner）の「約」は、解説のどれかの抜き出しの数と比べます。検査（`explainers:check`）は、資料のほかの箇所にたまたま近い数があっても通しません。
- 評価する言葉（「画期的」「無駄」「〜すべき」など）は使いません。判断は読む人に任せます。
- 私人の情報（会社の代表者などの氏名、電話番号、番地までの住所）は載せません。
- 資料に書かれていないことは `notInMaterials` に書きます。
- 出典のリンクは区の HTML ページにし、PDF へ直接リンクしません（PDF は資料名とページで示します）。
- 公開した解説を直すときは `version` を1つ上げます。

## 手順

1. 材料を取る（区の資料の文字。`.materials/` に保存され、リポジトリにも DB にも入りません）
   `pnpm --filter @mirai-gikai/shinjuku-importer materials <会期ページのURL>`
2. 解説を書き、検査する（スキーマ・抜き出し・数字・評価語・私人情報）
   `pnpm explainers:check`
3. 開発用 DB に同期する
   `pnpm explainers:sync`（本番は `--env prod`。毎回確認があります）
4. 状況を見る
   `pnpm explainers:status --session r8-teirei-3`
