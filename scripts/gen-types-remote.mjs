// 開発用 Supabase（クラウド）の DB から型ファイルを作り直す。
// Mac・Windows のどちらでも動くよう、シェルの機能（変数展開・リダイレクト）を使わずに Node で書いている。
//
// 使い方: pnpm db:types:gen:remote
// .env.supabase-dev の SUPABASE_PROJECT_REF を読む（supabase CLI へのログインが必要）。

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.supabase-dev");
const outPath = join(root, "packages/supabase/types/supabase.types.ts");

if (!existsSync(envPath)) {
  console.error(
    ".env.supabase-dev がありません。設定ファイルの受け渡し（docs の Windows 手順書）を確認してください"
  );
  process.exit(1);
}

const ref = readFileSync(envPath, "utf8")
  .split(/\r?\n/)
  .find((line) => line.startsWith("SUPABASE_PROJECT_REF="))
  ?.slice("SUPABASE_PROJECT_REF=".length)
  .trim();

if (!ref) {
  console.error(".env.supabase-dev に SUPABASE_PROJECT_REF がありません");
  process.exit(1);
}

const result = spawnSync(
  "npx",
  ["--yes", "supabase", "gen", "types", "typescript", "--project-id", ref],
  // Windows では npx が npx.cmd なので shell 経由で起動する
  { encoding: "utf8", shell: process.platform === "win32", maxBuffer: 64 * 1024 * 1024 }
);

if (result.status !== 0 || !result.stdout) {
  console.error(result.stderr || "型の生成に失敗しました");
  process.exit(result.status ?? 1);
}

// Windows でも改行は LF にそろえる（リポジトリの決まり）
writeFileSync(outPath, result.stdout.replace(/\r\n/g, "\n"));
console.log(`型ファイルを更新しました: ${outPath}`);
