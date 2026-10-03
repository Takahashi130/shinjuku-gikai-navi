import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BRAND_COLOR_CSS_VARS, BRAND_COLORS } from "./brand-colors";
import { SITE } from "./site";

/** globals.css の最初の `:root { ... }`（いまの配色）を取り出す。 */
function readRootBlock(): string {
  const css = readFileSync(
    new URL("../app/globals.css", import.meta.url),
    "utf8"
  );
  const match = css.match(/:root\s*\{([^}]*--brand-header:[^}]*)\}/);
  if (!match) throw new Error("globals.css に --brand-* の :root が無い");
  return match[1];
}

describe("BRAND_COLORS", () => {
  // OG 画像とテーマカラーだけ古い配色のまま残るのを防ぐ。
  it("globals.css の :root の --brand-* と同じ値", () => {
    const root = readRootBlock();

    for (const [key, cssVar] of Object.entries(BRAND_COLOR_CSS_VARS)) {
      const value = BRAND_COLORS[key as keyof typeof BRAND_COLORS];
      expect(root, cssVar).toMatch(new RegExp(`${cssVar}:\\s*${value};`, "i"));
    }
  });

  it("ブラウザのテーマカラーはヘッダー上段の色", () => {
    expect(SITE.THEME_COLOR).toBe(BRAND_COLORS.header);
  });
});
