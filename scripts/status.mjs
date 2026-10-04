// 引き継ぎ用の短い現状表示（読み取りだけ。何も書きかえない）。
//
// 使い方:
//   pnpm status            git・マイグレーション・開発用 DB の適用状況・release と check の記録を表示する
//   pnpm status -- --no-db 開発用 DB への問い合わせ（数秒かかる）を省く
//
// 開発用 DB は `npx supabase migration list --linked` で読む（リンク先が .env.supabase-dev と同じときだけ）。
// 失敗しても（一時停止中など）ほかの表示は続ける。

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "./lib/args.mjs";
import { CHECK_STATE_PATH, checkStatusNow } from "./lib/check-steps.mjs";
import { CACHE_DIR, git, readEnvFile, readJson, ROOT, runQuiet } from "./lib/io.mjs";
import { parseMigrationList, RELEASE_STEPS } from "./lib/release-plan.mjs";
import { shortTime } from "./lib/steps.mjs";
import { padEnd } from "./lib/summarize.mjs";

const { flags } = parseArgs(process.argv.slice(2));
const out = [];
const add = (label, text) => out.push(`${padEnd(label, 13)} ${text}`);

// git
const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]) ?? "不明";
const head = git(["log", "-1", "--format=%h %s"]) ?? "";
const counts = git(["rev-list", "--left-right", "--count", "HEAD...origin/develop"]);
const [ahead, behind] = counts ? counts.split(/\s+/).map(Number) : [null, null];
add("ブランチ", `${branch}  ${head.slice(0, 60)}`);
add(
  "origin",
  ahead === null
    ? "origin/develop と比べられません"
    : ahead === 0 && behind === 0
      ? "origin/develop と一致（最後に fetch した時点）"
      : `未 push ${ahead} コミット / 遅れ ${behind} コミット`
);
const dirty = (git(["status", "--porcelain"]) ?? "").split("\n").filter(Boolean);
add(
  "未コミット",
  dirty.length
    ? `${dirty.length} 件（${dirty.slice(0, 3).map((l) => l.slice(3)).join(", ")}${dirty.length > 3 ? " …" : ""}）`
    : "なし"
);
const worktrees = (git(["worktree", "list", "--porcelain"]) ?? "")
  .split("\n\n")
  .slice(1)
  .map((block) => ({
    path: block.match(/^worktree (.+)$/m)?.[1] ?? "",
    branch: block.match(/^branch refs\/heads\/(.+)$/m)?.[1] ?? "detached",
  }));
add(
  "ワークツリー",
  worktrees.length
    ? worktrees.map((w) => `${w.path.split(/[\\/]/).at(-1)}[${w.branch}]`).join(", ")
    : "なし"
);

// マイグレーション
const migrations = readdirSync(join(ROOT, "supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();
add(
  "マイグレ",
  `${migrations.length} 本。最新: ${migrations
    .slice(-2)
    .map((f) => f.replace(/\.sql$/, ""))
    .join(", ")}`
);

// 開発用 DB の適用状況（読み取りだけ）
if (flags.has("--no-db")) add("開発用DB", "省略（--no-db）");
else {
  const dev = await readEnvFile(".env.supabase-dev");
  const refPath = join(ROOT, "supabase/.temp/project-ref");
  const linked = existsSync(refPath) ? readFileSync(refPath, "utf8").trim() : null;
  if (!dev?.SUPABASE_PROJECT_REF) add("開発用DB", ".env.supabase-dev がないため確認できません");
  else if (linked !== dev.SUPABASE_PROJECT_REF) add("開発用DB", "リポジトリのリンク先が開発用ではないため確認しません");
  else {
    const r = runQuiet("npx", ["supabase", "migration", "list", "--linked"], {
      env: { SUPABASE_DB_PASSWORD: dev.SUPABASE_DB_PASSWORD ?? "" },
      timeout: 90_000,
    });
    const parsed = r.code === 0 ? parseMigrationList(r.stdout) : null;
    if (!parsed) add("開発用DB", "確認できませんでした（一時停止中・ネットワーク・ログインを確認）");
    else
      add(
        "開発用DB",
        `適用済み ${parsed.applied} 本 / 未適用 ${parsed.pending.length} 本${
          parsed.pending.length ? `（${parsed.pending.slice(0, 3).join(", ")}）` : ""
        }${parsed.remoteOnly.length ? ` / DB にだけある ${parsed.remoteOnly.length} 本` : ""}`
      );
  }
}

// 解説の材料（git 管理外）
const materials = join(ROOT, ".materials");
add(
  ".materials",
  existsSync(materials)
    ? `あり（${readdirSync(materials).filter((d) => !d.startsWith(".")).length} 会期）`
    : `なし（pnpm explainers:check と release の explainers が失敗します）${(() => {
        const found = worktrees.find((w) => existsSync(join(w.path, ".materials")));
        return found ? `。${found.path.split(/[\\/]/).at(-1)}/.materials にあります` : "";
      })()}`
);

// release の記録
for (const env of ["dev", "prod"]) {
  const state = readJson(join(CACHE_DIR, `release-${env}.json`), null);
  const steps = RELEASE_STEPS.filter((s) => s.envs.includes(env));
  if (!state?.steps) {
    add(`release ${env}`, "記録なし");
    continue;
  }
  // 飛ばしただけの記録（開発サーバーが止まっていた smoke など）は成功に数えない
  const done = steps.filter((s) => state.steps[s.id]?.ok && !state.steps[s.id].skipped);
  const skipped = steps.filter((s) => state.steps[s.id]?.skipped);
  const failed = steps.find((s) => state.steps[s.id] && !state.steps[s.id].ok);
  const next = failed ?? steps.find((s) => !state.steps[s.id]);
  const lastAt = Object.values(state.steps)
    .map((s) => s.at)
    .sort()
    .at(-1);
  add(
    `release ${env}`,
    `${done.length}/${steps.length} 工程が成功${
      skipped.length ? `・飛ばした ${skipped.map((s) => s.id).join(", ")}` : ""
    }（最後 ${shortTime(lastAt)}）${
      failed ? `、失敗: ${failed.id}` : next ? `、次: ${next.id}` : ""
    }`
  );
}

// check の記録
const checkState = readJson(CHECK_STATE_PATH, null);
if (!checkState?.lastRun) add("check", "記録なし（pnpm check）");
else {
  const { stale } = checkStatusNow(ROOT);
  add(
    "check",
    `最後 ${shortTime(checkState.lastRun.at)}（${checkState.lastRun.head}）。${
      stale.length ? `やり直しが必要: ${stale.join(", ")}` : "今の状態で全工程 OK"
    }`
  );
}

console.log(out.join("\n"));
