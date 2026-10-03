import { describe, expect, it } from "vitest";
import { uniqueBy } from "./unique-by";

describe("uniqueBy", () => {
  it("同じ key の要素は最初のものだけ残す", () => {
    const rows = [
      { id: "a", v: 1 },
      { id: "b", v: 2 },
      { id: "a", v: 3 },
    ];

    expect(uniqueBy(rows, (row) => row.id)).toEqual([
      { id: "a", v: 1 },
      { id: "b", v: 2 },
    ]);
  });

  // ページの境目で重複した行を除いても、並び順は崩さない。
  it("並びを保つ", () => {
    const ids = ["c", "a", "c", "b", "a"];

    expect(uniqueBy(ids, (id) => id)).toEqual(["c", "a", "b"]);
  });

  it("重複が無ければそのまま", () => {
    expect(uniqueBy([1, 2, 3], (n) => n)).toEqual([1, 2, 3]);
  });

  it("空なら空", () => {
    expect(uniqueBy([], (n) => n)).toEqual([]);
  });

  it("元の配列は変えない", () => {
    const ids = ["a", "a"];
    uniqueBy(ids, (id) => id);
    expect(ids).toEqual(["a", "a"]);
  });
});
