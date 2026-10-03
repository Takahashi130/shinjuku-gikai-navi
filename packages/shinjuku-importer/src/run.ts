/**
 * 新宿区議会の会期ページから議案と会派ごとの賛否を取り込む
 *
 * 使い方:
 *   pnpm --filter @mirai-gikai/shinjuku-importer ingest <会期ページのURL> [--dry-run]
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@mirai-gikai/supabase";
import { billSlug, buildContent, sessionSlug, shortSummary, toBillStatus } from "./build-content";
import { fetchBytes, fetchText } from "./fetch";
import { loadPdfPages } from "./load-pdf";
import { matchBills } from "./match-bills";
import { parseResultsTable, type ResultRow, type Faction } from "./parse-results-pdf";
import { parseSessionPage } from "./parse-session-page";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const sessionUrl = args.find((a) => a.startsWith("http"));
  if (!sessionUrl) {
    console.error("会期ページの URL を指定してください");
    process.exit(1);
  }

  const session = parseSessionPage(await fetchText(sessionUrl), sessionUrl);
  console.log(`📅 ${session.title}（${session.startDate}〜${session.endDate}）議案 ${session.bills.length} 件`);
  if (!session.resultsPdfUrl) throw new Error("「議案の概要と審議結果」PDF が見つかりません（まだ掲載されていない可能性があります）");

  const pages = await loadPdfPages(await fetchBytes(session.resultsPdfUrl));
  const rows: ResultRow[] = [];
  let factions: Faction[] = [];
  for (const page of pages) {
    const table = parseResultsTable(page.items, page.rules);
    if (factions.length === 0) factions = table.factions;
    rows.push(...table.rows);
  }

  const { matched, unmatchedRows } = matchBills(session.bills, rows);
  console.log(`🔗 PDF ${rows.length} 行のうち ${matched.length} 件を議案と対応づけました`);
  for (const r of unmatchedRows) console.warn(`⚠️  対応する議案が見つからない行: ${r.name}`);
  const missing = session.bills.filter((b) => !matched.some((m) => m.label === b.label));
  for (const b of missing) console.warn(`⚠️  PDF に見つからない議案: ${b.label} ${b.name}`);

  if (dryRun) {
    for (const b of matched) {
      const against = factions.filter((f) => b.result.votes[f.abbr] === "against").map((f) => f.abbr);
      console.log(`  ${b.label} ${b.result.result} 反対:[${against.join(",")}] ${b.name}`);
    }
    return;
  }

  const supabase = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

  const { data: dietSession, error: sessionError } = await supabase
    .from("diet_sessions")
    .upsert(
      {
        slug: sessionSlug(session),
        name: session.title,
        start_date: session.startDate,
        end_date: session.endDate,
        shugiin_url: sessionUrl,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();
  if (sessionError) throw sessionError;

  for (const bill of matched) {
    const status = toBillStatus(bill.result.result);
    if (!status) {
      console.warn(`⚠️  議決結果「${bill.result.result}」を判定できないためスキップ: ${bill.label}`);
      continue;
    }
    const { data: row, error } = await supabase
      .from("bills")
      .upsert(
        {
          slug: billSlug(session, bill),
          name: bill.name,
          // 国会用の必須項目。区議会では意味を持たないため固定値
          originating_house: "HR",
          status,
          status_note: bill.label,
          diet_session_id: dietSession.id,
          submitted_date: session.startDate,
          publish_status: "published",
          shugiin_url: sessionUrl,
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();
    if (error) throw error;

    const content = buildContent(session, sessionUrl, bill, factions);
    const summary = shortSummary(bill.result.summary) || bill.name;
    const { error: contentError } = await supabase.from("bill_contents").upsert(
      (["normal", "hard"] as const).map((difficulty_level) => ({
        bill_id: row.id,
        difficulty_level,
        title: bill.name,
        summary,
        content,
      })),
      { onConflict: "bill_id,difficulty_level" }
    );
    if (contentError) throw contentError;
  }
  console.log(`✅ ${matched.length} 件を取り込みました`);
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
