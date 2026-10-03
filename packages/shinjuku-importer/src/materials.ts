/**
 * 議案の解説を書くための「材料」（区の資料から抜き出した文字）を議案ごとに保存する
 *
 * 使い方:
 *   pnpm --filter @mirai-gikai/shinjuku-importer materials <会期ページのURL> [--out <保存先>]
 *
 * 会期ページ →「議案の概要」→（一覧ページなら会期の「提出議案」ページへ）→ 提出議案ページ の順にたどり、
 * 提出案件概要・補正予算概要・議案の全文の PDF から議案ごとの文字を抜き出して
 * <リポジトリ>/.materials/<会期slug>/<議案slug>.json に保存する。
 *
 * 材料は区の文章そのものなので、リポジトリ（.gitignore 済み）にも DB にも入れない。
 * 区のサイトへのアクセスは fetch.ts（1秒以上の間隔、連絡先入り User-Agent）を使う。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { materialFileSchema } from "@mirai-gikai/shared/bill-explainer/schema";
import { sessionSlug } from "./build-content";
import { fetchBytes, fetchText } from "./fetch";
import { loadPdfPageTexts } from "./load-pdf";
import { buildMaterialFiles, type FetchedPdf } from "./map-materials";
import {
  findOverviewLink,
  findProposalPageLink,
  PROPOSAL_INDEX_URL,
  parseProposalPage,
} from "./parse-proposal-page";
import { extractScheduleLines, parseSessionPage } from "./parse-session-page";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const DEFAULT_OUT = join(REPO_ROOT, ".materials");

/** 会期の「提出議案」ページを探す。「議案の概要」が一覧ページを指す場合は、一覧から会期のページへ進む */
async function findProposalPage(sessionHtml: string, sessionUrl: string, sessionTitle: string) {
  const overviewUrl = findOverviewLink(sessionHtml, sessionUrl) ?? PROPOSAL_INDEX_URL;
  const overviewHtml = await fetchText(overviewUrl);
  const sessionPageUrl = findProposalPageLink(overviewHtml, overviewUrl, sessionTitle);
  if (sessionPageUrl) return { url: sessionPageUrl, html: await fetchText(sessionPageUrl) };
  if (parseProposalPage(overviewHtml, overviewUrl).some((l) => l.kind !== "other")) {
    return { url: overviewUrl, html: overviewHtml };
  }
  throw new Error(`「${sessionTitle}提出議案」のページが見つかりません（${overviewUrl}）`);
}

async function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf("--out");
  const outDir = outIdx >= 0 ? resolve(args[outIdx + 1]) : DEFAULT_OUT;
  const sessionUrl = args.find((a) => a.startsWith("http"));
  if (!sessionUrl) {
    console.error("会期ページの URL を指定してください");
    process.exit(1);
  }

  const sessionHtml = await fetchText(sessionUrl);
  const session = parseSessionPage(sessionHtml, sessionUrl);
  console.log(`📅 ${session.title} 議案 ${session.bills.length} 件`);

  const proposal = await findProposalPage(sessionHtml, sessionUrl, session.title);
  const links = parseProposalPage(proposal.html, proposal.url);
  console.log(`📄 提出議案ページ ${proposal.url}（PDF ${links.length} 件）`);

  const labels = new Set(session.bills.filter((b) => b.kind !== "consent" && b.kind !== "inquiry").map((b) => b.label));
  const targets = links.filter(
    (l) => l.kind === "overview" || l.kind === "budget_overview" || (l.kind === "full_text" && l.label && labels.has(l.label))
  );
  const pdfs: FetchedPdf[] = [];
  for (const link of targets) {
    try {
      const pages = await loadPdfPageTexts(await fetchBytes(link.url));
      pdfs.push({ link, pages });
      console.log(`  ✔ ${link.text}（${pages.length} ページ）`);
    } catch (e) {
      console.warn(`  ⚠️  ${link.text} を読めませんでした: ${e instanceof Error ? e.message : e}`);
    }
  }

  const { files, missing } = buildMaterialFiles({
    session,
    sessionUrl,
    scheduleLines: extractScheduleLines(sessionHtml),
    proposalPageUrl: proposal.url,
    pdfs,
    fetchedAt: new Date().toISOString(),
  });

  const dir = join(outDir, sessionSlug(session));
  mkdirSync(dir, { recursive: true });
  for (const file of files) {
    const parsed = materialFileSchema.parse(file);
    writeFileSync(join(dir, `${parsed.billSlug}.json`), `${JSON.stringify(parsed, null, 2)}\n`);
    console.log(`💾 ${parsed.billLabel} ${parsed.billSlug}: ${parsed.documents.map((d) => d.key).join(", ")}`);
  }
  for (const m of missing) console.log(`⏭️  ${m.bill.label} ${m.slug}: ${m.reason}`);
  console.log(`\n🎉 ${files.length} 件の材料を ${dir} に保存しました（材料なし ${missing.length} 件）`);
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
