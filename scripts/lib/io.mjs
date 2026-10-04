// scripts/*.mjs で共通の入出力：コマンドの実行（全文はログへ）、.cache の記録、git の読み取り。
// Mac と Windows の両方で動くよう、シェルの機能（パイプ・リダイレクト・変数展開）は使わない。

import { spawn, spawnSync } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CACHE_DIR = join(ROOT, ".cache");
export const LOG_DIR = join(ROOT, ".logs");

/**
 * 子のコマンドに渡す環境変数。
 * `pnpm -s check` のように親を静かにすると npm_config_reporter=silent が子の pnpm に伝わり、
 * 複数パッケージの出力が消える（要約が作れない）ので外す。色のコードも止める。
 */
export function childEnv(extra = {}) {
  const env = { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", ...extra };
  const quiet = ["npm_config_reporter", "npm_config_loglevel"];
  for (const key of Object.keys(env)) {
    if (quiet.includes(key.toLowerCase())) delete env[key];
  }
  return env;
}

// Windows では pnpm・npx が .cmd なのでシェル経由で起動する（gen-types-remote.mjs と同じ）。
// そのときは引数を1つの文字列にまとめ、空白などを含む引数は "" で囲む。
const useShell = process.platform === "win32";

function quoteForCmd(arg) {
  return /[\s"&|<>^%]/.test(arg) ? `"${arg.replace(/"/g, '""')}"` : arg;
}

function spawnArgs(cmd, args) {
  return useShell
    ? [[cmd, ...args].map(quoteForCmd).join(" "), []]
    : [cmd, args];
}

/** "typecheck:web" → ".logs/check/typecheck-web.log" のような、ファイル名に使える形 */
export function logPathFor(group, id) {
  return join(LOG_DIR, group, `${id.replace(/[^A-Za-z0-9._-]/g, "-")}.log`);
}

/** 画面に出すための、リポジトリのルートからの相対パス */
export function rel(path) {
  return path.startsWith(ROOT) ? path.slice(ROOT.length + 1) : path;
}

/**
 * コマンドを実行し、出力はすべてログファイルに書く（画面には出さない）。
 * @returns {Promise<{ code: number, output: string, ms: number }>}
 */
export function runToLog(cmd, args, { logPath, cwd = ROOT, env = {} } = {}) {
  mkdirSync(dirname(logPath), { recursive: true });
  const log = createWriteStream(logPath);
  log.write(`$ ${cmd} ${args.join(" ")}\n# cwd: ${rel(cwd) || "."}\n\n`);
  const started = Date.now();
  return new Promise((resolve) => {
    const chunks = [];
    const child = spawn(...spawnArgs(cmd, args), {
      cwd,
      shell: useShell,
      stdio: ["ignore", "pipe", "pipe"],
      env: childEnv(env),
    });
    const onData = (d) => {
      chunks.push(d);
      log.write(d);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    const finish = (code) => {
      const ms = Date.now() - started;
      log.end(`\n# exit ${code}  ${ms}ms\n`);
      resolve({ code, output: Buffer.concat(chunks).toString("utf8"), ms });
    };
    child.on("error", (e) => {
      chunks.push(Buffer.from(String(e)));
      finish(127);
    });
    child.on("close", (code) => finish(code ?? 1));
  });
}

/** 短い読み取り用のコマンド（git など）。失敗しても例外にしない */
export function runQuiet(cmd, args, { cwd = ROOT, env = {}, timeout = 60_000 } = {}) {
  const r = spawnSync(...spawnArgs(cmd, args), {
    cwd,
    shell: useShell,
    encoding: "utf8",
    timeout,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
    env: childEnv(env),
  });
  return {
    code: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? (r.error ? String(r.error) : ""),
  };
}

export function git(args) {
  const r = runQuiet("git", ["-c", "core.quotePath=false", ...args]);
  return r.code === 0 ? r.stdout.trimEnd() : null;
}

export function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

/** KEY=VALUE のファイルを読む。navi-ops と同じ読み方にするため、navi-ops の parseDotenv を使う */
export async function readEnvFile(name) {
  const path = join(ROOT, name);
  if (!existsSync(path)) return null;
  const { parseDotenv } = await loadNaviOpsEnv();
  return parseDotenv(readFileSync(path, "utf8"));
}

/**
 * packages/navi-ops/src/env.ts（書き込み先の決め方と、本番を誤って指していないかの確認）をそのまま使う。
 * Node 22.18 以降は .ts をそのまま読み込める。
 */
export async function loadNaviOpsEnv() {
  try {
    return await import("../../packages/navi-ops/src/env.ts");
  } catch (e) {
    throw new Error(
      `packages/navi-ops/src/env.ts を読み込めませんでした（Node 22.18 以上が必要です。今は ${process.version}）: ${e.message}`
    );
  }
}
