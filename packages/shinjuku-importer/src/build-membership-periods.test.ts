import { describe, expect, it } from "vitest";
import { buildMembershipPeriods } from "./build-membership-periods";

describe("buildMembershipPeriods", () => {
  it("同じ会派が続く間を1つの期間にし、会派が変わったら新しい期間にする", () => {
    const periods = buildMembershipPeriods([
      { factionId: "B", date: "2024-02-21", source: "plenary_questions" },
      { factionId: "A", date: "2019-06-12", source: "plenary_questions" },
      { factionId: "A", date: "2020-02-19", source: "plenary_questions" },
      { factionId: "B", date: "2026-10-04", source: "faction_page" },
    ]);
    expect(periods).toEqual([
      {
        factionId: "A",
        firstSeenOn: "2019-06-12",
        lastSeenOn: "2020-02-19",
        isCurrent: false,
        observationCount: 2,
        sources: ["plenary_questions"],
      },
      {
        factionId: "B",
        firstSeenOn: "2024-02-21",
        lastSeenOn: "2026-10-04",
        isCurrent: true,
        observationCount: 2,
        sources: ["plenary_questions", "faction_page"],
      },
    ]);
  });

  it("A → B → A と戻った場合は3つの期間にする（間の移動日は推測しない）", () => {
    const periods = buildMembershipPeriods([
      { factionId: "A", date: "2020-01-01", source: "plenary_questions" },
      { factionId: "B", date: "2021-01-01", source: "plenary_questions" },
      { factionId: "A", date: "2022-01-01", source: "plenary_questions" },
    ]);
    expect(periods.map((p) => [p.factionId, p.firstSeenOn, p.lastSeenOn])).toEqual([
      ["A", "2020-01-01", "2020-01-01"],
      ["B", "2021-01-01", "2021-01-01"],
      ["A", "2022-01-01", "2022-01-01"],
    ]);
  });

  it("資料が無ければ空", () => {
    expect(buildMembershipPeriods([])).toEqual([]);
  });
});
