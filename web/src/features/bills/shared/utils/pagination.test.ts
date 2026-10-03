import { describe, expect, it } from "vitest";
import { getPageInfo, paginate, parsePageParam } from "./pagination";

describe("parsePageParam", () => {
  it("無ければ1ページ目", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("")).toBe(1);
  });

  it("正の整数はそのまま読む", () => {
    expect(parsePageParam("1")).toBe(1);
    expect(parsePageParam("3")).toBe(3);
    expect(parsePageParam("007")).toBe(7);
  });

  it("前後の空白は無視する", () => {
    expect(parsePageParam(" 2 ")).toBe(2);
  });

  // URL 直打ちでページを壊せないようにする。
  it("0・負数・小数・数字以外は1ページ目に倒す", () => {
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-2")).toBe(1);
    expect(parsePageParam("1.5")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("2abc")).toBe(1);
    expect(parsePageParam("１")).toBe(1);
    expect(parsePageParam("Infinity")).toBe(1);
  });

  // 最終ページへの丸めは件数が分かる getPageInfo で行う。
  it("大きすぎる番号は安全な整数で止める", () => {
    expect(parsePageParam("99999999999999999999")).toBe(
      Number.MAX_SAFE_INTEGER
    );
  });
});

describe("getPageInfo", () => {
  it("1ページ目の範囲", () => {
    expect(getPageInfo(95, 1, 30)).toEqual({
      page: 1,
      totalPages: 4,
      totalCount: 95,
      startIndex: 0,
      endIndex: 30,
      prevPage: null,
      nextPage: 2,
    });
  });

  it("途中のページの範囲", () => {
    expect(getPageInfo(95, 2, 30)).toMatchObject({
      page: 2,
      startIndex: 30,
      endIndex: 60,
      prevPage: 1,
      nextPage: 3,
    });
  });

  it("最終ページは件数の端で切れる", () => {
    expect(getPageInfo(95, 4, 30)).toMatchObject({
      page: 4,
      startIndex: 90,
      endIndex: 95,
      prevPage: 3,
      nextPage: null,
    });
  });

  it("割り切れるときに空のページを作らない", () => {
    expect(getPageInfo(60, 3, 30)).toMatchObject({
      page: 2,
      totalPages: 2,
      startIndex: 30,
      endIndex: 60,
    });
  });

  // 絞り込みで件数が減ったあとに古い URL が開かれても空のページにしない。
  it("最終ページを超えたら最終ページに丸める", () => {
    expect(getPageInfo(95, 100, 30)).toMatchObject({
      page: 4,
      prevPage: 3,
      nextPage: null,
    });
    expect(getPageInfo(95, Number.MAX_SAFE_INTEGER, 30)).toMatchObject({
      page: 4,
    });
  });

  it("1未満や数でない値は1ページ目に丸める", () => {
    expect(getPageInfo(95, 0, 30)).toMatchObject({ page: 1 });
    expect(getPageInfo(95, -3, 30)).toMatchObject({ page: 1 });
    expect(getPageInfo(95, Number.NaN, 30)).toMatchObject({ page: 1 });
  });

  it("小数は切り捨てる", () => {
    expect(getPageInfo(95, 2.7, 30)).toMatchObject({ page: 2 });
  });

  it("0件でも1ページとして扱い、範囲は空", () => {
    expect(getPageInfo(0, 5, 30)).toEqual({
      page: 1,
      totalPages: 1,
      totalCount: 0,
      startIndex: 0,
      endIndex: 0,
      prevPage: null,
      nextPage: null,
    });
  });

  it("perPage が正の整数でなければエラー", () => {
    expect(() => getPageInfo(10, 1, 0)).toThrow();
    expect(() => getPageInfo(10, 1, 2.5)).toThrow();
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 7 }, (_, i) => `bill-${i + 1}`);

  it("要求されたページの分だけ切り出す", () => {
    const result = paginate(items, 2, 3);

    expect(result.items).toEqual(["bill-4", "bill-5", "bill-6"]);
    expect(result.pageInfo).toMatchObject({ page: 2, totalPages: 3 });
  });

  it("最終ページは残りだけを返す", () => {
    expect(paginate(items, 3, 3).items).toEqual(["bill-7"]);
  });

  it("範囲外のページは丸めたページの分を返す", () => {
    expect(paginate(items, 10, 3).items).toEqual(["bill-7"]);
    expect(paginate(items, 0, 3).items).toEqual(["bill-1", "bill-2", "bill-3"]);
  });

  it("元の配列は変えない", () => {
    const before = [...items];
    paginate(items, 2, 3);
    expect(items).toEqual(before);
  });
});
