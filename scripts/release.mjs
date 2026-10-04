// 開発用・本番への反映を工程に分けて行う。途中で止まっても、成功した工程は飛ばして再開できる。
//
// 使い方:
//   pnpm release -- --env dev                 計画を表示するだけ（既定。書き込まない）
//   pnpm release -- --env dev --yes           開発用に反映する
//   pnpm release -- --env prod                本番の計画を表示するだけ
//   pnpm release -- --env prod --yes --confirm-prod
//                                             本番に反映する（判断が必要：ユーザーの「本番OK」を確認してから）
//   --from <工程>   その工程から最後までやり直す（例: --from data:questions）
//   --only <工程>   その工程だけ（カンマ区切り。"data" で data:* すべて）
//                   --from / --only でも、書き込む工程を選べば preflight を、本番では env も必ず先に通す
//   --list          工程と内容の一覧
// 本番で --yes だけ（--confirm-prod なし）のときは何もせず終了コード 2 で終える。
//
// 工程: preflight → env → db → data:ingest → data:members → data:questions → data:expenses
//       → data:faction-votes → explainers → deploy（本番だけ）→ smoke
// （env を DB より前にしているのは、Vercel の変数が足りないまま DB だけ進んだ状態を作らないため）
// 定義と判断基準は scripts/lib/release-plan.mjs。記録は .cache/release-<env>.json、ログは .logs/release-<env>/。
// 飛ばす条件: 前回成功していて、入力が同じとき。
//   db = supabase/migrations、data:* = importer のコード＋日付（同じ日なら飛ばす）、
//   explainers = explainers/ と navi-ops、deploy = コミット。preflight・env・smoke は毎回。
//
// しないこと: git push、Vercel の環境変数の設定（足りなければ止まって知らせる）、
// supabase のリンク先の書き換え（本番は一時フォルダでリンクする）。

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { flagValue, parseArgs } from "./lib/args.mjs";
import { checkStatusNow } from "./lib/check-steps.mjs";
import { computeFingerprint, listRepoFiles } from "./lib/fingerprint.mjs";
import {
  CACHE_DIR,
  git,
  loadNaviOpsEnv,
  logPathFor,
  readEnvFile,
  readJson,
  rel,
  ROOT,
  runQuiet,
  runToLog,
  writeJson,
} from "./lib/io.mjs";
import {
  describeStep,
  evaluateEnv,
  evaluatePreflight,
  importerArgs,
  PUBLIC_URL,
  parseVercelEnvNames,
  planRelease,
  RELEASE_STEPS,
  restoreGitignore,
  SMOKE_PATHS,
  TARGET_LABEL,
  withGuardSteps,
} from "./lib/release-plan.mjs";
import { selectSteps, shortTime, todayInJapan } from "./lib/steps.mjs";
import { failureExcerpt, formatDuration, padEnd } from "./lib/summarize.mjs";

const { flags } = parseArgs(process.argv.slice(2), ["--env", "--from", "--only"]);
const env = flagValue(flags, "--env") ?? (flags.has("--list") ? "dev" : null);
if (env !== "dev" && env !== "prod") {
  console.error("--env dev か --env prod を指定してください（例: pnpm release -- --env dev）");
  process.exit(2);
}

if (flags.has("--list")) {
  for (const s of RELEASE_STEPS) {
    const text = s.envs.includes(env) ? describeStep(s.id, env) : `（${env} では行わない）`;
    console.log(`${padEnd(s.id, 20)} ${text}`);
  }
  process.exit(0);
}

const yes = flags.has("--yes");
const confirmProd = flags.has("--confirm-prod");
if (env === "prod" && yes && !confirmProd) {
  // 断ったことが終了コードで分かるように 2 で終える（計画は --yes を外すと見られる）
  console.error(
    "本番に書き込むには --yes に加えて --confirm-prod が必要です（ユーザーの「本番OK」の後だけ）。何も実行していません。計画は pnpm release -- --env prod で表示します。"
  );
  process.exit(2);
}
const execute = yes && (env === "dev" || confirmProd);

let selected;
try {
  selected = selectSteps(RELEASE_STEPS, {
    only: flagValue(flags, "--only"),
    from: flagValue(flags, "--from"),
  });
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
const forced = new Set(
  flags.has("--only") || flags.has("--from") ? selected.map((s) => s.id) : []
);
// --only / --from でも確認の工程は必ず先に通す（本番は preflight を常に、書き込むなら env も。
// 開発用は書き込むときに preflight）。判断の基準は release-plan.mjs の withGuardSteps
const guarded = withGuardSteps(selected, env);
selected = guarded.steps;

const statePath = join(CACHE_DIR, `release-${env}.json`);
const state = readJson(statePath, { steps: {} });
state.steps ??= {};

// ---- 工程ごとの「入力」のハッシュ（同じなら前回の成功を使い回す） ----
const files = listRepoFiles(ROOT);
const fp = (patterns, extra) => computeFingerprint(ROOT, patterns, extra, files);
const fingerprints = {
  preflight: null,
  db: fp(["supabase/migrations/"], "db"),
  explainers: fp(
    ["explainers/", "packages/navi-ops/src/", "packages/shared/src/bill-explainer/"],
    "explainers"
  ),
  env: null,
  deploy: git(["rev-parse", "HEAD"]),
  smoke: null,
};
for (const s of RELEASE_STEPS.filter((x) => importerArgs(x.id))) {
  fingerprints[s.id] = fp(
    ["packages/shinjuku-importer/src/", "packages/shared/src/"],
    { step: s.id, day: todayInJapan() }
  );
}

const plan = planRelease(selected, state, fingerprints, { env, forced });

// ---- 工程の中身 ----

/**
 * skipped: 実行せずに飛ばした（止めはしないが、成功とは数えない）
 * @returns {Promise<{ ok: boolean, skipped?: boolean, note: string, lines?: string[], logPath?: string, output?: string }>}
 */
async function runStep(id, { dryRun }) {
  if (id === "preflight") return preflight(dryRun);
  if (id === "db") return env === "prod" ? dbProd() : dbDev();
  if (importerArgs(id)) return importer(id);
  if (id === "explainers") return explainers();
  if (id === "env") return envCheck();
  if (id === "deploy") return deploy();
  if (id === "smoke") return smoke();
  throw new Error(`知らない工程: ${id}`);
}

async function preflight(dryRun) {
  // 実行するときだけ origin を最新にする（読み取りだけ。計画表示では通信しない）
  if (!dryRun) runQuiet("git", ["fetch", "--quiet", "origin", "develop"]);
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const dirty = git(["status", "--porcelain"]);
  const counts = git(["rev-list", "--left-right", "--count", "HEAD...origin/develop"]);
  const [ahead, behind] = counts ? counts.split(/\s+/).map(Number) : [null, null];
  const { stale } = checkStatusNow(ROOT);
  const { blockers, warnings } = evaluatePreflight({
    env,
    branch,
    dirtyCount: dirty ? dirty.split("\n").length : 0,
    ahead,
    behind,
    checkStale: stale,
  });
  return {
    ok: blockers.length === 0,
    note: blockers.length ? `止める理由 ${blockers.length} 件` : warnings.length ? `注意 ${warnings.length} 件` : "問題なし",
    lines: [
      ...blockers.map((t) => `止める理由: ${t}`),
      ...warnings.map((t) => `注意: ${t}`),
      ...(dryRun ? ["（origin/develop は最後に fetch した時点のもの）"] : []),
    ],
  };
}

async function supabaseEnv() {
  const file = await readEnvFile(`.env.supabase-${env}`);
  const ref = file?.SUPABASE_PROJECT_REF;
  const password = file?.SUPABASE_DB_PASSWORD;
  if (!ref || !password)
    throw new Error(`.env.supabase-${env} に SUPABASE_PROJECT_REF と SUPABASE_DB_PASSWORD がありません`);
  return { ref, password };
}

async function dbDev() {
  const { ref, password } = await supabaseEnv();
  const refPath = join(ROOT, "supabase/.temp/project-ref");
  const linked = existsSync(refPath) ? readFileSync(refPath, "utf8").trim() : null;
  if (linked !== ref) {
    return {
      ok: false,
      note: "リポジトリのリンク先が開発用ではありません",
      lines: [
        "このコマンドはリンク先を書き換えません。開発用に戻してから再実行してください:",
        "npx supabase link --project-ref <.env.supabase-dev の SUPABASE_PROJECT_REF>",
      ],
    };
  }
  const logPath = logPathFor(`release-${env}`, "db");
  const r = await runToLog("npx", ["supabase", "db", "push", "--linked", "--yes"], {
    logPath,
    env: { SUPABASE_DB_PASSWORD: password },
  });
  return { ok: r.code === 0, note: formatDuration(r.ms), logPath, output: r.output };
}

async function dbProd() {
  const { ref, password } = await supabaseEnv();
  const dev = await readEnvFile(".env.supabase-dev");
  if (dev?.SUPABASE_PROJECT_REF === ref)
    return { ok: false, note: ".env.supabase-prod と .env.supabase-dev が同じ project を指しています" };
  // リポジトリの supabase/.temp（開発用へのリンク）を触らないよう、一時フォルダでリンクして当てる
  const work = mkdtempSync(join(tmpdir(), "navi-release-"));
  try {
    mkdirSync(join(work, "supabase"));
    cpSync(join(ROOT, "supabase/config.toml"), join(work, "supabase/config.toml"));
    cpSync(join(ROOT, "supabase/migrations"), join(work, "supabase/migrations"), { recursive: true });
    const opts = (name) => ({ logPath: logPathFor(`release-${env}`, name), env: { SUPABASE_DB_PASSWORD: password } });
    const link = await runToLog("npx", ["supabase", "link", "--project-ref", ref, "--workdir", work], opts("db-link"));
    if (link.code !== 0)
      return { ok: false, note: "一時フォルダでのリンクに失敗", logPath: opts("db-link").logPath, output: link.output };
    const push = await runToLog("npx", ["supabase", "db", "push", "--linked", "--yes", "--workdir", work], opts("db"));
    return { ok: push.code === 0, note: formatDuration(push.ms), logPath: opts("db").logPath, output: push.output };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

/** navi-ops と同じ決め方で書き込み先を決める（.env が本番を指していたら止まる） */
async function target() {
  const { resolveSupabaseTarget } = await loadNaviOpsEnv();
  return resolveSupabaseTarget(env, {
    dotenv: (await readEnvFile(".env")) ?? {},
    dev: await readEnvFile(".env.supabase-dev"),
    prod: await readEnvFile(".env.supabase-prod"),
  });
}

async function importer(id) {
  const t = await target();
  const logPath = logPathFor(`release-${env}`, id);
  // importer の package.json の scripts は ../../.env を固定で読むので、ここでは tsx を直接呼び、接続先を渡す
  const r = await runToLog(
    "pnpm",
    ["--filter", "@mirai-gikai/shinjuku-importer", "exec", "tsx", ...importerArgs(id)],
    {
      logPath,
      env: {
        SUPABASE_URL: t.url,
        SUPABASE_SECRET_KEY: t.secretKey,
        NEXT_PUBLIC_WEB_URL: t.webUrl ?? (env === "prod" ? PUBLIC_URL : ""),
        REVALIDATE_SECRET: t.revalidateSecret ?? "",
      },
    }
  );
  const last = r.output.trim().split(/\r?\n/).at(-1) ?? "";
  return { ok: r.code === 0, note: `${formatDuration(r.ms)}  ${last.slice(0, 60)}`, logPath, output: r.output };
}

async function explainers() {
  if (!existsSync(join(ROOT, ".materials"))) {
    return {
      ok: false,
      note: ".materials がありません（explainers の検査に必要）",
      lines: [
        "材料を用意してから再実行してください: ワークツリーにあればコピーする、",
        "または pnpm --filter @mirai-gikai/shinjuku-importer materials <会期URL>（区のサイトにアクセスします）",
      ],
    };
  }
  const logPath = logPathFor(`release-${env}`, "explainers");
  const r = await runToLog(
    "pnpm",
    ["--filter", "@mirai-gikai/navi-ops", "run", "explainers:sync", "--env", env, ...(env === "prod" ? ["--confirm-prod"] : [])],
    { logPath }
  );
  return { ok: r.code === 0, note: formatDuration(r.ms), logPath, output: r.output };
}

async function envCheck() {
  let result;
  if (env === "dev") {
    const values = await readEnvFile(".env");
    if (!values) return { ok: false, note: ".env がありません" };
    result = evaluateEnv(values);
  } else {
    const r = runQuiet("npx", ["vercel@latest", "env", "ls", "production"], { timeout: 120_000 });
    if (r.code !== 0)
      return { ok: false, note: "vercel env ls に失敗（vercel CLI のログインとリンクを確認）" };
    result = evaluateEnv(parseVercelEnvNames(`${r.stdout}\n${r.stderr}`));
  }
  const where = env === "prod" ? "Vercel（production）" : ".env";
  const lines = [
    ...result.missing.map((k) => `設定が必要: ${k}（${where}）`),
    ...result.short.map((k) => `値が短すぎます: ${k}`),
    ...result.missingRecommended.map((k) => `注意: ${k} がありません（${where}）`),
    `未決（使うかを決める）: ${result.decide.join(", ")}`,
  ];
  if (env === "prod" && result.missing.length)
    lines.push("値はご自身で設定してください（例: npx vercel@latest env add <名前> production）。値を記録やチャットに書かないこと");
  const ok = result.missing.length === 0 && result.short.length === 0;
  return { ok, note: ok ? "必要な変数あり" : "設定が必要", lines };
}

async function deploy() {
  const gitignorePath = join(ROOT, ".gitignore");
  const envLocalPath = join(ROOT, ".env.local");
  const gitignoreBefore = readFileSync(gitignorePath, "utf8");
  const envLocalExisted = existsSync(envLocalPath);
  const logPath = logPathFor(`release-${env}`, "deploy");
  const args = ["vercel@latest", "deploy", "--prod", "--yes"];
  const lines = [];
  let r;
  try {
    r = await runToLog("npx", args, { logPath });
    // 初回に一時的な "Not authorized" で失敗し、再実行で通ったことがある
    if (r.code !== 0 && /Not authorized/i.test(r.output)) {
      lines.push("Not authorized で失敗したので1回だけ再実行しました");
      r = await runToLog("npx", args, { logPath });
    }
  } finally {
    // 後片付け: vercel が作る .env.local（本番の値の写し）と、.gitignore に足される ".env*" の行
    if (!envLocalExisted && existsSync(envLocalPath)) {
      unlinkSync(envLocalPath);
      lines.push(".env.local を消しました（本番の値の写しのため）");
    } else if (envLocalExisted) {
      lines.push("注意: .env.local は前からあったので残しました（本番の値の写しなら消してください）");
    }
    const after = readFileSync(gitignorePath, "utf8");
    const restored = restoreGitignore(gitignoreBefore, after);
    if (restored !== null) {
      writeFileSync(gitignorePath, restored);
      lines.push('.gitignore に足された ".env*" の行を消しました');
    } else if (after !== gitignoreBefore) {
      lines.push("注意: .gitignore が書き換わっています。git diff .gitignore で確かめてください");
    }
  }
  const url = r.output.match(/https:\/\/[^\s]+\.vercel\.app/g)?.at(-1) ?? "";
  return { ok: r.code === 0, note: `${formatDuration(r.ms)}  ${url}`, lines, logPath, output: r.output };
}

async function smoke() {
  const base =
    env === "prod" ? PUBLIC_URL : ((await readEnvFile(".env"))?.NEXT_PUBLIC_WEB_URL || "http://localhost:3000");
  const results = [];
  for (const path of SMOKE_PATHS) {
    try {
      const res = await fetch(new URL(path, base), { redirect: "follow", signal: AbortSignal.timeout(20_000) });
      results.push({ path, status: res.status });
    } catch {
      results.push({ path, status: null });
    }
  }
  if (env === "dev" && results.every((r) => r.status === null))
    return { ok: true, skipped: true, note: `開発サーバー（${base}）が起動していないので飛ばしました` };
  const bad = results.filter((r) => r.status !== 200);
  return {
    ok: bad.length === 0,
    note: results.map((r) => `${r.path} ${r.status ?? "接続できない"}`).join("  "),
  };
}

// ---- 表示と実行 ----

const tag = { run: execute ? "実行" : "予定", skip: "skip", "n/a": "対象外" };
let wroteLog = false;
console.log(
  `release（${env}）: ${
    execute
      ? "実行します"
      : `計画のみ（書き込まない）。実行は --yes${env === "prod" ? " --confirm-prod" : ""}`
  }`
);
console.log(`書き込み先: ${TARGET_LABEL[env]}`);
if (guarded.added.length)
  console.log(`（指定した工程の前に、確認の工程を必ず通します: ${guarded.added.join(", ")}）`);

for (const item of plan) {
  const step = RELEASE_STEPS.find((s) => s.id === item.id);
  const head = (label, text) => console.log(`${padEnd(label, 6)} ${padEnd(item.id, 19)} ${text}`);
  if (item.action === "n/a") {
    head(tag["n/a"], item.reason);
    continue;
  }
  if (item.action === "skip") {
    head("skip", `${item.reason}  ${shortTime(state.steps[item.id]?.at)}`);
    continue;
  }
  const canRun = execute || step.safeInDryRun?.includes(env);
  if (!canRun) {
    const caution =
      item.id === "explainers" && !existsSync(join(ROOT, ".materials"))
        ? "（注意: .materials が無いので今は失敗します）"
        : "";
    head(tag.run, `${describeStep(item.id, env)}${caution}`);
    continue;
  }
  if (execute && env === "prod") console.log(`▶ ${item.id}: ${describeStep(item.id, env)}`);
  let result;
  try {
    result = await runStep(item.id, { dryRun: !execute });
  } catch (e) {
    result = { ok: false, note: e.message };
  }
  if (result.logPath) wroteLog = true;
  head(result.skipped ? "skip" : result.ok ? "OK" : "NG", result.note);
  for (const line of result.lines ?? []) console.log(`       ${line}`);
  if (!execute) continue; // 計画表示では記録しない
  state.steps[item.id] = {
    ok: result.ok,
    ...(result.skipped ? { skipped: true } : {}),
    fingerprint: fingerprints[item.id] ?? null,
    at: new Date().toISOString(),
    note: result.note,
  };
  writeJson(statePath, state);
  if (!result.ok) {
    if (result.output) {
      console.log(`--- 失敗箇所（全文: ${rel(result.logPath)}）---`);
      console.log(failureExcerpt(result.output, { maxHits: 10, tail: 15 }));
    }
    console.log(
      `止まりました。直したら同じコマンドで再開できます（成功した工程は飛ばします）: pnpm release -- --env ${env} --yes${env === "prod" ? " --confirm-prod" : ""}`
    );
    process.exit(1);
  }
}

if (!execute) {
  const pending = plan.filter((p) => p.action === "run").length;
  console.log(`実行予定 ${pending} 工程。記録: ${rel(statePath)}`);
  if (env === "prod")
    console.log("本番への反映は、ユーザーの「本番OK」を確認してから --yes --confirm-prod で実行します。");
} else {
  // ログを書く工程（db・data・explainers・deploy）を今回1つも実行していなければ、ログは案内しない
  console.log(`完了しました。${wroteLog ? `ログ: ${rel(join(ROOT, ".logs", `release-${env}`))}/` : ""}`);
}
