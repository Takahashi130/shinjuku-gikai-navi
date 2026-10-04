// 検査一式を順に実行し、工程ごとに1行で結果を出す。全文のログは .logs/check/ に残す。
//
// 使い方:
//   pnpm check                      変わった工程だけ実行する（前回成功から入力が同じ工程は skip）
//   pnpm check -- --force           すべてやり直す
//   pnpm check -- --only test:web   一部だけ（カンマ区切り。"test" で test:* すべて）
//   pnpm check -- --list            工程の一覧
//
// 工程の定義（コマンドと、変更を見るファイル）は scripts/lib/check-steps.mjs。
// 記録は .cache/check-state.json（pnpm release の preflight と pnpm status も読む）。
// 終了コード: すべて OK か skip なら 0、NG があれば 1。

import { flagValue, parseArgs } from "./lib/args.mjs";
import {
  CHECK_STATE_PATH,
  CHECK_STEPS,
  checkFingerprint,
} from "./lib/check-steps.mjs";
import { listRepoFiles } from "./lib/fingerprint.mjs";
import {
  git,
  LOG_DIR,
  logPathFor,
  readJson,
  rel,
  ROOT,
  runToLog,
  writeJson,
} from "./lib/io.mjs";
import { decideSkip, selectSteps, shortTime } from "./lib/steps.mjs";
import {
  failureExcerpt,
  formatDuration,
  padEnd,
  summarizeOutput,
} from "./lib/summarize.mjs";

const { flags } = parseArgs(process.argv.slice(2), ["--only"]);

if (flags.has("--list")) {
  for (const s of CHECK_STEPS) console.log(`${padEnd(s.id, 20)} ${s.cmd.join(" ")}`);
  process.exit(0);
}

let steps;
try {
  steps = selectSteps(CHECK_STEPS, { only: flagValue(flags, "--only") });
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
const force = flags.has("--force");
const state = readJson(CHECK_STATE_PATH, { steps: {} });
state.steps ??= {};
const files = listRepoFiles(ROOT);
const tty = process.stdout.isTTY;
const results = [];

for (const step of steps) {
  const fingerprint = checkFingerprint(ROOT, step, files);
  const last = state.steps[step.id];
  const { skip } = decideSkip(last, fingerprint, force);
  if (skip) {
    results.push({ id: step.id, status: "skip" });
    console.log(
      `${padEnd("skip", 5)} ${padEnd(step.id, 20)} 変更なし（前回 OK ${shortTime(last.at)}）`
    );
    continue;
  }
  if (tty) process.stdout.write(`...   ${step.id} を実行中`);
  const logPath = logPathFor("check", step.id);
  const [cmd, ...args] = step.cmd;
  const { code, output, ms } = await runToLog(cmd, args, { logPath });
  const ok = code === 0;
  const summary = summarizeOutput(step.kind, output);
  state.steps[step.id] = {
    ok,
    fingerprint,
    at: new Date().toISOString(),
    ms,
    summary,
  };
  writeJson(CHECK_STATE_PATH, state);
  results.push({ id: step.id, status: ok ? "OK" : "NG", logPath, output });
  if (tty) process.stdout.write("\r\u001b[2K");
  console.log(
    `${padEnd(ok ? "OK" : "NG", 5)} ${padEnd(step.id, 20)} ${padEnd(summary, 36)} ${formatDuration(ms)}`
  );
}

const count = (s) => results.filter((r) => r.status === s).length;
state.lastRun = {
  at: new Date().toISOString(),
  head: git(["rev-parse", "--short", "HEAD"]),
  results: results.map(({ id, status }) => ({ id, status })),
};
writeJson(CHECK_STATE_PATH, state);

console.log(
  `結果: OK ${count("OK")} / NG ${count("NG")} / skip ${count("skip")}   ログ: ${rel(LOG_DIR)}/check/`
);

for (const r of results.filter((x) => x.status === "NG")) {
  console.log(`\n--- ${r.id} の失敗箇所（全文: ${rel(r.logPath)}）---`);
  console.log(failureExcerpt(r.output));
}

process.exit(count("NG") ? 1 : 0);
