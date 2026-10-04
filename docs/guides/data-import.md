# データの取り込み（区の公開資料 → Supabase）

`packages/shinjuku-importer` が区のサイトを読み、Supabase に書き込む。使い方の正本は各コマンドの冒頭コメント（`src/run*.ts`・`src/materials.ts`）。

## まとめて行う

```sh
pnpm release -- --env dev --only data          # 計画を見るだけ
pnpm release -- --env dev --only data --yes    # 開発用 DB に5つを順に取り込む（途中で止まっても、同じコマンドで続きから）
```

順番・再開・ログ（`.logs/release-dev/`）は [release.md](release.md)。本番へはこれを `--env prod` で行う（個別のコマンドは `.env`＝開発用にしか書き込まない）。

## 1つずつ行う

前に `pnpm --filter @mirai-gikai/shinjuku-importer` を付ける。`--dry-run` は DB に書き込まない（区のサイトは読む）。

| 順 | コマンド | 取り込むもの | 書き込むテーブル |
|---|---|---|---|
| 1 | `ingest --all`（`--since-reiwa N`）／`ingest <会期URL>...` | 議案・会派の賛否・会期の採決予定・議案ごとの投票の回 | `src/writable-tables.ts` の一覧に限る |
| 2 | `members` | 今の議員・会派・委員会・役職 | factions, faction_names, members, member_terms, member_positions, faction_memberships |
| 3 | `questions --all`／`questions <会期URL>...` | 本会議の代表質問・一般質問 | plenary_questions（会期ごとに入れ直し）, faction_memberships |
| 4 | `expenses` | 会派の政務活動費（収支一覧 PDF） | faction_activity_expenses（期間ごとに入れ直し） |
| 5 | `faction-votes --all`／`faction-votes <会期URL>...` | 審議結果 PDF の会派ごとの賛否 | bill_faction_votes |
| — | `materials <会期URL>` | 解説の材料（区の資料の文字） | DB には書かない。`.materials/<会期slug>/` に保存（Git に入れない） |

- 順番の決まり：`members` は `questions` より先、`ingest` は `faction-votes` より先。
- `ingest --all` は令和の全会期で約5分。平成の会期に達したら止まる。
- 書き込むコマンドは、最後に画面のキャッシュを消す（`.env` に `NEXT_PUBLIC_WEB_URL` と `REVALIDATE_SECRET` があるとき）。
- 区のサイトへのアクセスは1秒以上あける（`src/fetch.ts`）。動きを確かめるだけなら、まずテスト（`pnpm check -- --only test:packages`）か、会期 URL を1つだけ指定して `--dry-run`。
- 住所・電話・メール・顔写真はページにあっても読まない。委員会での質問は数えない（会議録システムは自動取得が禁止）。

## 判断が必要なとき

| 出たもの | すること |
|---|---|
| 「会派の一覧（src/data/factions.ts）に無い会派を新しく作りました」 | 区のページで名称変更か新しい会派かを確かめ、名称変更なら `src/data/factions.ts` に追記して取り込み直す |
| 先議（`early_vote_at`）や採決時刻の警告 | [participation-ops.md](participation-ops.md) の 2.1・2.2 で締切を直す |
| 「読めなかった行」「PDF が未掲載」 | 少しなら記録だけ。同じ形がくり返すなら parser（`src/parse-*.ts`）をテスト付きで直す |
| 本番に書き込みたい | ユーザーの「本番OK」を確認してから（[release.md](release.md)） |

## 既知の欠け（直していない）

- 審議結果 PDF は年度で形式が違う（罫線あり・なし、結合セル、「1人反対」の注記）。令和2年第3回・令和3年第2回・第3回の定例会は罫線が無く読めないため、会派の賛否が無い。
- 「令和元年」の表記のずれで、令和元年度の議案の一部が取り込めていない。
- 今の議員名簿に無い（過去の）議員の質問は、議員に結びつけずに残す。
