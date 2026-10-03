/**
 * 新宿区議会の会期ページから議案と会派ごとの賛否を取り込む
 *
 * 使い方:
 *   # 会期ページを指定して取り込む
 *   pnpm --filter @mirai-gikai/shinjuku-importer ingest <会期ページのURL>... [--dry-run]
 *   # 「定例会・臨時会」一覧から、令和以降の会期をまとめて取り込む
 *   pnpm --filter @mirai-gikai/shinjuku-importer ingest --all [--since-reiwa 1] [--dry-run]
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@mirai-gikai/supabase";
import {
  billDisplayName,
  billSlug,
  buildContent,
  buildPendingContent,
  isSessionActive,
  isSplitVote,
  sessionSlug,
  shortSummary,
  toBillStatus,
} from "./build-content";
import { fetchBytes, fetchText } from "./fetch";
import { loadPdfPages } from "./load-pdf";
import { matchBills } from "./match-bills";
import {
  parseResultsTable,
  parseResultsTableByText,
  type Faction,
  type ResultRow,
} from "./parse-results-pdf";
import { parseSessionPage, type SessionBill, type SessionPage } from "./parse-session-page";
import { THEMES, pickTheme } from "./pick-thumbnail";
import { extractSessionLinks } from "./session-index";

const SESSION_INDEX_URL = "https://www.city.shinjuku.lg.jp/kusei/file08_00015.html";

type Db = SupabaseClient<Database>;
type BillStatus = Database["public"]["Enums"]["bill_status_enum"];
type Options = { sinceReiwa: number; db: Db | null; today: string; tagIds: Map<string, string> };
type Outcome = { status: "imported" | "skipped"; reason?: string; count?: number };

/** 日本時間の今日（YYYY-MM-DD） */
function todayInJapan(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** テーマ（タグ）を用意し、ラベル → ID の対応を返す */
async function ensureThemeTags(db: Db): Promise<Map<string, string>> {
  const rows = Object.values(THEMES).map((t, i) => ({ label: t.label, featured_priority: i + 1 }));
  const { data, error } = await db.from("tags").upsert(rows, { onConflict: "label" }).select("id, label");
  if (error) throw error;
  return new Map(data.map((t) => [t.label, t.id]));
}

type BillRecord = {
  slug: string;
  name: string;
  kind: SessionBill["kind"];
  label: string;
  status: BillStatus;
  featured: boolean;
  summary: string;
  content: string;
};

async function upsertBill(
  db: Db,
  opts: Options,
  sessionId: string,
  session: SessionPage,
  sessionUrl: string,
  bill: BillRecord
) {
  const theme = pickTheme(bill.name, bill.kind);
  const { data: row, error } = await db
    .from("bills")
    .upsert(
      {
        slug: bill.slug,
        name: bill.name,
        // 国会用の必須項目。区議会では意味を持たないため固定値
        originating_house: "HR",
        status: bill.status,
        status_note: bill.label,
        diet_session_id: sessionId,
        submitted_date: session.startDate,
        publish_status: "published",
        is_featured: bill.featured,
        shugiin_url: sessionUrl,
        thumbnail_url: `/img/thumbnails/${theme.slug}.png`,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();
  if (error) throw error;

  const { error: contentError } = await db.from("bill_contents").upsert(
    (["normal", "hard"] as const).map((difficulty_level) => ({
      bill_id: row.id,
      difficulty_level,
      title: bill.name,
      summary: bill.summary,
      content: bill.content,
    })),
    { onConflict: "bill_id,difficulty_level" }
  );
  if (contentError) throw contentError;

  // テーマのタグは付け直す（判定ルールを変えたときに古いタグが残らないように）
  const tagId = opts.tagIds.get(theme.label);
  await db.from("bills_tags").delete().eq("bill_id", row.id);
  if (tagId) {
    const { error: tagError } = await db.from("bills_tags").insert({ bill_id: row.id, tag_id: tagId });
    if (tagError) throw tagError;
  }
}

/** 審議結果 PDF を読み、議案ごとの登録内容を作る */
async function recordsFromResults(session: SessionPage, sessionUrl: string, pdfUrl: string): Promise<BillRecord[]> {
  const pages = await loadPdfPages(await fetchBytes(pdfUrl));
  const rows: ResultRow[] = [];
  let factions: Faction[] = [];
  for (const [i, page] of pages.entries()) {
    try {
      // 罫線のない PDF は文字の位置だけで読む
      const hasRules = page.rules.horizontal.length >= 3 && page.rules.vertical.length >= 3;
      const table = hasRules ? parseResultsTable(page.items, page.rules) : parseResultsTableByText(page.items);
      if (factions.length === 0) factions = table.factions;
      rows.push(...table.rows);
    } catch (e) {
      console.warn(`⚠️  PDF ${i + 1} ページ目を読めませんでした: ${e instanceof Error ? e.message : e}`);
    }
  }

  const { matched, unmatchedRows } = matchBills(session.bills, rows);
  console.log(`🔗 PDF ${rows.length} 行のうち ${matched.length} 件を議案と対応づけました`);
  for (const r of unmatchedRows) console.warn(`⚠️  対応する議案が見つからない行: ${r.name}`);
  const missing = session.bills.filter((b) => !matched.some((m) => m.label === b.label));
  for (const b of missing) console.warn(`⚠️  PDF に見つからない議案: ${b.label} ${b.name}`);

  const nameCounts = new Map<string, number>();
  for (const b of matched) nameCounts.set(b.name, (nameCounts.get(b.name) ?? 0) + 1);
  const records: BillRecord[] = [];
  for (const bill of matched) {
    const status = toBillStatus(bill.result.result);
    if (!status) {
      console.warn(`⚠️  議決結果「${bill.result.result}」を判定できないためスキップ: ${bill.label}`);
      continue;
    }
    const name = billDisplayName(bill, (nameCounts.get(bill.name) ?? 0) > 1);
    records.push({
      slug: billSlug(session, bill),
      name,
      kind: bill.kind,
      label: bill.label,
      status,
      featured: isSplitVote(bill),
      summary: shortSummary(bill.result.summary) || name,
      content: buildContent(session, sessionUrl, bill, factions),
    });
  }
  return records;
}

/** 会期中で審議結果がまだ出ていない議案を「審議中」として登録する内容 */
function pendingRecords(session: SessionPage, sessionUrl: string): BillRecord[] {
  return session.bills.map((bill) => ({
    slug: billSlug(session, bill),
    name: bill.name,
    kind: bill.kind,
    label: bill.label,
    status: "in_originating_house" as const,
    featured: false,
    summary: `${session.title}で審議中の議案です（${bill.label}）`,
    content: buildPendingContent(session, sessionUrl, bill),
  }));
}

async function importSession(sessionUrl: string, opts: Options): Promise<Outcome> {
  const html = await fetchText(sessionUrl);
  let session: SessionPage;
  try {
    session = parseSessionPage(html, sessionUrl);
  } catch (e) {
    // 平成の会期など、形式が異なるページ
    return { status: "skipped", reason: e instanceof Error ? e.message : String(e) };
  }
  if (session.reiwaYear < opts.sinceReiwa) return { status: "skipped", reason: `${session.title} は対象期間外` };
  console.log(`📅 ${session.title}（${session.startDate}〜${session.endDate}）議案 ${session.bills.length} 件`);

  const active = isSessionActive(session, opts.today);
  let records: BillRecord[];
  if (session.resultsPdfUrl) {
    records = await recordsFromResults(session, sessionUrl, session.resultsPdfUrl);
  } else if (active) {
    console.log("🕒 審議結果は未公開のため、審議中として取り込みます");
    records = pendingRecords(session, sessionUrl);
  } else {
    return { status: "skipped", reason: "「議案の概要と審議結果」PDF が未掲載" };
  }

  if (!opts.db) {
    for (const r of records) console.log(`  ${r.label} ${r.status}${r.featured ? " ★賛否が分かれた" : ""} ${r.name}`);
    return { status: "imported", count: records.length };
  }

  const { data: dietSession, error: sessionError } = await opts.db
    .from("diet_sessions")
    .upsert(
      {
        slug: sessionSlug(session),
        name: session.title,
        start_date: session.startDate,
        end_date: session.endDate,
        shugiin_url: sessionUrl,
        is_active: active,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();
  if (sessionError) throw sessionError;

  for (const record of records) {
    await upsertBill(opts.db, opts, dietSession.id, session, sessionUrl, record);
  }
  console.log(`✅ ${records.length} 件を取り込みました`);
  return { status: "imported", count: records.length };
}

async function main() {
  const args = process.argv.slice(2);
  const sinceIdx = args.indexOf("--since-reiwa");
  const dryRun = args.includes("--dry-run");
  const db = dryRun ? null : createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
  const opts: Options = {
    sinceReiwa: sinceIdx >= 0 ? Number(args[sinceIdx + 1]) : 1,
    db,
    today: todayInJapan(),
    tagIds: db ? await ensureThemeTags(db) : new Map(),
  };

  const urls = args.includes("--all")
    ? extractSessionLinks(await fetchText(SESSION_INDEX_URL), SESSION_INDEX_URL)
    : args.filter((a) => a.startsWith("http"));
  if (urls.length === 0) {
    console.error("会期ページの URL か --all を指定してください");
    process.exit(1);
  }

  let total = 0;
  const failures: string[] = [];
  // 一覧は新しい順。令和の会期名が読めないページ（平成）が続いたら打ち切る
  let consecutiveOld = 0;
  for (const url of urls) {
    if (consecutiveOld >= 3) {
      console.log("⏹️  平成の会期に達したため終了します");
      break;
    }
    try {
      const outcome = await importSession(url, opts);
      if (outcome.status === "skipped") console.log(`⏭️  スキップ: ${outcome.reason}（${url}）`);
      consecutiveOld = outcome.reason?.startsWith("会期名") ? consecutiveOld + 1 : 0;
      total += outcome.count ?? 0;
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      console.error(`❌ ${url}: ${message}`);
      failures.push(url);
    }
  }
  console.log(`\n🎉 合計 ${total} 件${dryRun ? "（確認のみ）" : "を取り込みました"}。失敗 ${failures.length} 件`);
  for (const f of failures) console.log(`  - ${f}`);
  if (!dryRun) await revalidateWebCache();
}

/** 画面のキャッシュ（最大10分）を消して、取り込んだ内容をすぐ表示させる */
async function revalidateWebCache() {
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!webUrl || !secret) return;
  try {
    const res = await fetch(new URL("/api/revalidate", webUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    console.log(res.ok ? "🧹 画面のキャッシュを更新しました" : `⚠️  キャッシュの更新に失敗しました (${res.status})`);
  } catch {
    console.warn("⚠️  Web サーバーに接続できないため、キャッシュは更新していません");
  }
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
