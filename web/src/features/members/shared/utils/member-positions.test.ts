import { describe, expect, it } from "vitest";
import type { MemberPosition } from "../types";
import { formatCommitteeSeat, groupMemberPositions } from "./member-positions";

const position = (
  bodyKind: string,
  bodyName: string,
  role: string,
  sortOrder: number
): MemberPosition => ({
  body_kind: bodyKind,
  body_name: bodyName,
  role,
  sort_order: sortOrder,
});

describe("groupMemberPositions", () => {
  const grouped = groupMemberPositions([
    position("faction", "新宿区議会公明党", "会計", 3),
    position("special_committee", "防災等安全対策特別委員会", "委員", 1),
    position("steering_committee", "議会運営委員会", "副委員長", 2),
    position("standing_committee", "文教子ども家庭委員会", "委員長", 0),
    position("council", "新宿区議会", "議長", 0),
  ]);

  it("議長・副議長を取り出す", () => {
    expect(grouped.councilRoles).toEqual(["議長"]);
  });

  it("委員会は常任・議会運営・特別の順に並べる", () => {
    expect(grouped.committees.map((c) => c.name)).toEqual([
      "文教子ども家庭委員会",
      "議会運営委員会",
      "防災等安全対策特別委員会",
    ]);
  });

  it("委員でない役（委員長・副委員長）に印を付ける", () => {
    expect(grouped.committees.map((c) => c.isLeader)).toEqual([
      true,
      true,
      false,
    ]);
  });

  it("会派の役職を取り出す", () => {
    expect(grouped.factionRoles).toEqual([
      { factionName: "新宿区議会公明党", role: "会計" },
    ]);
  });

  it("役職が無ければ空", () => {
    expect(groupMemberPositions([])).toEqual({
      councilRoles: [],
      committees: [],
      factionRoles: [],
    });
  });
});

describe("formatCommitteeSeat", () => {
  it("委員長などは括弧で添え、委員は委員会名だけにする", () => {
    expect(
      formatCommitteeSeat({
        kind: "standing_committee",
        name: "総務区民委員会",
        role: "委員長",
        isLeader: true,
      })
    ).toBe("総務区民委員会（委員長）");
    expect(
      formatCommitteeSeat({
        kind: "special_committee",
        name: "本庁舎対策等特別委員会",
        role: "委員",
        isLeader: false,
      })
    ).toBe("本庁舎対策等特別委員会");
  });
});
