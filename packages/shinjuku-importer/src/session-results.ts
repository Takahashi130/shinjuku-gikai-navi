/**
 * 会期ページと「議案の概要と審議結果」PDF を読み、議案と PDF の行を対応づける
 *
 * run.ts（ingest）の recordsFromResults と同じ読み方。run.ts は他の作業と並行して
 * 変更されることがあるため、会派ごとの賛否の取り込み（faction-votes）用にここへ置く。
 */
import { fetchBytes, fetchText } from "./fetch";
import { loadPdfPages } from "./load-pdf";
import { type MatchedBill, matchBills } from "./match-bills";
import { type Faction, parseResultsTable, parseResultsTableByText, type ResultRow } from "./parse-results-pdf";
import { parseSessionPage, type SessionPage } from "./parse-session-page";

export type SessionResults = {
  session: SessionPage;
  /** その会期の PDF の凡例（略称と正式名称） */
  factions: Faction[];
  matched: MatchedBill[];
  warnings: string[];
};

/** PDF の各ページの表を読み、凡例と行をまとめる（罫線のない PDF は文字の位置だけで読む） */
export async function readResultsPdf(pdfUrl: string): Promise<{ factions: Faction[]; rows: ResultRow[]; warnings: string[] }> {
  const pages = await loadPdfPages(await fetchBytes(pdfUrl));
  const rows: ResultRow[] = [];
  const warnings: string[] = [];
  let factions: Faction[] = [];
  for (const [i, page] of pages.entries()) {
    try {
      const hasRules = page.rules.horizontal.length >= 3 && page.rules.vertical.length >= 3;
      const table = hasRules ? parseResultsTable(page.items, page.rules) : parseResultsTableByText(page.items);
      if (factions.length === 0) factions = table.factions;
      rows.push(...table.rows);
    } catch (e) {
      warnings.push(`PDF ${i + 1} ページ目を読めませんでした: ${e instanceof Error ? e.message : e}`);
    }
  }
  return { factions, rows, warnings };
}

/**
 * 会期ページを読み、審議結果 PDF があれば議案と対応づける。
 * 審議結果 PDF が無い会期（会期中など）は null。
 * 平成の会期など形式が違うページは parseSessionPage が例外を投げる。
 */
export async function readSessionResults(sessionUrl: string): Promise<SessionResults | null> {
  const session = parseSessionPage(await fetchText(sessionUrl), sessionUrl);
  if (!session.resultsPdfUrl) return null;
  const { factions, rows, warnings } = await readResultsPdf(session.resultsPdfUrl);
  const { matched, unmatchedRows } = matchBills(session.bills, rows);
  for (const r of unmatchedRows) warnings.push(`対応する議案が見つからない行: ${r.name}`);
  return { session, factions, matched, warnings };
}
