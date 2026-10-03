import { describe, expect, it } from "vitest";
import { formatBillsResultCount } from "./format-bills-result-count";
import { getPageInfo } from "./pagination";

describe("formatBillsResultCount", () => {
  it("ページが複数あるときは表示中の範囲を添える", () => {
    expect(formatBillsResultCount(getPageInfo(940, 2, 30))).toBe(
      "940件の議案（31〜60件目）"
    );
  });

  it("最終ページは件数の末尾までの範囲になる", () => {
    expect(formatBillsResultCount(getPageInfo(940, 32, 30))).toBe(
      "940件の議案（931〜940件目）"
    );
  });

  it("1ページに収まるときは件数だけ", () => {
    expect(formatBillsResultCount(getPageInfo(28, 1, 30))).toBe("28件の議案");
  });

  it("0件でも件数だけを出す", () => {
    expect(formatBillsResultCount(getPageInfo(0, 1, 30))).toBe("0件の議案");
  });
});
