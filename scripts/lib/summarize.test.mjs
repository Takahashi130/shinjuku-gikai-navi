import { describe, expect, it } from "vitest";
import {
  countTscErrors,
  failureExcerpt,
  formatDuration,
  padEnd,
  stripAnsi,
  summarizeBiome,
  summarizeOutput,
  summarizeVitest,
} from "./summarize.mjs";

describe("summarizeVitest", () => {
  it("pnpm で複数のパッケージを回したときは足し合わせる", () => {
    const out = [
      "packages/shared test:  Test Files  10 passed (10)",
      "packages/shared test:       Tests  100 passed (100)",
      "packages/navi-ops test:  Test Files  1 failed | 5 passed (6)",
      "packages/navi-ops test:       Tests  2 failed | 50 passed | 1 skipped (53)",
    ].join("\n");
    expect(summarizeVitest(out)).toEqual({ passed: 150, failed: 2, skipped: 1, files: 16 });
    expect(summarizeOutput("vitest", out)).toBe("150 passed, 2 failed, 1 skipped");
  });

  it("要約の行が無ければ null", () => {
    expect(summarizeVitest("no tests")).toBeNull();
    expect(summarizeOutput("vitest", "no tests")).toBe("要約なし（ログを確認）");
  });

  it("色のコードがあっても読める", () => {
    expect(summarizeVitest("\u001b[2m      Tests \u001b[22m\u001b[32m3 passed\u001b[39m (3)")?.passed).toBe(3);
  });
});

describe("tsc / biome", () => {
  it("型エラーの数を数える", () => {
    const out = "a.ts(1,1): error TS2322: x\nb.ts(2,2): error TS2345: y";
    expect(countTscErrors(out)).toBe(2);
    expect(summarizeOutput("tsc", out)).toBe("型エラー 2 件");
    expect(summarizeOutput("tsc", "")).toBe("");
  });

  it("biome のファイル数・warning・error", () => {
    const out = "Checked 1299 files in 1s. No fixes applied.\nChecked 1299 files in 2s.\nFound 145 warnings.";
    expect(summarizeBiome(out)).toEqual({ files: 1299, warnings: 145, errors: 0 });
    expect(summarizeOutput("biome", `${out}\nFound 2 errors.`)).toBe("1299 files, error 2, warning 145");
  });
});

describe("failureExcerpt", () => {
  it("失敗を示す行と末尾だけを出す", () => {
    const lines = ["ok 1", " FAIL  src/a.test.ts > x", ...Array.from({ length: 50 }, (_, i) => `line ${i}`)];
    const text = failureExcerpt(lines.join("\n"), { maxHits: 5, tail: 3 });
    expect(text.split("\n")).toEqual([" FAIL  src/a.test.ts > x", "…", "line 47", "line 48", "line 49"]);
  });

  it("失敗の行が無ければ末尾だけ", () => {
    expect(failureExcerpt("a\nb\nc", { tail: 2 })).toBe("b\nc");
  });
});

describe("formatDuration / padEnd / stripAnsi", () => {
  it("秒と分秒", () => {
    expect(formatDuration(3100)).toBe("3.1s");
    expect(formatDuration(203_000)).toBe("3m23s");
  });
  it("全角は2文字分として数える", () => {
    expect(padEnd("ab", 4)).toBe("ab  ");
    expect(padEnd("変更", 6)).toBe("変更  ");
  });
  it("色のコードを消す", () => {
    expect(stripAnsi("\u001b[31mred\u001b[0m")).toBe("red");
  });
});
