// 「変わっていない工程を繰り返さない」ための内容ハッシュ。
// 対象は git の管理下のファイルと、まだ add していない新しいファイル（.gitignore で除外したものは入れない）。
// 作業ツリーの今の中身で計算するので、コミットしていない変更も反映される。

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readlinkSync } from "node:fs";
import { join } from "node:path";

/**
 * パターンに合うファイルを選ぶ（純粋関数）。
 * - "web/" のように / で終わるものはそのフォルダの中すべて
 * - それ以外は完全一致（例: "pnpm-lock.yaml"）
 * - 先頭が "!" のものは除外（例: "!web/README.md"、"!web/public/"）
 * @param {string[]} files リポジトリのルートからの相対パス（区切りは /）
 * @param {string[]} patterns
 * @returns {string[]} 並べかえ済み
 */
export function selectFiles(files, patterns) {
  const include = patterns.filter((p) => !p.startsWith("!"));
  const exclude = patterns.filter((p) => p.startsWith("!")).map((p) => p.slice(1));
  const hit = (file, p) => (p.endsWith("/") ? file.startsWith(p) : file === p);
  return [...new Set(files)]
    .filter((f) => include.some((p) => hit(f, p)))
    .filter((f) => !exclude.some((p) => hit(f, p)))
    .sort();
}

/**
 * ファイルごとのハッシュと、ほかに結果を左右するもの（コマンドなど）から1つのハッシュを作る（純粋関数）。
 * @param {{ path: string, hash: string }[]} entries
 * @param {unknown} extra
 */
export function combineFingerprint(entries, extra = null) {
  const h = createHash("sha256");
  h.update(JSON.stringify(extra));
  for (const e of [...entries].sort((a, b) => (a.path < b.path ? -1 : 1))) {
    h.update(`\0${e.path}\0${e.hash}`);
  }
  return h.digest("hex").slice(0, 16);
}

/** git の管理下のファイル＋未追跡（.gitignore 以外）のファイル一覧 */
export function listRepoFiles(root) {
  const r = spawnSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  if (r.status !== 0) throw new Error(`git ls-files に失敗しました: ${r.stderr}`);
  return r.stdout.split("\0").filter(Boolean);
}

function hashFile(root, rel) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    // シンボリックリンク先が無い場合も existsSync は false になる
    try {
      return `link:${readlinkSync(abs)}`;
    } catch {
      return "deleted";
    }
  }
  const st = lstatSync(abs);
  if (st.isSymbolicLink()) return `link:${readlinkSync(abs)}`;
  if (!st.isFile()) return "not-a-file";
  return createHash("sha1").update(readFileSync(abs)).digest("hex");
}

/**
 * 工程の入力（patterns）の今の内容ハッシュ。
 * @param {string} root
 * @param {string[]} patterns
 * @param {unknown} extra コマンドなど、変わったらやり直したいもの
 * @param {string[]} [files] listRepoFiles の結果（何度も呼ぶときに使い回す）
 */
export function computeFingerprint(root, patterns, extra, files) {
  const selected = selectFiles(files ?? listRepoFiles(root), patterns);
  return combineFingerprint(
    selected.map((path) => ({ path, hash: hashFile(root, path) })),
    extra
  );
}
