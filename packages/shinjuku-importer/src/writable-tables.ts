/**
 * 取り込み処理（区のサイトのデータ）が書き込んでよいテーブル。
 *
 * 運営者が作るデータ（bill_explainers など）と区民が作るデータ（poll_responses など）は
 * 取り込み直しで消えないよう、ここに入れない。
 * polls だけは例外で、新しい回の追加（重複は無視）と、締切が日程由来（closes_at_source = 'schedule'）の
 * 回の closes_at の更新だけを行う。
 *
 * writable-tables.test.ts が、src の .from("...") がこの一覧に収まっていることを確かめる。
 */
export const IMPORTER_WRITABLE_TABLES = [
  "tags",
  "bills",
  "bill_contents",
  "bills_tags",
  "diet_sessions",
  "polls",
] as const;

/** 取り込み処理が決して書き込まないテーブル（運営者・区民が作るデータ） */
export const IMPORTER_FORBIDDEN_TABLES = ["bill_explainers", "poll_responses"] as const;
