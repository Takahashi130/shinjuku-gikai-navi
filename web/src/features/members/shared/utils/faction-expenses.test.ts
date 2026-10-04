import { describe, expect, it } from "vitest";
import {
  buildExpenseBreakdown,
  countPeriodMonths,
  describeExpenseEstimate,
  EXPENSE_CATEGORIES,
  type ExpenseEstimateSource,
  estimatePerMemberExpense,
  formatApproxManYen,
  formatExpenseDivisor,
  formatFiscalYear,
  formatYen,
  latestExpenseEstimate,
  resolveExpenseDivisor,
  selectExpensesInWindow,
  sortExpensesNewestFirst,
  splitApproxManYen,
} from "./faction-expenses";

const zeroCategories = Object.fromEntries(
  EXPENSE_CATEGORIES.map(({ key }) => [key, 0])
) as Record<(typeof EXPENSE_CATEGORIES)[number]["key"], number>;

describe("estimatePerMemberExpense", () => {
  it("支出合計を人数で割り、円未満を四捨五入する", () => {
    // 令和7年度の新宿区議会公明党（8人・5,845,812円）
    expect(
      estimatePerMemberExpense(5_845_812, { value: 8, basis: "member_count" })
    ).toBe(730_727);
  });

  it("人数が分からない・0人なら出さない", () => {
    expect(estimatePerMemberExpense(1000, null)).toBeNull();
    expect(
      estimatePerMemberExpense(1000, { value: 0, basis: "member_count" })
    ).toBeNull();
  });
});

describe("countPeriodMonths", () => {
  it("両端の月を含めて数える", () => {
    expect(countPeriodMonths("2025-04-01", "2026-03-31")).toBe(12);
    expect(countPeriodMonths("2023-05-01", "2024-03-31")).toBe(11);
    expect(countPeriodMonths("2023-04-01", "2023-04-30")).toBe(1);
  });
});

describe("resolveExpenseDivisor", () => {
  const row = (
    income: number,
    count: number | null,
    start = "2025-04-01",
    end = "2026-03-31"
  ) => ({
    income,
    member_count: count,
    period_start: start,
    period_end: end,
  });

  it("人数が変わっていなければ、収支一覧の人数で割る", () => {
    // 8人 × 12か月 × 15万円
    expect(resolveExpenseDivisor(row(14_400_000, 8))).toEqual({
      value: 8,
      basis: "member_count",
    });
  });

  // 立憲民主党・無所属クラブの令和5年5月〜令和6年3月分：4人が8か月・3人が3か月。
  // 収支一覧の人数（3人）で割ると、目安が約205万円にずれる
  it("年度の途中で人数が変わった会派は、交付額から出した平均の人数で割る", () => {
    const divisor = resolveExpenseDivisor(
      row(6_150_000, 3, "2023-05-01", "2024-03-31")
    );
    expect(divisor?.basis).toBe("average");
    expect(divisor?.value).toBeCloseTo(41 / 11);
    expect(estimatePerMemberExpense(6_147_029, divisor)).toBe(1_649_203);
  });

  it("交付額が「人数 × 月数 × 15万円」になっていなければ、収支一覧の人数を使う", () => {
    expect(resolveExpenseDivisor(row(1_234_567, 3))).toEqual({
      value: 3,
      basis: "member_count",
    });
    expect(resolveExpenseDivisor(row(0, null))).toBeNull();
  });
});

describe("formatExpenseDivisor", () => {
  it("平均の人数は小数2桁までで「平均」と書く", () => {
    expect(formatExpenseDivisor({ value: 9, basis: "member_count" })).toBe(
      "9人"
    );
    expect(formatExpenseDivisor({ value: 41 / 11, basis: "average" })).toBe(
      "平均3.73人"
    );
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

describe("latestExpenseEstimate", () => {
  const period = (
    fiscalYear: number,
    start: string,
    end: string,
    total: number,
    count: number | null,
    income = (count ?? 0) * countPeriodMonths(start, end) * 150_000
  ): ExpenseEstimateSource => ({
    fiscal_year: fiscalYear,
    period_label: `${start}〜${end}`,
    period_start: start,
    period_end: end,
    total_expense: total,
    member_count: count,
    income,
  });
  const expenses = [
    period(2024, "2024-04-01", "2025-03-31", 13_579_187, 8),
    period(2025, "2025-04-01", "2026-03-31", 15_296_611, 9),
    period(2023, "2023-05-01", "2024-03-31", 11_800_275, 8),
  ];

  it("いちばん新しい期間の1人あたりの目安を出す", () => {
    expect(latestExpenseEstimate(expenses, null)).toEqual({
      fiscalYear: 2025,
      periodLabel: "2025-04-01〜2026-03-31",
      totalExpense: 15_296_611,
      memberCount: 9,
      divisor: { value: 9, basis: "member_count" },
      perMember: 1_699_623,
    });
  });

  // 令和7年度の自民・参政クラブ：4月9日まで8人、4月10日から9人（交付は107人月）
  it("年度の途中で人数が変わった会派は、平均の人数で割った目安を出す", () => {
    const estimate = latestExpenseEstimate(
      [period(2025, "2025-04-01", "2026-03-31", 15_296_611, 9, 16_050_000)],
      null
    );
    expect(estimate?.divisor?.basis).toBe("average");
    expect(estimate?.perMember).toBe(1_715_508);
  });

  // 結成したばかりの会派に移った議員に、移る前の会派の収支を付けない。
  it("会派にいた期間にかかる期間が無ければ null", () => {
    expect(latestExpenseEstimate(expenses, "2026-07-01")).toBeNull();
    expect(latestExpenseEstimate([], null)).toBeNull();
  });

  it("人数が分からなければ、目安は null のまま期間を返す", () => {
    expect(
      latestExpenseEstimate(
        [period(2025, "2025-04-01", "2026-03-31", 1000, null)],
        null
      )
    ).toMatchObject({ fiscalYear: 2025, perMember: null });
  });
});

describe("formatFiscalYear", () => {
  it("令和の年度にする", () => {
    expect(formatFiscalYear(2025)).toBe("令和7年度");
    expect(formatFiscalYear(2020)).toBe("令和2年度");
  });

  it("令和元年度は「元」と書き、それより前は西暦にする", () => {
    expect(formatFiscalYear(2019)).toBe("令和元年度");
    expect(formatFiscalYear(2018)).toBe("2018年度");
  });
});

describe("splitApproxManYen / formatApproxManYen", () => {
  it("万円に丸め、丸めたときは「約」を付ける", () => {
    expect(splitApproxManYen(1_699_623)).toEqual({
      prefix: "約",
      value: "170",
      unit: "万円",
    });
    expect(formatApproxManYen(1_745_168)).toBe("約175万円");
    expect(formatApproxManYen(12_345_678)).toBe("約1,235万円");
  });

  it("ちょうど万円なら「約」を付けない", () => {
    expect(formatApproxManYen(1_800_000)).toBe("180万円");
  });

  it("1万円未満は丸めずに円で出す", () => {
    expect(formatApproxManYen(0)).toBe("0円");
    expect(splitApproxManYen(9_999)).toEqual({
      prefix: "",
      value: "9,999",
      unit: "円",
    });
  });
});

describe("describeExpenseEstimate", () => {
  const estimate = {
    fiscalYear: 2025,
    periodLabel: "令和7年4月～令和8年3月分",
    totalExpense: 15_296_611,
    memberCount: 9,
    divisor: { value: 9, basis: "member_count" as const },
    perMember: 1_699_623,
  };

  it("年度と数え方を添えて、万円に丸めた目安を出す", () => {
    expect(describeExpenseEstimate(estimate, true)).toEqual({
      figure: { prefix: "約", value: "170", unit: "万円" },
      note: "令和7年度・会派の支出÷人数",
    });
  });

  it("平均の人数で割ったときは、そう書く", () => {
    expect(
      describeExpenseEstimate(
        {
          ...estimate,
          divisor: { value: 107 / 12, basis: "average" },
          perMember: 1_715_508,
        },
        true
      ).note
    ).toBe("令和7年度・会派の支出÷平均の人数");
  });

  it("出せないときは数字を出さず、理由を書く", () => {
    expect(describeExpenseEstimate(null, false)).toEqual({
      figure: null,
      note: "会派に属していません",
    });
    expect(describeExpenseEstimate(null, true)).toEqual({
      figure: null,
      note: "収支一覧はまだありません",
    });
    expect(
      describeExpenseEstimate({ ...estimate, perMember: null }, true)
    ).toEqual({ figure: null, note: "令和7年度・人数が分かりません" });
  });
});
