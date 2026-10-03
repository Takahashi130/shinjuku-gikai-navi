// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { hasReadExplainer, markExplainerRead } from "./explainer-read-flag";

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("explainer-read-flag", () => {
  it("印を付けた議案だけ true になる", () => {
    expect(hasReadExplainer("bill-1")).toBe(false);
    markExplainerRead("bill-1");
    expect(hasReadExplainer("bill-1")).toBe(true);
    expect(hasReadExplainer("bill-2")).toBe(false);
  });

  it("保存できない環境でも例外を出さず false を返す", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => markExplainerRead("bill-1")).not.toThrow();
    expect(hasReadExplainer("bill-1")).toBe(false);
  });
});
