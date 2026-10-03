/**
 * 議案への会派ごとの賛否を、審議結果 PDF から bill_faction_votes に取り込む
 *
 * 使い方（議案は ingest で取り込み済みであること）:
 *   pnpm --filter @mirai-gikai/shinjuku-importer faction-votes <会期ページのURL>... [--dry-run]
 *   pnpm --filter @mirai-gikai/shinjuku-importer faction-votes --all [--dry-run]
 */
import { billSlug } from "./build-content";
import { createDb, errorMessage, revalidateWebCache, sessionUrlsFromArgs } from "./cli-helpers";
import { findKnownFactionSlug } from "./data/factions";
import { buildFactionVotes, replaceBillFactionVotes } from "./faction-votes";
import { readSessionResults } from "./session-results";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const db = createDb(dryRun);
  const urls = await sessionUrlsFromArgs(args);
  if (urls.length === 0) {
    console.error("会期ページの URL か --all を指定してください");
    process.exit(1);
  }

  let billCount = 0;
  let rowCount = 0;
  const failures: string[] = [];
  const missingBills: string[] = [];
  const unresolved = new Map<string, number>();
  const legend = new Map<string, Set<string>>();
  let consecutiveOld = 0;
  for (const url of urls) {
    if (consecutiveOld >= 3) {
      console.log("⏹️  平成の会期に達したため終了します");
      break;
    }
    try {
      const results = await readSessionResults(url);
      consecutiveOld = 0;
      if (!results) {
        console.log(`⏭️  スキップ: 「議案の概要と審議結果」PDF が未掲載（${url}）`);
        continue;
      }
      const { session, factions, matched, warnings } = results;
      for (const w of warnings) console.warn(`⚠️  ${w}`);
      if (factions.length === 0) {
        console.warn(`⚠️  ${session.title}: 会派の見出しが読めないため、賛否を書き換えません`);
        failures.push(url);
        continue;
      }
      for (const f of factions) {
        const abbrs = legend.get(f.name) ?? new Set<string>();
        abbrs.add(f.abbr);
        legend.set(f.name, abbrs);
      }

      const slugs = matched.map((b) => billSlug(session, b));
      const billIds = new Map<string, string>();
      if (db) {
        const { data, error } = await db.from("bills").select("id, slug").in("slug", slugs);
        if (error) throw error;
        for (const b of data) if (b.slug) billIds.set(b.slug, b.id);
      }

      let sessionRows = 0;
      for (const [k, bill] of matched.entries()) {
        const votes = buildFactionVotes(bill.result, factions);
        if (db) {
          const billId = billIds.get(slugs[k]);
          if (!billId) {
            missingBills.push(slugs[k]);
            continue;
          }
          for (const name of await replaceBillFactionVotes(db, billId, votes)) {
            unresolved.set(name, (unresolved.get(name) ?? 0) + 1);
          }
        } else {
          for (const v of votes) {
            if (!findKnownFactionSlug(v.factionName)) unresolved.set(v.factionName, (unresolved.get(v.factionName) ?? 0) + 1);
          }
        }
        billCount++;
        sessionRows += votes.length;
      }
      rowCount += sessionRows;
      console.log(`✅ ${session.title}: 議案 ${matched.length} 件・会派 ${factions.length}（${factions.map((f) => f.abbr).join("・")}）・${sessionRows} 行`);
    } catch (e) {
      const message = errorMessage(e);
      if (message.startsWith("会期名")) {
        consecutiveOld++;
        console.log(`⏭️  スキップ: ${message}（${url}）`);
        continue;
      }
      console.error(`❌ ${url}: ${message}`);
      failures.push(url);
    }
  }

  console.log(`\n🎉 議案 ${billCount} 件・${rowCount} 行${dryRun ? "（確認のみ）" : "を取り込みました"}。失敗 ${failures.length} 件`);
  for (const f of failures) console.log(`  - ${f}`);
  if (missingBills.length > 0) {
    console.log(`⚠️  DB に無い議案 ${missingBills.length} 件（先に ingest を実行してください）: ${missingBills.slice(0, 10).join(", ")}`);
  }
  console.log("📖 凡例の会派名（略称）:");
  for (const [name, abbrs] of legend) console.log(`  ${name}（${[...abbrs].join("・")}）`);
  if (unresolved.size > 0) {
    console.log("⚠️  会派の一覧（src/data/factions.ts）で引けなかった名前（会派は空のまま）:");
    for (const [name, n] of unresolved) console.log(`  ${name}: ${n} 行`);
  }
  if (!dryRun) await revalidateWebCache();
}

main().catch((e) => {
  console.error("❌", errorMessage(e));
  process.exit(1);
});
