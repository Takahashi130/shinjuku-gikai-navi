// pnpm release の工程の定義と、判断の基準（すべて純粋関数・定数）。
// 実行の部分は scripts/release.mjs。

/** 公開サイト（Vercel プロジェクト shinjuku-gikai-navi、ルートディレクトリ web） */
export const PUBLIC_URL = "https://shinjuku-gikai-navi.vercel.app";

/** smoke で HTTP 200 を確かめるページ（/members は議員カルテ。古いコードでは 404 になる） */
export const SMOKE_PATHS = ["/", "/bills", "/members", "/privacy"];

/**
 * 環境変数の判断基準。
 * - required: 無ければ止める（本番は Vercel、開発用は .env）
 * - recommended: 無ければ注意だけ出す
 * - decide: 使うかどうかが未決のもの（有無だけ表示し、止めない）
 * PARTICIPATION_HASH_SECRET は 32 文字未満だと投票の受付が止まる（docs/guides/participation-ops.md の 2.4）。
 * 本番の値は Vercel で暗号化されていて長さを確かめられないので、有無だけを見る。
 */
export const ENV_RULES = {
  required: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
    "REVALIDATE_SECRET",
    "PARTICIPATION_HASH_SECRET",
  ],
  recommended: ["NEXT_PUBLIC_WEB_URL"],
  decide: ["NEXT_PUBLIC_GA_TRACKING_ID"],
  minLength: { PARTICIPATION_HASH_SECRET: 32 },
};

/** importer のコマンド。順番の決まり：members は questions より先、ingest は faction-votes より先 */
const IMPORTER = {
  "data:ingest": ["src/run.ts", "--all"],
  "data:members": ["src/run-members.ts"],
  "data:questions": ["src/run-questions.ts", "--all"],
  "data:expenses": ["src/run-expenses.ts"],
  "data:faction-votes": ["src/run-faction-votes.ts", "--all"],
};

/**
 * 工程の一覧。
 * - writes: 書き込み・外部への操作をする工程（--yes が無ければ実行しない）
 * - envs: 対象の環境
 * - safeInDryRun: 計画表示のときにも実行してよい工程（手元だけを読む）
 */
export const RELEASE_STEPS = [
  { id: "preflight", writes: false, envs: ["dev", "prod"], safeInDryRun: ["dev", "prod"] },
  // 環境変数は DB に書き込む前に確かめる（足りないまま DB だけ進んだ状態を作らないため）。
  // 本番の env は Vercel を読むので、計画表示では実行しない（手元の .env だけを見る dev は実行する）
  { id: "env", writes: false, envs: ["dev", "prod"], safeInDryRun: ["dev"] },
  { id: "db", writes: true, envs: ["dev", "prod"] },
  ...Object.keys(IMPORTER).map((id) => ({ id, writes: true, envs: ["dev", "prod"] })),
  { id: "explainers", writes: true, envs: ["dev", "prod"] },
  { id: "deploy", writes: true, envs: ["prod"] },
  { id: "smoke", writes: false, envs: ["dev", "prod"] },
];

export function importerArgs(stepId) {
  return IMPORTER[stepId] ?? null;
}

/**
 * --only / --from で選んだ工程に、必ず先に通す確認の工程を足す（並びは RELEASE_STEPS の順）。
 * - 本番：preflight は常に。書き込む工程があれば env も
 *   （Vercel の変数が足りないまま DB やデプロイだけ進んだ状態を作らないため）
 * - 開発用：書き込む工程があれば preflight
 *   （別ブランチから共有の開発用 DB にマイグレーションを当てると履歴が食い違うため。preflight は develop 以外で止まる）
 * @template {{ id: string, writes: boolean, envs: string[] }} T
 * @param {T[]} selected
 * @param {"dev" | "prod"} env
 * @param {T[]} [all]
 * @returns {{ steps: T[], added: string[] }} added: 足した工程
 */
export function withGuardSteps(selected, env, all = RELEASE_STEPS) {
  const ids = new Set(selected.map((s) => s.id));
  const writes = selected.some((s) => s.writes && s.envs.includes(env));
  const guards = [];
  if (env === "prod" || writes) guards.push("preflight");
  if (env === "prod" && writes) guards.push("env");
  const added = guards.filter((id) => !ids.has(id));
  for (const id of added) ids.add(id);
  return { steps: all.filter((s) => ids.has(s.id)), added };
}

/** 書き込み先（計画の見出しに1回だけ出す） */
export const TARGET_LABEL = {
  dev: "開発用 DB = .env の接続先（.env.supabase-dev の SUPABASE_PROJECT_REF と一致し、本番を指していないことを確かめる）",
  prod: `本番 DB = .env.supabase-prod の接続先。公開サイト ${PUBLIC_URL}`,
};

const DB = { dev: "開発用 DB", prod: "本番 DB" };

/** 工程ごとに「何をするか」（計画の表示と、本番で実行する前の表示に使う） */
export function describeStep(id, env) {
  const target = DB[env];
  switch (id) {
    case "preflight":
      return env === "prod"
        ? "develop・作業ツリーがきれい・origin/develop と一致・pnpm check が今の状態で成功済み、を確かめる"
        : "develop にいるかを確かめる（ほかは注意だけ）";
    case "db":
      return env === "prod"
        ? `${target} に未適用のマイグレーションを当てる（一時フォルダでリンク。リポジトリのリンク先は変えない）`
        : `${target} に未適用のマイグレーションを当てる（supabase db push --linked。リンク先が開発用か確かめる）`;
    case "data:ingest":
      return `議案・会派の賛否・投票の回（令和の全会期）を ${target} に取り込む（約5分）`;
    case "data:members":
      return `議員・会派・役職を ${target} に取り込む`;
    case "data:questions":
      return `本会議の質問（全会期）を ${target} に取り込む`;
    case "data:expenses":
      return `政務活動費の PDF を ${target} に取り込む`;
    case "data:faction-votes":
      return `審議結果 PDF の会派賛否（全会期）を ${target} に取り込む`;
    case "explainers":
      return `explainers/ の解説を検査して ${target} に反映する（explainers:sync --env ${env}）`;
    case "env":
      return env === "prod"
        ? "Vercel（production）の環境変数の有無を確かめる（値は見ない。足りなければ止まる）"
        : ".env の環境変数の有無を確かめる（値は表示しない）";
    case "deploy":
      return "vercel deploy --prod（ルートで）。後で .env.local と .gitignore の \".env*\" 行を片付ける";
    case "smoke":
      return env === "prod"
        ? `公開サイトの ${SMOKE_PATHS.join(" ")} が HTTP 200 か確かめる`
        : `開発サーバーの ${SMOKE_PATHS.join(" ")} を確かめる（起動していなければ飛ばす）`;
    default:
      return "";
  }
}

/**
 * 工程ごとに、実行するか・飛ばすかを決める。
 * @param {{ id: string, envs: string[] }[]} steps 選んだ工程
 * @param {{ steps?: Record<string, { ok: boolean, skipped?: boolean, fingerprint: string | null, at: string }> }} state .cache/release-<env>.json
 *   skipped: 実行せずに飛ばした記録（開発サーバーが止まっていた smoke など）。成功とは数えない
 * @param {Record<string, string | null>} fingerprints 工程ごとの今のハッシュ（null は毎回実行）
 * @param {{ env: string, forced: Set<string> }} opts forced: --from / --only でやり直す工程
 * @returns {{ id: string, action: "run" | "skip" | "n/a", reason: string }[]}
 */
export function planRelease(steps, state, fingerprints, { env, forced }) {
  return steps.map((step) => {
    if (!step.envs.includes(env))
      return { id: step.id, action: "n/a", reason: `${env} では行わない` };
    const fp = fingerprints[step.id] ?? null;
    const last = state.steps?.[step.id];
    if (forced.has(step.id)) return { id: step.id, action: "run", reason: "やり直し指定" };
    if (fp === null) return { id: step.id, action: "run", reason: "毎回確かめる" };
    if (last?.ok && !last.skipped && last.fingerprint === fp)
      return { id: step.id, action: "skip", reason: "済み（変更なし）" };
    return {
      id: step.id,
      action: "run",
      reason: !last
        ? "未実施"
        : !last.ok
          ? "前回失敗"
          : last.skipped
            ? "前回は飛ばした"
            : "前回から変更あり",
    };
  });
}

/**
 * preflight の判断基準。
 * 本番はすべて止める理由（blocker）。開発用は develop 以外だけを止め、ほかは注意（warning）にする
 * （別ブランチから開発用 DB にマイグレーションを当てると履歴が食い違うため、ブランチだけは必須）。
 */
export function evaluatePreflight({ env, branch, dirtyCount, ahead, behind, checkStale }) {
  const issues = [];
  if (branch !== "develop") issues.push({ hard: true, text: `ブランチが develop ではありません（${branch ?? "不明"}）` });
  if (dirtyCount > 0) issues.push({ hard: env === "prod", text: `コミットしていない変更が ${dirtyCount} 件あります` });
  if (ahead === null) issues.push({ hard: env === "prod", text: "origin/develop と比べられません" });
  else {
    if (ahead > 0) issues.push({ hard: env === "prod", text: `push していないコミットが ${ahead} 件あります（push はユーザーの確認を取ってから）` });
    if (behind > 0) issues.push({ hard: env === "prod", text: `origin/develop より ${behind} コミット遅れています` });
  }
  if (checkStale.length)
    issues.push({ hard: env === "prod", text: `pnpm check が今の状態で済んでいません（${checkStale.join(", ")}）` });
  return {
    blockers: issues.filter((i) => i.hard).map((i) => i.text),
    warnings: issues.filter((i) => !i.hard).map((i) => i.text),
  };
}

/**
 * 環境変数の過不足（値そのものは返さない）。
 * @param {Record<string, string> | string[]} present 開発用は {名前: 値}、本番は名前の配列（Vercel は値を返さない）
 */
export function evaluateEnv(present, rules = ENV_RULES) {
  const values = Array.isArray(present) ? null : present;
  const names = new Set(Array.isArray(present) ? present : Object.keys(present).filter((k) => present[k] !== ""));
  const missing = rules.required.filter((k) => !names.has(k));
  const short = values
    ? Object.entries(rules.minLength)
        .filter(([k, n]) => names.has(k) && values[k].length < n)
        .map(([k, n]) => `${k}（${n}文字以上が必要）`)
    : [];
  return {
    missing,
    short,
    missingRecommended: rules.recommended.filter((k) => !names.has(k)),
    decide: rules.decide.map((k) => `${k}: ${names.has(k) ? "あり" : "なし"}`),
  };
}

/** `vercel env ls` の表から変数名だけを取り出す */
export function parseVercelEnvNames(output) {
  const names = new Set();
  for (const line of output.split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z][A-Z0-9_]*)\s+/);
    if (m) names.add(m[1]);
  }
  return [...names].sort();
}

/**
 * `supabase migration list` の結果を読む。
 * 画面（TTY）では表、そうでないとき（パイプ・エージェントからの実行）は JSON で出ることがあるので両方読む。
 * @returns {{ applied: number, pending: string[], remoteOnly: string[] } | null}
 */
export function parseMigrationList(output) {
  const isVer = (v) => /^\d{14}$/.test(v ?? "");
  let pairs = [];
  try {
    const json = JSON.parse(output.trim());
    if (Array.isArray(json?.migrations))
      pairs = json.migrations.map((m) => [m.local ?? "", m.remote ?? ""]);
  } catch {
    pairs = output
      .split(/\r?\n/)
      .filter((line) => line.includes("|"))
      .map((line) => line.split("|").map((c) => c.trim()));
  }
  const rows = pairs.filter(([l, r]) => isVer(l) || isVer(r));
  if (!rows.length) return null;
  return {
    applied: rows.filter(([l, r]) => isVer(l) && isVer(r)).length,
    pending: rows.filter(([l, r]) => isVer(l) && !isVer(r)).map(([l]) => l),
    remoteOnly: rows.filter(([l, r]) => !isVer(l) && isVer(r)).map(([, r]) => r),
  };
}

/**
 * deploy のあとに .gitignore を元に戻すか（vercel link が ".env*" の行を足すことがある。
 * その行があると .env.example まで除外されてしまう）。足された行が ".env*" と空行だけのときに限り、元の内容を返す。
 */
export function restoreGitignore(before, after) {
  if (before === after) return null;
  if (!after.startsWith(before.replace(/\n*$/, ""))) return null;
  const added = after
    .slice(before.replace(/\n*$/, "").length)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return added.length > 0 && added.every((l) => l === ".env*") ? before : null;
}
