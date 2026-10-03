import { describe, expect, it } from "vitest";
import { stableStringify } from "./stable-json";

describe("stableStringify", () => {
  it("キーの順番が違っても同じ文字列になる", () => {
    expect(stableStringify({ b: 1, a: { d: [1, 2], c: "x" } })).toBe(
      stableStringify({ a: { c: "x", d: [1, 2] }, b: 1 })
    );
  });

  it("配列の順番は保つ", () => {
    expect(stableStringify([2, 1])).toBe("[2,1]");
  });

  it("undefined のキーは除き、null は残す", () => {
    expect(stableStringify({ a: undefined, b: null })).toBe('{"b":null}');
  });
});
