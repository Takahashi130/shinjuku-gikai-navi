import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHECK_STEPS } from "./check-steps.mjs";
import { combineFingerprint, selectFiles } from "./fingerprint.mjs";
import { ROOT } from "./io.mjs";

describe("selectFiles", () => {
  const files = [
    "web/src/a.ts",
    "web/README.md",
    "webx/b.ts",
    "packages/shared/c.ts",
    "pnpm-lock.yaml",
    "pnpm-lock.yaml.bak",
  ];

  it("'/' で終わるものはフォルダの中、それ以外は完全一致", () => {
    expect(selectFiles(files, ["web/", "pnpm-lock.yaml"])).toEqual([
      "pnpm-lock.yaml",
      "web/README.md",
      "web/src/a.ts",
    ]);
  });

  it("'!' で始まるものは除く", () => {
    expect(selectFiles(files, ["web/", "!web/README.md"])).toEqual(["web/src/a.ts"]);
  });

  it("重複は1つにまとめる", () => {
    expect(selectFiles(["a", "a"], ["a"])).toEqual(["a"]);
  });
});

describe("combineFingerprint", () => {
  const a = { path: "a", hash: "1" };
  const b = { path: "b", hash: "2" };

  it("並び順によらず同じ値になる", () => {
    expect(combineFingerprint([a, b], "x")).toBe(combineFingerprint([b, a], "x"));
  });

  it("中身・ファイルの増減・extra が変われば値も変わる", () => {
    const base = combineFingerprint([a, b], "x");
    expect(combineFingerprint([a, { path: "b", hash: "3" }], "x")).not.toBe(base);
    expect(combineFingerprint([a], "x")).not.toBe(base);
    expect(combineFingerprint([a, b], "y")).not.toBe(base);
  });
});

describe("CHECK_STEPS", () => {
  it("工程の名前は重ならず、入力のフォルダ・ファイルはリポジトリにある", () => {
    const ids = CHECK_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const step of CHECK_STEPS) {
      for (const p of step.inputs.filter((x) => !x.startsWith("!"))) {
        expect(existsSync(join(ROOT, p)), `${step.id}: ${p}`).toBe(true);
      }
    }
  });
});
