import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { EXPLAINERS_DIR, REPO_ROOT, materialPath } from "./paths";

export type ExplainerFileEntry = {
  absPath: string;
  /** リポジトリのルートからのパス（区切りは /） */
  relPath: string;
  sessionSlug: string;
  billSlug: string;
};

/** explainers/<会期slug>/<議案slug>.json を並べる（session を指定するとその会期だけ） */
export function listExplainerFiles(session?: string): ExplainerFileEntry[] {
  if (!existsSync(EXPLAINERS_DIR)) return [];
  const out: ExplainerFileEntry[] = [];
  for (const dirent of readdirSync(EXPLAINERS_DIR, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    if (session && dirent.name !== session) continue;
    const dir = join(EXPLAINERS_DIR, dirent.name);
    for (const name of readdirSync(dir).sort()) {
      if (!name.endsWith(".json")) continue;
      const absPath = join(dir, name);
      out.push({
        absPath,
        relPath: relative(REPO_ROOT, absPath).split("\\").join("/"),
        sessionSlug: dirent.name,
        billSlug: name.replace(/\.json$/, ""),
      });
    }
  }
  return out;
}

export function readMaterialText(
  sessionSlug: string,
  billSlug: string
): string | null {
  const path = materialPath(sessionSlug, billSlug);
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

/** 会期の材料がある議案の slug */
export function listMaterialSlugs(sessionSlug: string): Set<string> {
  const dir = join(REPO_ROOT, ".materials", sessionSlug);
  if (!existsSync(dir)) return new Set();
  return new Set(
    readdirSync(dir)
      .filter((n) => n.endsWith(".json"))
      .map((n) => n.replace(/\.json$/, ""))
  );
}
