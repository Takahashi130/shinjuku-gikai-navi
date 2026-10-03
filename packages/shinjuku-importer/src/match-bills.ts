import type { ResultRow } from "./parse-results-pdf";
import type { SessionBill } from "./parse-session-page";

const ROMAN = "ⅠⅡⅢⅣⅤⅥⅦⅧⅨ";

/** 表記ゆれ（全角半角・空白・ローマ数字）をそろえて比較用の文字列にする */
export function normalizeName(s: string): string {
  return s
    .replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨ]/g, (c) => String(ROMAN.indexOf(c) + 1))
    .normalize("NFKC")
    .replace(/\s/g, "");
}

export type MatchedBill = SessionBill & { result: ResultRow };

/**
 * 会期ページの議案一覧と、PDF の行を名前で突き合わせる。
 * 同名の議案（「専決処分の承認について」など）は出現順で対応づける。
 */
export function matchBills(bills: SessionBill[], rows: ResultRow[]): { matched: MatchedBill[]; unmatchedRows: ResultRow[] } {
  const used = new Set<number>();
  const matched: MatchedBill[] = [];
  const unmatchedRows: ResultRow[] = [];
  for (const row of rows) {
    const rowName = normalizeName(row.name);
    const idx = bills.findIndex((b, k) => {
      if (used.has(k)) return false;
      const billName = normalizeName(b.name);
      return rowName.startsWith(billName) || billName.startsWith(rowName);
    });
    if (idx === -1) {
      unmatchedRows.push(row);
      continue;
    }
    used.add(idx);
    matched.push({ ...bills[idx], result: row });
  }
  return { matched, unmatchedRows };
}
