import type { ExpenseDivisor, ExpenseEstimate, FactionExpense } from "../types";

/**
 * 会派の政務活動費（区の「政務活動費収支一覧」）。
 *
 * 区は政務活動費を会派に交付しており、議員1人ひとりの金額は公表していない。
 * そこで「支出合計 ÷ 人数」を1人あたりの「目安」として添える。年度の途中で
 * 人数が変わった会派は、交付額から期間を通した平均の人数を出して割る
 * （resolveExpenseDivisor）。画面では必ず「目安」と書き、収支一覧の注記を
 * あわせて出す。
 */

/**
 * 政務活動費の交付額（議員1人・1か月あたり）。区の収支一覧の交付額は、どの会派・
 * 年度も「人数 × 月数 × この額」になっている（令和3〜7年度で確認）。
 */
export const MONTHLY_GRANT_PER_MEMBER = 150_000;

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

/** 収支一覧の期間の月数（period_start〜period_end。両端の月を含む）。 */
export function countPeriodMonths(
  periodStart: string,
  periodEnd: string
): number {
  const [startYear, startMonth] = periodStart.split("-").map(Number);
  const [endYear, endMonth] = periodEnd.split("-").map(Number);
  return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
}

/**
 * 割る人数を決める。収支一覧の人数は期間の終わりの人数なので、年度の途中で
 * 人数が変わった会派をそれで割ると、目安が大きくずれる（例：4人だった期間が
 * 8か月ある会派を3人で割る）。交付額は「人数 × 月数 × 15万円」なので、そこから
 * 平均の人数を出して割る。交付額がこの形になっていなければ、収支一覧の人数を使う。
 */
export function resolveExpenseDivisor(
  expense: Pick<
    FactionExpense,
    "member_count" | "income" | "period_start" | "period_end"
  >
): ExpenseDivisor | null {
  const months = countPeriodMonths(expense.period_start, expense.period_end);
  const personMonths = expense.income / MONTHLY_GRANT_PER_MEMBER;
  if (months > 0 && expense.income > 0 && Number.isInteger(personMonths)) {
    const average = personMonths / months;
    if (expense.member_count !== null && average === expense.member_count) {
      return { value: expense.member_count, basis: "member_count" };
    }
    return { value: average, basis: "average" };
  }
  if (!expense.member_count || expense.member_count <= 0) return null;
  return { value: expense.member_count, basis: "member_count" };
}

/**
 * 1人あたりの目安（円、四捨五入）。人数が分からない・0人なら null。
 * 区が公表している金額ではないので、画面では「目安」と明記すること。
 */
export function estimatePerMemberExpense(
  totalExpense: number,
  divisor: ExpenseDivisor | null
): number | null {
  if (!divisor || divisor.value <= 0) return null;
  return Math.round(totalExpense / divisor.value);
}

/** 「9人」「平均3.73人」（平均は小数2桁まで） */
export function formatExpenseDivisor(divisor: ExpenseDivisor): string {
  if (divisor.basis === "member_count") return `${divisor.value}人`;
  return `平均${Math.round(divisor.value * 100) / 100}人`;
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

/** 1人あたりの目安を出すのに要る、収支一覧の1期間分の最小限。 */
export type ExpenseEstimateSource = Pick<
  FactionExpense,
  | "fiscal_year"
  | "period_label"
  | "period_start"
  | "period_end"
  | "total_expense"
  | "member_count"
  | "income"
>;

/**
 * 会派の収支一覧のうち、議員がその会派にいた期間（windowStart）にかかる
 * いちばん新しい期間から、1人あたりの目安を出す。かかる期間が無ければ null
 * （結成したばかりの会派・会派に属していない議員など）。
 *
 * 議員のページの「所属会派の政務活動費」の先頭と同じ期間を選ぶので、一覧の
 * カードとページで数が食い違わない。
 */
export function latestExpenseEstimate(
  expenses: readonly ExpenseEstimateSource[],
  windowStart: string | null
): ExpenseEstimate | null {
  const [latest] = sortExpensesNewestFirst(
    selectExpensesInWindow(expenses, windowStart)
  );
  if (!latest) return null;
  const divisor = resolveExpenseDivisor(latest);
  return {
    fiscalYear: latest.fiscal_year,
    periodLabel: latest.period_label,
    totalExpense: latest.total_expense,
    memberCount: latest.member_count,
    divisor,
    perMember: estimatePerMemberExpense(latest.total_expense, divisor),
  };
}

/** 令和元年度（2019年度）より前は西暦で書く。 */
const REIWA_FIRST_FISCAL_YEAR = 2019;

/** 2025 → 「令和7年度」、2019 → 「令和元年度」。 */
export function formatFiscalYear(fiscalYear: number): string {
  if (fiscalYear < REIWA_FIRST_FISCAL_YEAR) return `${fiscalYear}年度`;
  const year = fiscalYear - REIWA_FIRST_FISCAL_YEAR + 1;
  return `令和${year === 1 ? "元" : year}年度`;
}

const yenFormat = new Intl.NumberFormat("ja-JP");

/** 1234567 → 「1,234,567円」 */
export function formatYen(amount: number): string {
  return `${yenFormat.format(amount)}円`;
}

/** 大きく出す数字を、前置き・数字・単位に分けたもの（数字だけを大きく出す）。 */
export type FigureParts = {
  /** 「約」など。無ければ空 */
  prefix: string;
  value: string;
  unit: string;
};

/** 「約170万円」を、数字だけ大きく出せるように分けたもの。 */
export type ApproxYenParts = FigureParts & { unit: "万円" | "円" };

/**
 * 金額を万円に丸めて分ける（1,699,623 → 約・170・万円）。1万円未満は
 * 丸めずに円で出す（0 → 0・円）。カードの小さな数字に使う。正確な金額は
 * 議員のページに formatYen で出す。
 */
export function splitApproxManYen(amount: number): ApproxYenParts {
  if (Math.abs(amount) < 10_000) {
    return { prefix: "", value: yenFormat.format(amount), unit: "円" };
  }
  const man = Math.round(amount / 10_000);
  return {
    prefix: man * 10_000 === amount ? "" : "約",
    value: yenFormat.format(man),
    unit: "万円",
  };
}

/** 1,699,623 → 「約170万円」 */
export function formatApproxManYen(amount: number): string {
  const { prefix, value, unit } = splitApproxManYen(amount);
  return `${prefix}${value}${unit}`;
}

/** カード・数字のタイルに出す、政務活動費の目安の数字と一言。 */
export type ExpenseFigure = {
  /** 1人あたりの目安（万円に丸めたもの）。出せなければ null（画面では「—」） */
  figure: ApproxYenParts | null;
  /** 年度と数え方、または出せない理由 */
  note: string;
};

/**
 * 1人あたりの目安を、カード・タイル用の数字と一言にする。出せないときは
 * 理由を書く（会派に属していない・収支一覧がまだ無い・人数が分からない）。
 */
export function describeExpenseEstimate(
  estimate: ExpenseEstimate | null,
  hasFaction: boolean
): ExpenseFigure {
  if (!hasFaction) return { figure: null, note: "会派に属していません" };
  if (!estimate) return { figure: null, note: "収支一覧はまだありません" };
  const fiscalYear = formatFiscalYear(estimate.fiscalYear);
  if (estimate.perMember === null) {
    return { figure: null, note: `${fiscalYear}・人数が分かりません` };
  }
  return {
    figure: splitApproxManYen(estimate.perMember),
    note:
      estimate.divisor?.basis === "average"
        ? `${fiscalYear}・会派の支出÷平均の人数`
        : `${fiscalYear}・会派の支出÷人数`,
  };
}
