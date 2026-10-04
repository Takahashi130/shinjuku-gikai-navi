import { describe, expect, it } from "vitest";
import {
  factionJoinDateCandidates,
  findPreviousMembershipsInTerm,
  isOnOrAfter,
  resolveMembershipWindow,
  resolveMembershipWindowWithHistory,
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

describe("resolveMembershipWindow", () => {
  // 1期目の議員に、当選する前の会派の賛否を付けない。
  it("会派を移っていない1期目の議員は任期の始まりから", () => {
    expect(
      resolveMembershipWindow({
        memberships: [period("jimin", "2023-06-13", "2026-10-04")],
        currentFactionId: "jimin",
        termStart: TERM_START,
      })
    ).toEqual({ start: TERM_START, basis: "term_start" });
  });

  // 公明型：全員ずっと同じ会派なのに、最初に確認できた日（質問した日）で
  // 区切ると、議員ごとに数がそろわない
  it("前の任期から同じ会派の議員も、任期の始まりから（全員そろえる）", () => {
    const komei = [
      period("komei", "2019-06-13", "2026-10-04"),
      period("komei", "2019-09-20", "2026-10-04"),
      period("komei", "2020-06-10", "2026-10-04"),
    ].map((membership) =>
      resolveMembershipWindow({
        memberships: [membership],
        currentFactionId: "komei",
        termStart: TERM_START,
      })
    );
    expect(new Set(komei.map((w) => w.start))).toEqual(new Set([TERM_START]));
  });

  // ひやま型：任期の始まりより後に初めて確認された（質問が無かった）議員
  it("任期の始まりより後に初めて確認された議員も、移った記録が無ければ任期の始まりから", () => {
    expect(
      resolveMembershipWindow({
        memberships: [period("jimin", "2025-11-27", "2026-10-04")],
        currentFactionId: "jimin",
        termStart: TERM_START,
      })
    ).toEqual({ start: TERM_START, basis: "term_start" });
  });

  // 伊藤型：前の任期だけで終わった会派は「移った」とみなさない
  it("前の任期で別の会派にいた議員も、今の任期で移っていなければ任期の始まりから", () => {
    expect(
      resolveMembershipWindow({
        memberships: [
          period("startup", "2019-06-13", "2023-02-22"),
          period("mirai", "2023-06-13", "2026-10-04"),
        ],
        currentFactionId: "mirai",
        termStart: TERM_START,
      })
    ).toEqual({ start: TERM_START, basis: "term_start" });
  });

  // 青木型：会派の合流（前の会派の消滅・今の会派の名前の変更）の日が公表されている
  it("任期の中で移った議員は、区が公表している日付（会派の合流など）から", () => {
    expect(
      resolveMembershipWindow({
        memberships: [
          period("sansei", "2023-06-13", "2025-02-26"),
          period("jimin", "2025-06-11", "2026-10-04"),
        ],
        currentFactionId: "jimin",
        termStart: TERM_START,
        knownJoinDates: ["2025-04-10"],
      })
    ).toEqual({ start: "2025-04-10", basis: "faction_event" });
  });

  it("移った時期に当てはまらない公表の日付は使わない", () => {
    expect(
      resolveMembershipWindow({
        memberships: [
          period("jimin", "2019-11-28", "2026-02-25"),
          period("update", "2026-09-17", "2026-10-04"),
        ],
        currentFactionId: "update",
        termStart: TERM_START,
        // 前の会派にいた間の日付・今の会派で確認した後の日付
        knownJoinDates: ["2025-04-10", "2026-09-20"],
      })
    ).toEqual({ start: "2026-09-17", basis: "first_seen" });
  });

  it("当てはまる公表の日付がいくつかあれば、遅い方（確かな方）から", () => {
    expect(
      resolveMembershipWindow({
        memberships: [
          period("sansei", "2023-06-13", "2025-02-26"),
          period("jimin", "2025-06-11", "2026-10-04"),
        ],
        currentFactionId: "jimin",
        termStart: TERM_START,
        knownJoinDates: ["2025-04-01", "2025-04-10"],
      })
    ).toMatchObject({ start: "2025-04-10" });
  });

  // 移った正確な日が分からないときは、今の会派で確認できた日から数える
  it("公表の日付が無ければ、今の会派で最初に確認できた日から", () => {
    expect(
      resolveMembershipWindow({
        memberships: [
          period("sansei", "2023-06-13", "2025-02-26"),
          period("jimin", "2025-06-11", "2026-10-04"),
        ],
        currentFactionId: "jimin",
        termStart: TERM_START,
      })
    ).toEqual({ start: "2025-06-11", basis: "first_seen" });
  });

  it("所属の記録が無ければ任期の始まりから", () => {
    expect(
      resolveMembershipWindow({
        memberships: [],
        currentFactionId: "komei",
        termStart: TERM_START,
      })
    ).toEqual({ start: TERM_START, basis: "term_start" });
  });

  it("任期も分からなければ確認できた日、どちらも無ければ区切らない", () => {
    expect(
      resolveMembershipWindow({
        memberships: [period("komei", "2024-01-01", "2026-10-04")],
        currentFactionId: "komei",
        termStart: null,
      })
    ).toEqual({ start: "2024-01-01", basis: "first_seen" });
    expect(
      resolveMembershipWindow({
        memberships: [],
        currentFactionId: "komei",
        termStart: null,
      })
    ).toEqual({ start: null, basis: "none" });
  });

  it("会派に属していなければ任期の始まり", () => {
    expect(
      resolveMembershipWindow({
        memberships: [],
        currentFactionId: null,
        termStart: TERM_START,
      })
    ).toEqual({ start: TERM_START, basis: "term_start" });
  });
});

describe("factionJoinDateCandidates", () => {
  const history = {
    factions: [
      { id: "jimin", formed_on: null, dissolved_on: null },
      { id: "sansei", formed_on: null, dissolved_on: "2025-04-10" },
      { id: "update", formed_on: "2026-07-01", dissolved_on: null },
      { id: "forum", formed_on: "2023-12-11", dissolved_on: "2025-04-01" },
    ],
    names: [
      { faction_id: "jimin", valid_from: "2025-04-10" },
      { faction_id: "jimin", valid_from: null },
      { faction_id: "genzei", valid_from: "2025-04-01" },
    ],
  };

  it("今の会派の結成日・会派名を変えた日・前の会派の消滅日を集める", () => {
    expect(
      factionJoinDateCandidates({
        history,
        currentFactionId: "jimin",
        previousFactionIds: ["sansei"],
      })
    ).toEqual(["2025-04-10"]);
    expect(
      factionJoinDateCandidates({
        history,
        currentFactionId: "update",
        previousFactionIds: ["jimin"],
      })
    ).toEqual(["2026-07-01"]);
    expect(
      factionJoinDateCandidates({
        history,
        currentFactionId: "genzei",
        previousFactionIds: ["forum"],
      })
    ).toEqual(["2025-04-01"]);
  });

  it("前にいなかった会派の消滅日は使わない", () => {
    expect(
      factionJoinDateCandidates({
        history,
        currentFactionId: "update",
        previousFactionIds: [],
      })
    ).toEqual(["2026-07-01"]);
  });
});

describe("resolveMembershipWindowWithHistory", () => {
  const history = {
    factions: [{ id: "sansei", formed_on: null, dissolved_on: "2025-04-10" }],
    names: [{ faction_id: "jimin", valid_from: "2025-04-10" }],
  };

  it("移った議員は、会派の履歴から入った日を決める", () => {
    expect(
      resolveMembershipWindowWithHistory({
        memberships: [
          period("sansei", "2023-06-13", "2025-02-26"),
          period("jimin", "2025-06-11", "2026-10-04"),
        ],
        currentFactionId: "jimin",
        termStart: TERM_START,
        history,
      })
    ).toEqual({ start: "2025-04-10", basis: "faction_event" });
  });

  // 移っていない議員は、会派名を変えた日（2025-04-10）で区切らない
  it("移っていない議員は、会派名の変更で区切らない", () => {
    expect(
      resolveMembershipWindowWithHistory({
        memberships: [period("jimin", "2019-06-13", "2026-10-04")],
        currentFactionId: "jimin",
        termStart: TERM_START,
        history,
      })
    ).toEqual({ start: TERM_START, basis: "term_start" });
  });
});

describe("findPreviousMembershipsInTerm", () => {
  it("今の任期の中で今の会派の前にいた会派だけを返す", () => {
    expect(
      findPreviousMembershipsInTerm({
        memberships: [
          period("rikken", "2019-06-12", "2023-09-21"),
          period("forum", "2024-02-22", "2025-02-26"),
          period("genzei", "2025-06-11", "2026-10-04"),
        ],
        currentFactionId: "genzei",
        termStart: TERM_START,
      }).map((m) => m.faction_id)
    ).toEqual(["rikken", "forum"]);
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
