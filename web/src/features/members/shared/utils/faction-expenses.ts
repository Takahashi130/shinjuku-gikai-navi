import type { FactionExpense } from "../types";

/**
 * 会派の政務活動費（区の「政務活動費収支一覧」）。
 *
 * 区は政務活動費を会派に交付しており、議員1人ひとりの金額は公表していない。
 * そこで「支出合計 ÷ 収支一覧の人数」を1人あたりの「目安」として添える。
 * 年度の途中で人数が変わった会派もあるので、画面では必ず「目安」と書き、
 * 収支一覧の注記をあわせて出す。
 */

/** 費目（収支一覧の列の順）。 */
export const EXPENSE_CATEGORIES = [
  { key: "research_expense", label: "調査研究費" },
  { key: "training_expense", label: "研修費" },
  { key: "publicity_expense", label: "広報費" },
  { key: "hearing_expense", label: "広聴費" },
  { key: "petition_expense", label: "要請・陳情活動費" },
  { key: "meeting_expense", label: "会議費" },
  { key: "materials_expense", label: "資料費" },
  { key: "personnel_expense", label: "人件費" },
  { key: "office_expense", label: "事務費" },
] as const satisfies readonly { key: keyof FactionExpense; label: string }[];

export type ExpenseCategoryKey = (typeof EXPENSE_CATEGORIES)[number]["key"];

export type ExpenseBreakdownItem = {
  key: ExpenseCategoryKey;
  label: string;
  amount: number;
  /** 支出合計に占める割合（0〜100、小数1桁）。支出が0なら0 */
  percent: number;
};

/**
 * 1人あたりの目安（円、四捨五入）。人数が分からない・0人なら null。
 * 区が公表している金額ではないので、画面では「目安」と明記すること。
 */
export function estimatePerMemberExpense(
  totalExpense: number,
  memberCount: number | null
): number | null {
  if (!memberCount || memberCount <= 0) return null;
  return Math.round(totalExpense / memberCount);
}

/** 費目ごとの内訳を、収支一覧の列の順に並べる。 */
export function buildExpenseBreakdown(
  expense: Pick<FactionExpense, ExpenseCategoryKey | "total_expense">
): ExpenseBreakdownItem[] {
  return EXPENSE_CATEGORIES.map(({ key, label }) => {
    const amount = expense[key];
    return {
      key,
      label,
      amount,
      percent:
        expense.total_expense > 0
          ? Math.round((amount / expense.total_expense) * 1000) / 10
          : 0,
    };
  });
}

/** 新しい期間から並べる。 */
export function sortExpensesNewestFirst<
  T extends Pick<FactionExpense, "period_start">,
>(expenses: readonly T[]): T[] {
  return [...expenses].sort((a, b) =>
    b.period_start.localeCompare(a.period_start)
  );
}

/**
 * 議員がその会派にいた期間（resolveMembershipWindowStart）にかかる期間だけを残す。
 * 期間の終わりが始まりの日より前のもの（入る前の年度）は、その議員に結び付けない。
 */
export function selectExpensesInWindow<
  T extends Pick<FactionExpense, "period_end">,
>(expenses: readonly T[], windowStart: string | null): T[] {
  return expenses.filter(
    (expense) => windowStart === null || expense.period_end >= windowStart
  );
}

const yenFormat = new Intl.NumberFormat("ja-JP");

/** 1234567 → 「1,234,567円」 */
export function formatYen(amount: number): string {
  return `${yenFormat.format(amount)}円`;
}
