import { describe, expect, it } from "vitest";
import {
  buildExpenseBreakdown,
  EXPENSE_CATEGORIES,
  estimatePerMemberExpense,
  formatYen,
  selectExpensesInWindow,
  sortExpensesNewestFirst,
} from "./faction-expenses";

const zeroCategories = Object.fromEntries(
  EXPENSE_CATEGORIES.map(({ key }) => [key, 0])
) as Record<(typeof EXPENSE_CATEGORIES)[number]["key"], number>;

describe("estimatePerMemberExpense", () => {
  it("支出合計を人数で割り、円未満を四捨五入する", () => {
    // 令和7年度の自民・参政クラブ（9人・15,296,611円）
    expect(estimatePerMemberExpense(15_296_611, 9)).toBe(1_699_623);
  });

  it("人数が分からない・0人なら出さない", () => {
    expect(estimatePerMemberExpense(1000, null)).toBeNull();
    expect(estimatePerMemberExpense(1000, 0)).toBeNull();
  });
});

describe("buildExpenseBreakdown", () => {
  it("収支一覧の列の順に、金額と支出合計に占める割合を出す", () => {
    const breakdown = buildExpenseBreakdown({
      ...zeroCategories,
      publicity_expense: 750,
      office_expense: 250,
      total_expense: 1000,
    });
    expect(breakdown.map((item) => item.label)).toEqual([
      "調査研究費",
      "研修費",
      "広報費",
      "広聴費",
      "要請・陳情活動費",
      "会議費",
      "資料費",
      "人件費",
      "事務費",
    ]);
    expect(breakdown.find((item) => item.key === "publicity_expense")).toEqual({
      key: "publicity_expense",
      label: "広報費",
      amount: 750,
      percent: 75,
    });
  });

  it("支出が0なら割合も0", () => {
    const breakdown = buildExpenseBreakdown({
      ...zeroCategories,
      total_expense: 0,
    });
    expect(breakdown.every((item) => item.percent === 0)).toBe(true);
  });
});

describe("sortExpensesNewestFirst", () => {
  // 改選の年度（令和5年度）は4月分と5月〜3月分の2つに分かれている。
  it("期間の始まりの新しい順に並べる", () => {
    const sorted = sortExpensesNewestFirst([
      { period_start: "2023-04-01" },
      { period_start: "2025-04-01" },
      { period_start: "2023-05-01" },
    ]);
    expect(sorted.map((e) => e.period_start)).toEqual([
      "2025-04-01",
      "2023-05-01",
      "2023-04-01",
    ]);
  });
});

describe("selectExpensesInWindow", () => {
  const expenses = [
    { id: "r5-april", period_end: "2023-04-30" },
    { id: "r5", period_end: "2024-03-31" },
    { id: "r7", period_end: "2026-03-31" },
  ];

  // 1期目の議員（任期の始まり 2023-05-01）に、改選前の4月分を付けない。
  it("期間の終わりが始まりの日より前のものを外す", () => {
    expect(
      selectExpensesInWindow(expenses, "2023-05-01").map((e) => e.id)
    ).toEqual(["r5", "r7"]);
  });

  it("始まりが無ければすべて残す", () => {
    expect(selectExpensesInWindow(expenses, null)).toHaveLength(3);
  });
});

describe("formatYen", () => {
  it("3桁ごとに区切って円を付ける", () => {
    expect(formatYen(15_296_611)).toBe("15,296,611円");
    expect(formatYen(0)).toBe("0円");
  });
});
