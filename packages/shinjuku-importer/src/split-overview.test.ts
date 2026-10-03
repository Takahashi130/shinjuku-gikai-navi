import { describe, expect, it } from "vitest";
import { normalizePageText, splitPagesByBill } from "./split-overview";

describe("normalizePageText", () => {
  it("2行に分かれた議案番号を1行にする", () => {
    expect(normalizePageText("第 67\n号議案\n新宿区の条例")).toBe("第67号議案\n新宿区の条例");
  });
});

describe("splitPagesByBill", () => {
  it("提出案件概要を議案ごとに分け、ページをまたぐ内容は前の議案の続きにする", () => {
    const byBill = splitPagesByBill([
      {
        page: 1,
        text: "令和 8 年\n提出案件概要\n議案番号 件 名 概 要\n第 67\n号議案\n条例Aの改正\n第 68\n号議案\n条例Bの改正",
      },
      { page: 2, text: "（条例関係）\n議案番号 件 名 概 要\n条例Bの続き\n第 69\n号議案\n条例C" },
      { page: 3, text: "（議決案件関係）\n議案番号 件 名 概 要\n第 70\n号議案\n契約D" },
    ]);
    expect([...byBill.keys()]).toEqual(["第67号議案", "第68号議案", "第69号議案", "第70号議案"]);
    // 区分の見出しだけのページは、前の議案に含めない
    expect(byBill.get("第69号議案")?.map((p) => p.page)).toEqual([2]);
    expect(byBill.get("第67号議案")).toEqual([{ page: 1, text: "第67号議案\n条例Aの改正" }]);
    expect(byBill.get("第68号議案")).toEqual([
      { page: 1, text: "第68号議案\n条例Bの改正" },
      { page: 2, text: "条例Bの続き" },
    ]);
  });

  it("補正予算概要は、ページの先頭の議案番号で分ける", () => {
    const byBill = splitPagesByBill([
      { page: 1, text: "第64号議案 令和8年9月\n一般会計(補正第5号)" },
      { page: 2, text: "6 子ども家庭費" },
      { page: 3, text: "第65号議案 令和8年9月\n介護保険特別会計" },
    ]);
    expect(byBill.get("第64号議案")?.map((p) => p.page)).toEqual([1, 2]);
    expect(byBill.get("第65号議案")?.map((p) => p.page)).toEqual([3]);
  });
});
