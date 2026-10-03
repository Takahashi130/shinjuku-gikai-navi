/**
 * 会派ごとの政務活動費の収支を、区の「政務活動費」ページに載っている収支一覧（PDF）から取り込む
 *
 * 使い方:
 *   pnpm --filter @mirai-gikai/shinjuku-importer expenses [--dry-run]
 *
 * 書き込むテーブル: faction_activity_expenses（対象期間ごとに消してから入れ直す）
 * 出典として保存するのは区の HTML ページの URL と資料名だけ（PDF の URL や本文は保存しない）。
 */
import { createDb, errorMessage, revalidateWebCache } from "./cli-helpers";
import { findKnownFactionSlug } from "./data/factions";
import { createFactionResolver, type FactionResolver } from "./faction-store";
import { fetchBytes, fetchText } from "./fetch";
import { loadPdfPages } from "./load-pdf";
import { extractExpenseReportLinks, parseExpensePdf } from "./parse-expense-pdf";

const EXPENSES_PAGE_URL = "https://www.city.shinjuku.lg.jp/kusei/file08_00021.html";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const db = createDb(dryRun);
  const unresolved = new Set<string>();
  const resolveFaction: FactionResolver = db
    ? await createFactionResolver(db, unresolved)
    : (name) => {
        if (!findKnownFactionSlug(name)) unresolved.add(name);
        return null;
      };

  const links = extractExpenseReportLinks(await fetchText(EXPENSES_PAGE_URL), EXPENSES_PAGE_URL);
  if (links.length === 0) throw new Error("政務活動費収支一覧の PDF が見つかりません");

  let total = 0;
  const years = new Set<number>();
  const failures: string[] = [];
  for (const link of links) {
    try {
      const pages = await loadPdfPages(await fetchBytes(link.pdfUrl));
      const report = parseExpensePdf(pages.map((p) => p.items));
      const rows = report.rows.map((r, k) => ({
        fiscal_year: report.fiscalYear,
        period_label: report.periodLabel,
        period_start: report.periodStart,
        period_end: report.periodEnd,
        faction_id: resolveFaction(r.factionName),
        faction_name: r.factionName,
        member_count: r.memberCount,
        income: r.income,
        research_expense: r.expenses.research,
        training_expense: r.expenses.training,
        publicity_expense: r.expenses.publicity,
        hearing_expense: r.expenses.hearing,
        petition_expense: r.expenses.petition,
        meeting_expense: r.expenses.meeting,
        materials_expense: r.expenses.materials,
        personnel_expense: r.expenses.personnel,
        office_expense: r.expenses.office,
        total_expense: r.totalExpense,
        notes: r.notes,
        sort_order: k,
        source_title: link.title,
        source_url: EXPENSES_PAGE_URL,
      }));
      if (db) {
        const { error: deleteError } = await db
          .from("faction_activity_expenses")
          .delete()
          .eq("period_start", report.periodStart);
        if (deleteError) throw deleteError;
        const { error } = await db.from("faction_activity_expenses").insert(rows);
        if (error) throw error;
      }
      total += rows.length;
      years.add(report.fiscalYear);
      const sum = rows.reduce((a, r) => a + r.total_expense, 0);
      console.log(`✅ ${link.title}（${report.periodLabel}）: 会派 ${rows.length}・支出合計 ${sum.toLocaleString()} 円`);
      for (const r of rows) {
        console.log(`  ${r.faction_name}（${r.member_count ?? "-"}人）収入 ${r.income.toLocaleString()} / 支出 ${r.total_expense.toLocaleString()}`);
      }
    } catch (e) {
      console.error(`❌ ${link.title}: ${errorMessage(e)}`);
      failures.push(link.title);
    }
  }

  const sortedYears = [...years].sort();
  console.log(
    `\n🎉 ${total} 行${dryRun ? "（確認のみ）" : "を取り込みました"}（${sortedYears[0] ?? "-"}〜${sortedYears[sortedYears.length - 1] ?? "-"}年度）。失敗 ${failures.length} 件`
  );
  for (const f of failures) console.log(`  - ${f}`);
  if (unresolved.size > 0) console.log(`⚠️  会派の一覧で引けなかった会派名（会派は空のまま）: ${[...unresolved].join("、")}`);
  if (!dryRun) await revalidateWebCache();
}

main().catch((e) => {
  console.error("❌", errorMessage(e));
  process.exit(1);
});
