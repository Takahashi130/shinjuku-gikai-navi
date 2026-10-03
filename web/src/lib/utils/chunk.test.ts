import { describe, expect, it } from "vitest";
import { chunk } from "./chunk";

describe("chunk", () => {
  it("指定した件数ずつに分ける（最後は余り）", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("空配列は空配列を返す", () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it("件数がちょうど割り切れる場合", () => {
    expect(chunk(["a", "b", "c", "d"], 2)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("size が 0 以下ならエラー", () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});
