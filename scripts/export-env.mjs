// 設定ファイル（.env・.env.supabase-dev・.env.supabase-prod）を、指定したフォルダにコピーする。
// 別の PC（Windows）へ移すとき用。受け取る側は scripts/setup-windows.ps1 が SSD の chokumin-env から読む。
//
// 使い方:
//   pnpm env:export -- --to <フォルダ>               例: --to /Volumes/SSD/chokumin-env
//   pnpm env:export -- --to <フォルダ> --overwrite   中身の違うファイルがあっても確認せずに上書きする
//
// 値は表示しない（ファイル名と変数の数だけ）。同じ中身のファイルはそのまま。
// 中身が違うときは、対話できる画面なら y/N で確認し、そうでなければ --overwrite が無い限り上書きしない。
// フォルダが無いときは、その親フォルダがあれば作る（SSD の挿し忘れでほかの場所に作らないため）。

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { flagValue, parseArgs } from "./lib/args.mjs";
import { ROOT } from "./lib/io.mjs";

const ENV_FILES = [".env", ".env.supabase-dev", ".env.supabase-prod"];

const { flags } = parseArgs(process.argv.slice(2), ["--to"]);
const to = flagValue(flags, "--to");
if (!to) {
  console.error("コピー先を --to で指定してください（例: pnpm env:export -- --to /Volumes/SSD/chokumin-env）");
  process.exit(2);
}
const dest = resolve(to);
if (dest === resolve(ROOT)) {
  console.error("コピー先がこのリポジトリと同じです");
  process.exit(2);
}
if (!existsSync(dest)) {
  if (!existsSync(dirname(dest))) {
    console.error(`コピー先の親フォルダがありません: ${dirname(dest)}（SSD が接続されているか確認してください）`);
    process.exit(1);
  }
  mkdirSync(dest);
  console.log(`フォルダを作りました: ${dest}`);
} else if (!statSync(dest).isDirectory()) {
  console.error(`フォルダではありません: ${dest}`);
  process.exit(1);
}

const overwrite = flags.has("--overwrite");
const keyCount = (text) => text.split(/\r?\n/).filter((l) => /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=/.test(l)).length;

async function confirm(question) {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

let failed = false;
for (const name of ENV_FILES) {
  const src = join(ROOT, name);
  const out = join(dest, name);
  if (!existsSync(src)) {
    console.log(`なし    ${name}（このリポジトリにありません）`);
    continue;
  }
  const content = readFileSync(src);
  const count = keyCount(content.toString("utf8"));
  if (existsSync(out)) {
    if (readFileSync(out).equals(content)) {
      console.log(`同じ    ${name}（${count} 変数）`);
      continue;
    }
    const ok = overwrite || (await confirm(`${name} はコピー先に違う中身であります。上書きしますか？ [y/N] `));
    if (!ok) {
      console.log(`そのまま ${name}（中身が違います。上書きするなら --overwrite）`);
      failed = true;
      continue;
    }
  }
  copyFileSync(src, out);
  console.log(`コピー  ${name}（${count} 変数）`);
}
console.log(`コピー先: ${dest}`);
process.exit(failed ? 1 : 0);
