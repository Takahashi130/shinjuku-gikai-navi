/**
 * 新宿区議会ナビの運営コマンド（区のサイトを読む importer とは分ける）
 *
 *   pnpm --filter @mirai-gikai/navi-ops explainers:check [--session <会期slug>] [<ファイル>...]
 *     explainers/**\/*.json をスキーマと材料（.materials/）で検査する。error があれば終了コード 1
 *   pnpm --filter @mirai-gikai/navi-ops explainers:sync [--session <会期slug>] [--dry-run] [--env dev|prod]
 *     検査を通った解説を bill_explainers に upsert する（既定は開発用。--env prod は毎回確認する）
 *   pnpm --filter @mirai-gikai/navi-ops explainers:status [--session <会期slug>] [--env dev|prod]
 *     会期の議案ごとに、解説ファイル・材料・DB・画面での見え方を並べる
 *   pnpm --filter @mirai-gikai/navi-ops polls:set-close <議案slug>... (--at <日時> | --early) [--force] [--dry-run] [--env dev|prod]
 *     「議決」の投票の締切を手で決める（closes_at_source = 'manual'。取り込みでは変わらない）。
 *     --early は締切を議案の会期の先議の予定（diet_sessions.early_vote_at）にする（先議で採決する議案）。
 *     --at は会期ページに採決の時刻が無い会期などで使う。採決前・後の区分が入れ替わる票があれば --force が要る
 *   pnpm --filter @mirai-gikai/navi-ops polls:hide <議案slug>... [--unhide] [--dry-run] [--env dev|prod]
 *     投票の回を非表示にする（集計と結果の表示から外す。本人は自分の票を取り消せる）。--unhide で戻す
 */
import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import type { ExplainerFile } from "@mirai-gikai/shared/bill-explainer/schema";
import type { ExplainerIssue } from "@mirai-gikai/shared/bill-explainer/validate-explainer";
import { hasErrors } from "@mirai-gikai/shared/bill-explainer/validate-explainer";
import type { Database } from "@mirai-gikai/supabase";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildExplainerRow,
  type ExistingExplainer,
} from "./build-explainer-row";
import {
  buildStatusRows,
  compareBillSlugs,
  type StatusRow,
  statusRowLabel,
} from "./build-status-rows";
import { checkExplainerFile } from "./check-explainer-file";
import { explainerContentHash } from "./content-hash";
import {
  parseDotenv,
  resolveSupabaseTarget,
  type SupabaseTarget,
  type TargetEnv,
} from "./env";
import {
  type ExplainerFileEntry,
  listExplainerFiles,
  listMaterialSlugs,
  readMaterialText,
} from "./explainer-files";
import { REPO_ROOT } from "./paths";
import {
  checkCloseFlags,
  planCloseChange,
  reclassifiedRange,
  resolveCloseTarget,
} from "./poll-close";

type Db = SupabaseClient<Database>;

type Args = {
  command: string;
  flags: Map<string, string | true>;
  positional: string[];
};

function parseArgs(argv: string[]): Args {
  const [command = "", ...rest] = argv;
  const flags = new Map<string, string | true>();
  const positional: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith("--")) {
      const next = rest[i + 1];
      if (
        next !== undefined &&
        !next.startsWith("--") &&
        ["--env", "--session", "--at"].includes(a)
      ) {
        flags.set(a, next);
        i++;
      } else flags.set(a, true);
    } else positional.push(a);
  }
  return { command, flags, positional };
}

function readDotenvFile(name: string): Record<string, string> | null {
  const path = join(REPO_ROOT, name);
  return existsSync(path) ? parseDotenv(readFileSync(path, "utf8")) : null;
}

function loadTarget(env: TargetEnv): SupabaseTarget {
  return resolveSupabaseTarget(env, {
    dotenv: readDotenvFile(".env") ?? {},
    dev: readDotenvFile(".env.supabase-dev"),
    prod: readDotenvFile(".env.supabase-prod"),
  });
}

function envFlag(args: Args): TargetEnv {
  const v = args.flags.get("--env");
  if (v === undefined) return "dev";
  if (v === "dev" || v === "prod") return v;
  throw new Error("--env は dev か prod を指定してください");
}

/** 本番に書き込む前の確認（毎回） */
async function confirmProd(target: SupabaseTarget, args: Args): Promise<void> {
  if (target.env !== "prod") return;
  if (args.flags.get("--confirm-prod") === true) return;
  if (!process.stdin.isTTY) {
    throw new Error(
      "本番（--env prod）への書き込みは、対話で確認するか --confirm-prod を付けて実行してください"
    );
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `⚠️  本番（${target.label}）に書き込みます。続けるには prod と入力してください: `
  );
  rl.close();
  if (answer.trim() !== "prod") throw new Error("中止しました");
}

function selectFiles(args: Args): ExplainerFileEntry[] {
  const session =
    typeof args.flags.get("--session") === "string"
      ? (args.flags.get("--session") as string)
      : undefined;
  const all = listExplainerFiles(session);
  if (args.positional.length === 0) return all;
  const wanted = new Set(
    args.positional.map((p) =>
      relative(REPO_ROOT, resolve(p)).split("\\").join("/")
    )
  );
  const bySlug = new Set(args.positional);
  return all.filter((f) => wanted.has(f.relPath) || bySlug.has(f.billSlug));
}

type CheckedFile = {
  entry: ExplainerFileEntry;
  file: ExplainerFile | null;
  issues: ExplainerIssue[];
};

function checkFiles(entries: ExplainerFileEntry[]): CheckedFile[] {
  return entries.map((entry) => {
    const { file, issues } = checkExplainerFile({
      relPath: entry.relPath,
      text: readFileSync(entry.absPath, "utf8"),
      materialText: readMaterialText(entry.sessionSlug, entry.billSlug),
    });
    return { entry, file, issues };
  });
}

function printIssues(checked: CheckedFile[]): void {
  for (const { entry, issues } of checked) {
    const errors = issues.filter((i) => i.severity === "error").length;
    const warnings = issues.length - errors;
    console.log(
      `${errors > 0 ? "❌" : warnings > 0 ? "⚠️ " : "✅"} ${entry.relPath}${errors || warnings ? `（error ${errors} / warning ${warnings}）` : ""}`
    );
    for (const i of issues) {
      console.log(
        `    ${i.severity === "error" ? "error  " : "warning"} ${i.path ? `[${i.path}] ` : ""}${i.message}`
      );
    }
  }
}

async function commandCheck(args: Args): Promise<number> {
  const entries = selectFiles(args);
  if (entries.length === 0) {
    console.log(
      "検査する解説がありません（explainers/<会期slug>/<議案slug>.json）"
    );
    return 0;
  }
  const checked = checkFiles(entries);
  printIssues(checked);
  const failed = checked.filter((c) => hasErrors(c.issues)).length;
  console.log(
    `\n${checked.length} 件を検査しました。error のあるファイル ${failed} 件`
  );
  return failed > 0 ? 1 : 0;
}

async function revalidateWebCache(target: SupabaseTarget): Promise<void> {
  if (!target.webUrl || !target.revalidateSecret) return;
  try {
    const res = await fetch(new URL("/api/revalidate", target.webUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${target.revalidateSecret}` },
    });
    console.log(
      res.ok
        ? "🧹 画面のキャッシュを更新しました"
        : `⚠️  キャッシュの更新に失敗しました (${res.status})`
    );
  } catch {
    console.warn(
      "⚠️  Web サーバーに接続できないため、キャッシュは更新していません"
    );
  }
}

async function commandSync(args: Args): Promise<number> {
  const dryRun = args.flags.get("--dry-run") === true;
  const target = loadTarget(envFlag(args));
  const entries = selectFiles(args);
  if (entries.length === 0) {
    console.log("同期する解説がありません");
    return 0;
  }
  const checked = checkFiles(entries);
  const blocked = checked.filter((c) => !c.file || hasErrors(c.issues));
  if (blocked.length > 0) {
    printIssues(blocked);
    console.log(`\n❌ 検査で error のある ${blocked.length} 件は同期しません`);
  }
  const ready = checked.filter(
    (c): c is CheckedFile & { file: ExplainerFile } =>
      !!c.file && !hasErrors(c.issues)
  );
  if (ready.length === 0) return blocked.length > 0 ? 1 : 0;

  console.log(
    `🎯 書き込み先: ${target.env === "prod" ? "本番" : "開発用"}（${target.label}）${dryRun ? "【確認のみ】" : ""}`
  );
  if (!dryRun) await confirmProd(target, args);
  const db: Db = createClient<Database>(target.url, target.secretKey);

  const slugs = ready.map((c) => c.file.billSlug);
  const { data: bills, error: billsError } = await db
    .from("bills")
    .select("id, slug")
    .in("slug", slugs);
  if (billsError) throw billsError;
  const billIdBySlug = new Map(bills.map((b) => [b.slug, b.id]));
  const billIds = bills.map((b) => b.id);
  const { data: existingRows, error: existingError } = billIds.length
    ? await db
        .from("bill_explainers")
        .select(
          "bill_id, status, version, content_hash, reviewed_at, publish_at, first_published_at"
        )
        .in("bill_id", billIds)
    : { data: [], error: null };
  if (existingError) throw existingError;
  const existingByBill = new Map<string, ExistingExplainer>(
    existingRows.map((r) => [r.bill_id, r])
  );

  let failures = blocked.length;
  let written = 0;
  const now = new Date();
  for (const { entry, file } of ready) {
    const billId = billIdBySlug.get(file.billSlug);
    if (!billId) {
      console.log(
        `❌ ${entry.relPath}: 議案 ${file.billSlug} が DB にありません（先に ingest を実行）`
      );
      failures++;
      continue;
    }
    const plan = buildExplainerRow({
      file,
      billId,
      sourcePath: entry.relPath,
      contentHash: explainerContentHash(file),
      existing: existingByBill.get(billId) ?? null,
      now,
    });
    if (!plan.ok) {
      console.log(`❌ ${entry.relPath}: ${plan.reason}`);
      failures++;
      continue;
    }
    const label = `${file.billLabel} ${file.status} v${file.version}`;
    if (plan.action === "unchanged") {
      console.log(`＝ ${label}（変更なし）`);
      continue;
    }
    if (dryRun) {
      console.log(
        `… ${label}（${plan.action === "insert" ? "追加" : "更新"}予定）`
      );
      continue;
    }
    const { error } = await db
      .from("bill_explainers")
      .upsert(plan.row, { onConflict: "bill_id" });
    if (error) {
      console.log(`❌ ${entry.relPath}: ${error.message}`);
      failures++;
      continue;
    }
    written++;
    console.log(`✅ ${label}（${plan.action === "insert" ? "追加" : "更新"}）`);
  }
  console.log(`\n${written} 件を書き込みました。失敗 ${failures} 件`);
  if (written > 0) await revalidateWebCache(target);
  return failures > 0 ? 1 : 0;
}

async function commandStatus(args: Args): Promise<number> {
  const target = loadTarget(envFlag(args));
  const db: Db = createClient<Database>(target.url, target.secretKey);
  const sessionFlag = args.flags.get("--session");

  const sessionQuery = db
    .from("diet_sessions")
    .select("id, slug, name, final_vote_at, end_date, is_active");
  const { data: sessions, error: sessionError } =
    typeof sessionFlag === "string"
      ? await sessionQuery.eq("slug", sessionFlag)
      : await sessionQuery
          .order("is_active", { ascending: false })
          .order("start_date", { ascending: false })
          .limit(1);
  if (sessionError) throw sessionError;
  const session = sessions[0];
  if (!session?.slug) {
    console.log("会期が見つかりません（--session <会期slug> で指定できます）");
    return 1;
  }

  const { data: bills, error: billsError } = await db
    .from("bills")
    .select("id, slug, name")
    .eq("diet_session_id", session.id);
  if (billsError) throw billsError;
  const ids = bills.map((b) => b.id);
  const { data: explainers, error: explainersError } = ids.length
    ? await db
        .from("bill_explainers")
        .select("bill_id, status, version, reviewed_at, publish_at")
        .in("bill_id", ids)
    : { data: [], error: null };
  if (explainersError) throw explainersError;
  const slugById = new Map(bills.map((b) => [b.id, b.slug]));
  const dbBySlug = new Map(
    explainers.flatMap((e) => {
      const slug = slugById.get(e.bill_id);
      if (!slug) return [];
      const status = e.status as "draft" | "published" | "withdrawn";
      return [
        [
          slug,
          {
            status,
            version: e.version,
            reviewedAt: e.reviewed_at,
            publishAt: e.publish_at,
          },
        ] as const,
      ];
    })
  );

  const files = new Map<string, StatusRow["file"]>();
  for (const c of checkFiles(listExplainerFiles(session.slug))) {
    const errors = c.issues.filter((i) => i.severity === "error").length;
    files.set(c.entry.billSlug, {
      status: c.file?.status ?? "（読めない）",
      version: c.file?.version ?? 0,
      errors,
      warnings: c.issues.length - errors,
    });
  }

  const voteAt = session.final_vote_at ?? `${session.end_date}T14:00:00+09:00`;
  const rows = buildStatusRows({
    bills: [...bills].sort((a, b) =>
      compareBillSlugs(a.slug ?? "", b.slug ?? "")
    ),
    files,
    materials: listMaterialSlugs(session.slug),
    db: dbBySlug,
    voteAt,
    now: new Date(),
  });

  console.log(
    `📅 ${session.name}（${session.slug}）採決予定 ${voteAt}｜${target.env === "prod" ? "本番" : "開発用"}（${target.label}）\n`
  );
  for (const r of rows) {
    const file = r.file
      ? `ファイル ${r.file.status} v${r.file.version}${r.file.errors ? ` error ${r.file.errors}` : ""}`
      : "ファイルなし";
    const dbText = r.db ? `DB ${r.db.status} v${r.db.version}` : "DB なし";
    console.log(
      `${r.slug.padEnd(26)} ${statusRowLabel(r).padEnd(12)} ${r.hasMaterial ? "材料あり" : "材料なし"}  ${file}  ${dbText}${r.needsSync ? "  ← 同期が必要" : ""}  ${r.name}`
    );
  }
  const count = (state: string) =>
    rows.filter((r) => r.readiness.state === state).length;
  const preparingWithDraft = rows.filter(
    (r) => r.readiness.state === "preparing" && r.hasDraft
  ).length;
  console.log(
    `\n議案 ${rows.length} 件：公開中 ${count("available")}・予約 ${count("scheduled")}・準備中 ${preparingWithDraft}・まだありません ${count("preparing") - preparingWithDraft}・対象外 ${count("not_applicable")}・その他 ${count("not_available")}`
  );
  return 0;
}

type DecisionPollRow = {
  id: string;
  bill_id: string | null;
  closes_at: string | null;
  closes_at_source: string;
  is_hidden: boolean;
};

type FoundPoll = {
  slug: string;
  poll: DecisionPollRow;
  /** 議案の会期の先議の予定（無ければ null） */
  earlyVoteAt: string | null;
};

/** 議案 slug から「議決」の投票の回を引く（見つからない slug は表示して数える） */
async function findDecisionPollsBySlugs(
  db: Db,
  slugs: string[]
): Promise<{
  found: FoundPoll[];
  missing: string[];
}> {
  const { data: bills, error: billsError } = await db
    .from("bills")
    .select("id, slug, diet_sessions(early_vote_at)")
    .in("slug", slugs);
  if (billsError) throw billsError;
  const slugById = new Map(bills.map((b) => [b.id, b.slug ?? ""]));
  const earlyVoteAtById = new Map(
    bills.map((b) => [b.id, b.diet_sessions?.early_vote_at ?? null])
  );
  const { data: polls, error: pollsError } = bills.length
    ? await db
        .from("polls")
        .select("id, bill_id, closes_at, closes_at_source, is_hidden")
        .in(
          "bill_id",
          bills.map((b) => b.id)
        )
        .eq("kind", "decision")
        .eq("round", 0)
    : { data: [], error: null };
  if (pollsError) throw pollsError;
  const found = polls.flatMap((poll) => {
    const slug = poll.bill_id ? slugById.get(poll.bill_id) : undefined;
    if (!slug || !poll.bill_id) return [];
    return [
      { slug, poll, earlyVoteAt: earlyVoteAtById.get(poll.bill_id) ?? null },
    ];
  });
  const foundSlugs = new Set(found.map((f) => f.slug));
  return { found, missing: slugs.filter((s) => !foundSlugs.has(s)) };
}

async function countResponses(
  db: Db,
  pollId: string,
  range?: { gte: string; lt: string | null }
): Promise<number> {
  let query = db
    .from("poll_responses")
    .select("id", { count: "exact", head: true })
    .eq("poll_id", pollId);
  if (range) {
    query = query.gte("responded_at", range.gte);
    if (range.lt) query = query.lt("responded_at", range.lt);
  }
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function commandPollsSetClose(args: Args): Promise<number> {
  const atFlag = args.flags.get("--at");
  const at = typeof atFlag === "string" ? atFlag : undefined;
  const early = args.flags.get("--early") === true;
  // 指定の誤りは、書き込み先に接続する前に止める（--early の日時は議案ごとに決まる）
  const flags = checkCloseFlags({ at, early });
  if (!flags.ok) {
    console.error(flags.reason);
    return 1;
  }
  if (args.positional.length === 0) {
    console.error("締切を直す議案の slug を指定してください");
    return 1;
  }
  const dryRun = args.flags.get("--dry-run") === true;
  const force = args.flags.get("--force") === true;
  const target = loadTarget(envFlag(args));
  console.log(
    `🎯 書き込み先: ${target.env === "prod" ? "本番" : "開発用"}（${target.label}）${dryRun ? "【確認のみ】" : ""}`
  );
  if (!dryRun) await confirmProd(target, args);
  const db: Db = createClient<Database>(target.url, target.secretKey);

  const { found, missing } = await findDecisionPollsBySlugs(
    db,
    args.positional
  );
  let failures = missing.length;
  for (const slug of missing) {
    console.log(`❌ ${slug}: 議案か「議決」の投票の回がありません`);
  }
  let written = 0;
  for (const { slug, poll, earlyVoteAt } of found) {
    const parsed = resolveCloseTarget({ at, early, earlyVoteAt });
    if (!parsed.ok) {
      console.log(`❌ ${slug}: ${parsed.reason}`);
      failures++;
      continue;
    }
    const range = reclassifiedRange(poll.closes_at, parsed.iso);
    const plan = planCloseChange({
      current: poll.closes_at,
      currentSource: poll.closes_at_source,
      next: parsed.iso,
      reclassifiedVotes: range ? await countResponses(db, poll.id, range) : 0,
      force,
    });
    const label = `${slug}（今の締切 ${poll.closes_at ?? "なし"}・${poll.closes_at_source} → ${parsed.iso}・manual）`;
    if (plan.action === "unchanged") {
      console.log(`＝ ${label}（変更なし）`);
      continue;
    }
    if (plan.action === "blocked") {
      console.log(`❌ ${label}: ${plan.reason}`);
      failures++;
      continue;
    }
    if (dryRun) {
      console.log(`… ${label}（更新予定）${plan.note ? ` ⚠️  ${plan.note}` : ""}`);
      continue;
    }
    const { error } = await db
      .from("polls")
      .update({ closes_at: parsed.iso, closes_at_source: "manual" })
      .eq("id", poll.id);
    if (error) {
      console.log(`❌ ${slug}: ${error.message}`);
      failures++;
      continue;
    }
    written++;
    console.log(`✅ ${label}${plan.note ? ` ⚠️  ${plan.note}` : ""}`);
  }
  console.log(`\n${written} 件を書き込みました。失敗 ${failures} 件`);
  if (written > 0) await revalidateWebCache(target);
  return failures > 0 ? 1 : 0;
}

async function commandPollsHide(args: Args): Promise<number> {
  if (args.positional.length === 0) {
    console.error("非表示にする議案の slug を指定してください");
    return 1;
  }
  const hide = args.flags.get("--unhide") !== true;
  const dryRun = args.flags.get("--dry-run") === true;
  const target = loadTarget(envFlag(args));
  console.log(
    `🎯 書き込み先: ${target.env === "prod" ? "本番" : "開発用"}（${target.label}）${dryRun ? "【確認のみ】" : ""}`
  );
  if (!dryRun) await confirmProd(target, args);
  const db: Db = createClient<Database>(target.url, target.secretKey);

  const { found, missing } = await findDecisionPollsBySlugs(
    db,
    args.positional
  );
  let failures = missing.length;
  for (const slug of missing) {
    console.log(`❌ ${slug}: 議案か「議決」の投票の回がありません`);
  }
  let written = 0;
  for (const { slug, poll } of found) {
    const votes = await countResponses(db, poll.id);
    const label = `${slug}（票 ${votes} 件）`;
    if (poll.is_hidden === hide) {
      console.log(`＝ ${label}（すでに${hide ? "非表示" : "表示"}）`);
      continue;
    }
    if (dryRun) {
      console.log(`… ${label}（${hide ? "非表示" : "表示"}にする予定）`);
      continue;
    }
    const { error } = await db
      .from("polls")
      .update({ is_hidden: hide })
      .eq("id", poll.id);
    if (error) {
      console.log(`❌ ${slug}: ${error.message}`);
      failures++;
      continue;
    }
    written++;
    console.log(`✅ ${label}を${hide ? "非表示" : "表示"}にしました`);
  }
  if (hide && written > 0) {
    console.log(
      "非表示の回は集計と結果の表示から外れ、新しい票も受け付けません。投票済みの人は、議案ページから自分の票を取り消せます。"
    );
  }
  console.log(`\n${written} 件を書き込みました。失敗 ${failures} 件`);
  if (written > 0) await revalidateWebCache(target);
  return failures > 0 ? 1 : 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const commands: Record<string, (a: Args) => Promise<number>> = {
    "explainers:check": commandCheck,
    "explainers:sync": commandSync,
    "explainers:status": commandStatus,
    "polls:set-close": commandPollsSetClose,
    "polls:hide": commandPollsHide,
  };
  const run = commands[args.command];
  if (!run) {
    console.error(`使い方: ${Object.keys(commands).join(" | ")}`);
    process.exit(1);
  }
  process.exit(await run(args));
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
