import { describe, expect, it } from "vitest";
import {
  approxFigureMatches,
  extractFigures,
  figureInMaterial,
  indexMaterialFigures,
  isIgnorableFigure,
} from "./extract-figures";

const keys = (text: string) => extractFigures(text).map((f) => f.key);

describe("extractFigures（金額・数）", () => {
  it.each([
    ["契約金額 2億2,990万円", "N:229900000"],
    ["補正額 514,734千円", "N:514734000"],
    ["2 億 5,702 万 6,000 円", "N:257026000"],
    ["31 万 5,000 円", "N:315000"],
    ["5億7,062万7,369円", "N:570627369"],
    ["計 2 8 5 万 9 , 1 0 0 円", "N:2859100"],
    ["1千万円", "N:10000000"],
    ["550円から600円", "N:550"],
  ])("%s → %s", (text, key) => {
    expect(keys(text)).toContain(key);
  });

  it("空白で区切られた数は別の数として読む", () => {
    expect(keys("31,022,780 7,122")).toEqual(["N:31022780", "N:7122"]);
  });

  it("列の区切りが消えてくっついた数は、3桁区切りの形で分けて読む", () => {
    expect(keys("193,612,345,6781,234,567")).toEqual([
      "N:193612345678",
      "N:1234567",
    ]);
    expect(keys("歳入 1,0002,500 円")).toEqual(["N:1000", "N:2500"]);
  });

  it("小数に単位をかけても端数が出ない", () => {
    expect(keys("約2.3億円")).toEqual(["N:230000000"]);
    expect(keys("8.8億円")).toEqual(["N:880000000"]);
  });

  it("表示した最後の桁の位（step）と単位を読む", () => {
    const pick = (text: string) =>
      extractFigures(text).map(({ step, unit }) => ({ step, unit }));
    expect(pick("約1,936億円")).toEqual([{ step: 1e8, unit: "円" }]);
    expect(pick("約2.3億円")).toEqual([{ step: 1e7, unit: "円" }]);
    expect(pick("約5億1,473万円")).toEqual([{ step: 1e4, unit: "円" }]);
    expect(pick("514,734千円")).toEqual([{ step: 1e3, unit: "円" }]);
    // 整数の末尾の 0 は位取りとみなす
    expect(pick("約3,000名")).toEqual([{ step: 1e3, unit: "人" }]);
    expect(pick("約380億")).toEqual([{ step: 1e9, unit: null }]);
  });

  it("1桁の数（番号など）は照合しない", () => {
    const [f] = extractFigures("2つの施設");
    expect(isIgnorableFigure(f)).toBe(true);
  });

  it("「約」「程度」の付いた数に印を付ける", () => {
    expect(extractFigures("約2.3億円").map((f) => f.approx)).toEqual([true]);
    expect(extractFigures("2,000万円程度").map((f) => f.approx)).toEqual([
      true,
    ]);
    expect(extractFigures("2,000万円以上").map((f) => f.approx)).toEqual([
      false,
    ]);
  });
});

describe("extractFigures（日付）", () => {
  it.each([
    ["令和8年12月1日から", "D:2026-12-01"],
    ["令和 8 年 12 月 1 日", "D:2026-12-01"],
    ["2026年12月1日", "D:2026-12-01"],
    ["令和元年6月4日", "D:2019-06-04"],
    ["令和8年度", "FY:2026"],
    ["令和9年4月から", "YM:2027-04"],
    ["10月15日", "MD:10-15"],
    ["令和15年", "Y:2033"],
    ["12月から", "M:12"],
  ])("%s → %s", (text, key) => {
    expect(keys(text)).toContain(key);
  });

  it("日付の中の数は数としては数えない", () => {
    expect(keys("令和8年12月1日")).toEqual(["D:2026-12-01"]);
  });
});

describe("figureInMaterial", () => {
  const index = indexMaterialFigures([
    "契約金額 2 億 2,990 万円\n施行日 令和 8 年 12 月 1 日\n補正額 514,734千円",
  ]);

  it("表記が違っても同じ値なら資料にあるとみなす", () => {
    const [f] = extractFigures("229,900,000円");
    expect(figureInMaterial(f, index)).toBe(true);
  });

  it("資料の日付から、月日・年月・月だけの書き方も認める", () => {
    for (const text of ["12月1日", "令和8年12月", "2026年", "12月"]) {
      const [f] = extractFigures(text);
      expect(figureInMaterial(f, index), text).toBe(true);
    }
  });

  it("資料に無い数・日付は見つからない", () => {
    for (const text of ["3億円", "令和8年11月1日", "514,000千円"]) {
      const [f] = extractFigures(text);
      expect(figureInMaterial(f, index), text).toBe(false);
    }
  });

  it("「約」の付いた数は、表示した桁で丸めて資料の該当箇所の数と一致すればよい", () => {
    const [near] = extractFigures("約2.3億円");
    const [coarse] = extractFigures("約3億円");
    const [fine] = extractFigures("約2億2,980万円");
    // 2億2,990万 → 0.1億の位で四捨五入すると 2.3億
    expect(figureInMaterial(near, index)).toBe(true);
    // 1億の位では 2億（3億にはならない）
    expect(figureInMaterial(coarse, index)).toBe(false);
    // 細かく書くほど厳しくなる（10万の位では 2億2,990万のままで、2億2,980万にはならない）
    expect(figureInMaterial(fine, index)).toBe(false);
  });

  it("「約」の付いた数は、near（資料の該当箇所）だけと比べる", () => {
    // 資料のどこか（index）に 3億円ちょうどがあっても、該当箇所（near）に無ければ通さない
    const whole = indexMaterialFigures(["予備費 3 億円\n契約金額 2 億 2,990 万円"]);
    const near = indexMaterialFigures(["契約金額 2 億 2,990 万円"]);
    const [f] = extractFigures("約3億円");
    expect(figureInMaterial(f, whole)).toBe(true);
    expect(figureInMaterial(f, whole, near)).toBe(false);
    // 「約」の無い数は資料全体で探す
    const [exact] = extractFigures("3億円");
    expect(figureInMaterial(exact, whole, near)).toBe(true);
  });
});

describe("approxFigureMatches", () => {
  const material = (value: number, unit: string | null = "円") => ({
    value,
    unit,
  });
  const [f] = extractFigures("約1,936億円");

  it("四捨五入か切り捨てで一致すればよい", () => {
    // 1,935.5億以上 1,937億未満
    expect(approxFigureMatches(f, material(193_550_000_000))).toBe(true);
    expect(approxFigureMatches(f, material(193_612_345_678))).toBe(true);
    expect(approxFigureMatches(f, material(193_690_000_000))).toBe(true);
    expect(approxFigureMatches(f, material(193_540_000_000))).toBe(false);
    expect(approxFigureMatches(f, material(193_700_000_000))).toBe(false);
  });

  it("単位が両方に書かれていて食い違えば一致としない", () => {
    expect(approxFigureMatches(f, material(193_612_345_678, "人"))).toBe(
      false
    );
    // 表の数（単位が書かれていない）とは比べる
    expect(approxFigureMatches(f, material(193_612_345_678, null))).toBe(true);
  });

  it("末尾の 0 は位取りとみなす（約3,000人 → 2,500人以上 4,000人未満）", () => {
    const [people] = extractFigures("約3,000人");
    expect(approxFigureMatches(people, material(2_990, "人"))).toBe(true);
    expect(approxFigureMatches(people, material(3_950, null))).toBe(true);
    expect(approxFigureMatches(people, material(2_400, "人"))).toBe(false);
  });
});
