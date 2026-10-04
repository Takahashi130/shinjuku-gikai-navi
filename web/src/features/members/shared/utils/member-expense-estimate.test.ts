import { describe, expect, it } from "vitest";
import { buildMemberExpenseEstimates } from "./member-expense-estimate";

const TERM_START = "2023-05-01";

const expense = (
  factionId: string | null,
  fiscalYear: number,
  periodStart: string,
  periodEnd: string,
  total: number,
  count: number | null
) => ({
  faction_id: factionId,
  fiscal_year: fiscalYear,
  period_label: `${periodStart}〜${periodEnd}`,
  period_start: periodStart,
  period_end: periodEnd,
  total_expense: total,
  member_count: count,
  // 人数が期間を通して変わらない交付額（人数 × 12か月 × 15万円）
  income: (count ?? 0) * 12 * 150_000,
});

const expenses = [
  expense("jimin", 2024, "2024-04-01", "2025-03-31", 13_579_187, 8),
  expense("jimin", 2025, "2025-04-01", "2026-03-31", 15_296_611, 9),
  expense("kyosan", 2025, "2025-04-01", "2026-03-31", 12_135_127, 7),
  // 会派に結び付かなかった行（名前を引けなかったなど）は使わない
  expense(null, 2025, "2025-04-01", "2026-03-31", 1, 1),
];

describe("buildMemberExpenseEstimates", () => {
  it("今の会派のいちばん新しい期間の1人あたりの目安を出す", () => {
    const estimates = buildMemberExpenseEstimates({
      members: [
        { id: "a", factionId: "jimin" },
        { id: "b", factionId: "kyosan" },
      ],
      memberships: [
        {
          member_id: "a",
          faction_id: "jimin",
          first_seen_on: "2019-06-12",
          last_seen_on: "2026-09-17",
        },
      ],
      expenses,
      termStart: TERM_START,
    });

    expect(estimates.get("a")).toMatchObject({
      fiscalYear: 2025,
      perMember: 1_699_623,
    });
    // 所属の記録が無くても、任期の始まりから数える
    expect(estimates.get("b")).toMatchObject({
      fiscalYear: 2025,
      perMember: 1_733_590,
    });
  });

  it("会派に属していない議員は null", () => {
    const estimates = buildMemberExpenseEstimates({
      members: [{ id: "a", factionId: null }],
      memberships: [],
      expenses,
      termStart: TERM_START,
    });
    expect(estimates.get("a")).toBeNull();
  });

  // 新しい会派（収支一覧がまだ無い）に移った議員に、前の会派の収支を付けない。
  it("今の会派の収支一覧が会派にいた期間に無ければ null", () => {
    const estimates = buildMemberExpenseEstimates({
      members: [{ id: "a", factionId: "update" }],
      memberships: [
        {
          member_id: "a",
          faction_id: "jimin",
          first_seen_on: "2019-11-28",
          last_seen_on: "2026-02-25",
        },
        {
          member_id: "a",
          faction_id: "update",
          first_seen_on: "2026-09-17",
          last_seen_on: "2026-10-04",
        },
      ],
      expenses,
      termStart: TERM_START,
    });
    expect(estimates.get("a")).toBeNull();
  });

  // 会派を移った議員は、移ったあとの期間にかかるものだけを見る。
  it("会派を移った議員は、移ったあとにかかる期間を使う", () => {
    const estimates = buildMemberExpenseEstimates({
      members: [{ id: "a", factionId: "jimin" }],
      memberships: [
        {
          member_id: "a",
          faction_id: "sansei",
          first_seen_on: "2023-06-13",
          last_seen_on: "2025-02-26",
        },
        {
          member_id: "a",
          faction_id: "jimin",
          first_seen_on: "2026-06-11",
          last_seen_on: "2026-10-04",
        },
      ],
      expenses,
      termStart: TERM_START,
    });
    // 令和7年度（〜2026-03-31）は移る前に終わっているので付けない
    expect(estimates.get("a")).toBeNull();
  });
});
