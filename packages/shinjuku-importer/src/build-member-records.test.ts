import { describe, expect, it } from "vitest";
import { buildMemberRecords } from "./build-member-records";
import type { CommitteeRoster } from "./parse-committee-roster";
import type { FactionPageEntry } from "./parse-faction-page";
import type { MemberList } from "./parse-member-list";

const list: MemberList = {
  termNumber: 20,
  termStart: "2023-05-01",
  termEnd: "2027-04-30",
  electionDate: "2023-04-23",
  members: [
    { seatNumber: 9, name: "三沢 ひで子", nameKana: "みさわ ひでこ", electedCount: 3, factionName: "新宿区議会公明党" },
    { seatNumber: 23, name: "渡辺 清人", nameKana: "わたなべ きよと", electedCount: 3, factionName: "自民・参政クラブ" },
  ],
};

const factions: FactionPageEntry[] = [
  { name: "自民・参政クラブ", memberCount: 1, members: [{ name: "渡辺 清人", role: null }], notes: [] },
  { name: "新宿区議会公明党", memberCount: 1, members: [{ name: "三沢 ひで子", role: "会計" }], notes: [] },
];

const roster: CommitteeRoster = {
  factionAbbreviations: new Map([
    ["自参ク", "自民・参政クラブ"],
    ["公明", "新宿区議会公明党"],
  ]),
  committees: [
    {
      name: "総務区民委員会",
      kind: "standing_committee",
      capacity: 10,
      members: [{ name: "三沢 ひで子", role: "委員", factionAbbr: "公明" }],
    },
    {
      name: "文化観光産業等特別委員会",
      kind: "special_committee",
      capacity: 9,
      members: [{ name: "三沢 ひで子", role: "委員", factionAbbr: "公明" }],
    },
  ],
};

const officers = [
  { role: "議長", name: "渡辺 清人", factionName: "自民・参政クラブ" },
  { role: "副議長", name: "三沢 ひで子", factionName: "新宿区議会公明党" },
];

describe("buildMemberRecords", () => {
  it("議長・委員会・会派の役職を議員ごとにまとめる", () => {
    const { members, warnings } = buildMemberRecords(list, factions, roster, officers);
    expect(warnings).toEqual([]);
    expect(members[0]).toEqual({
      nameKey: "三沢ひで子",
      name: "三沢 ひで子",
      nameKana: "みさわ ひでこ",
      seatNumber: 9,
      electedCount: 3,
      factionName: "新宿区議会公明党",
      positions: [
        { bodyKind: "council", bodyName: "新宿区議会", role: "副議長", sortOrder: 0 },
        { bodyKind: "standing_committee", bodyName: "総務区民委員会", role: "委員", sortOrder: 1 },
        { bodyKind: "special_committee", bodyName: "文化観光産業等特別委員会", role: "委員", sortOrder: 2 },
        { bodyKind: "faction", bodyName: "新宿区議会公明党", role: "会計", sortOrder: 3 },
      ],
    });
    expect(members[1].positions).toEqual([{ bodyKind: "council", bodyName: "新宿区議会", role: "議長", sortOrder: 0 }]);
  });

  it("ページどうしの食い違いを警告にする", () => {
    const { warnings } = buildMemberRecords(
      list,
      [{ name: "新宿区議会公明党", memberCount: 2, members: [{ name: "三沢 ひで子", role: null }, { name: "渡辺 清人", role: null }], notes: [] }],
      {
        factionAbbreviations: roster.factionAbbreviations,
        committees: [
          {
            name: "総務区民委員会",
            kind: "standing_committee",
            capacity: 10,
            members: [{ name: "知らない 人", role: "委員", factionAbbr: "公明" }],
          },
        ],
      },
      []
    );
    expect(warnings).toEqual([
      "総務区民委員会の「知らない 人」が議員名簿にありません",
      "渡辺 清人: 会派構成ページの会派（新宿区議会公明党）と議員名簿の会派（自民・参政クラブ）が違います",
    ]);
  });
});
