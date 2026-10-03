import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** リポジトリのルート（packages/navi-ops/src から3つ上） */
export const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../.."
);

/** 解説（コミットする） */
export const EXPLAINERS_DIR = join(REPO_ROOT, "explainers");

/** 解説の材料（区の資料の文字。gitignore 済み。importer の materials コマンドが作る） */
export const MATERIALS_DIR = join(REPO_ROOT, ".materials");

export function explainerPath(sessionSlug: string, billSlug: string): string {
  return join(EXPLAINERS_DIR, sessionSlug, `${billSlug}.json`);
}

export function materialPath(sessionSlug: string, billSlug: string): string {
  return join(MATERIALS_DIR, sessionSlug, `${billSlug}.json`);
}
