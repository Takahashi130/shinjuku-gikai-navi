import { describe, expect, it } from "vitest";
import { extractBillNumber } from "./bill-number";

describe("extractBillNumber", () => {
  it("議決結果の添え書きから番号を読む", () => {
    const markdown = [
      "## 概要",
      "",
      "補正予算額：2億円（第2号）",
      "",
      "## 議決結果",
      "",
      "**可決**（第42号議案）",
    ].join("\n");

    // 概要にある「（第2号）」ではなく、議決結果の番号を取る
    expect(extractBillNumber(markdown)).toBe("第42号議案");
  });

  it.each([
    ["**認定**（認定第3号）", "認定第3号"],
    ["**同意**（同意第12号）", "同意第12号"],
    ["**可決**（議員提出議案第1号）", "議員提出議案第1号"],
  ])("番号の形が違っても読む：%s", (line, expected) => {
    expect(extractBillNumber(`## 議決結果\n\n${line}`)).toBe(expected);
  });

  it("審議中の議案は審議の状況の文から読む", () => {
    const markdown =
      "## 審議の状況\n\n令和8年第3回定例会で審議中です（第64号議案）。議決の結果は…";

    expect(extractBillNumber(markdown)).toBe("第64号議案");
  });

  it("番号らしくない添え書きは読まない", () => {
    expect(extractBillNumber("## 議決結果\n\n**可決**（全会一致）")).toBeNull();
  });

  it("番号が書かれていなければ null", () => {
    expect(extractBillNumber("## 概要\n\n本文だけ")).toBeNull();
    expect(extractBillNumber(null)).toBeNull();
  });
});
