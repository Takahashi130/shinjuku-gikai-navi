import { describe, expect, it } from "vitest";
import {
  isOnOrAfter,
  resolveMembershipWindowStart,
  sortMembershipsNewestFirst,
} from "./membership-window";

const period = (
  factionId: string,
  firstSeenOn: string,
  lastSeenOn: string
) => ({
  faction_id: factionId,
  first_seen_on: firstSeenOn,
  last_seen_on: lastSeenOn,
});

const TERM_START = "2023-05-01";

describe("resolveMembershipWindowStart", () => {
  // 1期目の議員に、当選する前の会派の賛否を付けない。
  it("会派を移っていない1期目の議員は任期の始まりから", () => {
    expect(
      resolveMembershipWindowStart({
        memberships: [period("jimin", "2023-06-13", "2026-10-04")],
        currentFactionId: "jimin",
        termStart: TERM_START,
      })
    ).toBe(TERM_START);
  });

  it("前の任期から同じ会派の議員は、資料で最初に確認できた日から", () => {
    expect(
      resolveMembershipWindowStart({
        memberships: [period("komei", "2019-06-13", "2026-10-04")],
        currentFactionId: "komei",
        termStart: TERM_START,
      })
    ).toBe("2019-06-13");
  });

  // 移った正確な日は区の資料に無いので、今の会派で確認できた日から数える。
  it("会派を移った議員は、今の会派で最初に確認できた日から", () => {
    expect(
      resolveMembershipWindowStart({
        memberships: [
          period("sansei", "2023-06-13", "2025-02-26"),
          period("jimin", "2025-06-11", "2026-10-04"),
        ],
        currentFactionId: "jimin",
        termStart: TERM_START,
      })
    ).toBe("2025-06-11");
  });

  it("前の任期で別の会派にいた議員も、今の会派で確認できた日から", () => {
    expect(
      resolveMembershipWindowStart({
        memberships: [
          period("startup", "2019-06-13", "2023-02-22"),
          period("mirai", "2023-06-13", "2026-10-04"),
        ],
        currentFactionId: "mirai",
        termStart: TERM_START,
      })
    ).toBe("2023-06-13");
  });

  it("所属の記録が無ければ任期の始まりから", () => {
    expect(
      resolveMembershipWindowStart({
        memberships: [],
        currentFactionId: "komei",
        termStart: TERM_START,
      })
    ).toBe(TERM_START);
  });

  it("任期も分からなければ確認できた日、どちらも無ければ区切らない", () => {
    expect(
      resolveMembershipWindowStart({
        memberships: [period("komei", "2024-01-01", "2026-10-04")],
        currentFactionId: "komei",
        termStart: null,
      })
    ).toBe("2024-01-01");
    expect(
      resolveMembershipWindowStart({
        memberships: [],
        currentFactionId: "komei",
        termStart: null,
      })
    ).toBeNull();
  });

  it("会派に属していなければ任期の始まり", () => {
    expect(
      resolveMembershipWindowStart({
        memberships: [],
        currentFactionId: null,
        termStart: TERM_START,
      })
    ).toBe(TERM_START);
  });
});

describe("isOnOrAfter", () => {
  it("始まりの日を含む", () => {
    expect(isOnOrAfter("2025-06-11", "2025-06-11")).toBe(true);
    expect(isOnOrAfter("2025-06-10", "2025-06-11")).toBe(false);
    expect(isOnOrAfter("2019-01-01", null)).toBe(true);
  });
});

describe("sortMembershipsNewestFirst", () => {
  it("今の会派を先に、続けて新しい順に並べる", () => {
    const sorted = sortMembershipsNewestFirst([
      { id: "a", first_seen_on: "2019-06-12", is_current: false },
      { id: "c", first_seen_on: "2025-06-11", is_current: true },
      { id: "b", first_seen_on: "2024-02-22", is_current: false },
    ]);
    expect(sorted.map((m) => m.id)).toEqual(["c", "b", "a"]);
  });
});
