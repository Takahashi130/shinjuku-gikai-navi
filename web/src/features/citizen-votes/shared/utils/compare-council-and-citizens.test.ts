import { describe, expect, it } from "vitest";
import {
  compareCouncilAndCitizens,
  resolveCouncilDecision,
} from "./compare-council-and-citizens";

const FOR_MAJORITY = { for: 40, against: 10, total: 50 };
const AGAINST_MAJORITY = { for: 10, against: 40, total: 50 };

describe("resolveCouncilDecision", () => {
  it("議決前のステータスは未決", () => {
    expect(
      resolveCouncilDecision("in_originating_house", "r8-teirei-3-gian-63")
    ).toEqual({ decided: false });
    expect(resolveCouncilDecision("introduced", null)).toEqual({
      decided: false,
    });
  });

  it("ふつうの議案は可決／否決", () => {
    expect(resolveCouncilDecision("enacted", "r8-teirei-3-gian-63")).toEqual({
      decided: true,
      outcome: "passed",
      label: "可決",
    });
    expect(resolveCouncilDecision("rejected", "r8-teirei-3-giin-11")).toEqual({
      decided: true,
      outcome: "rejected",
      label: "否決",
    });
  });

  it("決算は認定／不認定、専決処分などは承認／不承認", () => {
    expect(
      resolveCouncilDecision("enacted", "r8-teirei-3-nintei-1")
    ).toMatchObject({
      label: "認定",
    });
    expect(
      resolveCouncilDecision("rejected", "r8-teirei-3-nintei-2")
    ).toMatchObject({
      label: "不認定",
    });
    expect(
      resolveCouncilDecision("enacted", "r7-rinji-1-shonin-1")
    ).toMatchObject({
      label: "承認",
    });
    expect(
      resolveCouncilDecision("rejected", "r7-rinji-1-shonin-1")
    ).toMatchObject({
      label: "不承認",
    });
  });
});

describe("compareCouncilAndCitizens", () => {
  it("議会：可決／区民：反対多数ならズレ（diverge）", () => {
    const result = compareCouncilAndCitizens({
      councilStatus: "enacted",
      billSlug: "r8-teirei-3-gian-63",
      beforeClose: AGAINST_MAJORITY,
    });
    expect(result.relation).toBe("diverge");
    expect(result.council).toMatchObject({ label: "可決" });
    expect(result.citizens).toEqual({
      verdict: "against_majority",
      label: "反対多数",
      total: 50,
    });
  });

  it("同じ向きなら一致（match）", () => {
    expect(
      compareCouncilAndCitizens({
        councilStatus: "enacted",
        billSlug: null,
        beforeClose: FOR_MAJORITY,
      }).relation
    ).toBe("match");
    expect(
      compareCouncilAndCitizens({
        councilStatus: "rejected",
        billSlug: null,
        beforeClose: AGAINST_MAJORITY,
      }).relation
    ).toBe("match");
  });

  it("否決／賛成多数もズレ", () => {
    expect(
      compareCouncilAndCitizens({
        councilStatus: "rejected",
        billSlug: null,
        beforeClose: FOR_MAJORITY,
      }).relation
    ).toBe("diverge");
  });

  it("区民の票が少なければ比べない", () => {
    expect(
      compareCouncilAndCitizens({
        councilStatus: "enacted",
        billSlug: null,
        beforeClose: { for: 1, against: 20, total: 21 },
      }).relation
    ).toBe("insufficient");
  });

  it("区民の票が拮抗なら close", () => {
    expect(
      compareCouncilAndCitizens({
        councilStatus: "enacted",
        billSlug: null,
        beforeClose: { for: 25, against: 25, total: 50 },
      }).relation
    ).toBe("close");
  });

  it("議会が議決していなければ undecided", () => {
    expect(
      compareCouncilAndCitizens({
        councilStatus: "in_receiving_house",
        billSlug: null,
        beforeClose: AGAINST_MAJORITY,
      }).relation
    ).toBe("undecided");
  });
});
