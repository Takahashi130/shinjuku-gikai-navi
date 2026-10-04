// PostToolUse フック：編集したファイルだけを biome で整形・修正する（format --write と lint --write に相当）。
// 何も問題が無ければ何も出さない。直せないエラーが残ったときだけ、短く（先頭 15 行）知らせる。
// biome.json の files.includes（web/src・admin/src・tests）の外のファイルは biome が対象外として飛ばす。
// Mac と Windows の両方で動くよう、シェルを使わず node から biome を起動する。

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BIOME = join(ROOT, "node_modules/@biomejs/biome/bin/biome");
const EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".json",
  ".jsonc",
  ".css",
]);

let input = "";
for await (const chunk of process.stdin) input += chunk;

let file = null;
try {
  const data = JSON.parse(input);
  file = data.tool_input?.file_path ?? data.tool_input?.notebook_path ?? null;
} catch {
  process.exit(0);
}
if (!file || !EXTENSIONS.has(extname(file)) || !existsSync(BIOME)) process.exit(0);
const path = resolve(file);
const relPath = relative(ROOT, path);
if (relPath.startsWith("..") || !existsSync(path)) process.exit(0);

const r = spawnSync(
  process.execPath,
  [
    BIOME,
    "check",
    "--write",
    "--assist-enabled=false",
    "--no-errors-on-unmatched",
    "--files-ignore-unknown=true",
    "--max-diagnostics=3",
    relPath,
  ],
  { cwd: ROOT, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } }
);
if (r.status === 0) process.exit(0);

const lines = `${r.stdout ?? ""}\n${r.stderr ?? ""}`
  .split(/\r?\n/)
  .filter((l) => l.trim() !== "");
console.error(`biome: ${relPath} にエラーが残っています`);
console.error(lines.slice(0, 15).join("\n"));
// 2 で終わると、この出力が Claude に渡る（直してもらうため）
process.exit(2);
