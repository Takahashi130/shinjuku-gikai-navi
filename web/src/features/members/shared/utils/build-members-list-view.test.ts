import { describe, expect, it } from "vitest";
import type { FactionSummary, MemberListItem } from "../types";
import {
  buildMembersListView,
  summarizeFactionComposition,
} from "./build-members-list-view";

const faction = (
  id: string,
  slug: string,
  sortOrder: number
): FactionSummary => ({
  id,
  slug,
  name: `${slug}の会`,
  short_name: null,
  sort_order: sortOrder,
  formed_on: null,
  note: null,
  source_url: null,
});

const member = (
  id: string,
  factionId: string | null,
  seatNumber: number,
  nameKana: string
): MemberListItem => ({
  id,
  name: id,
  nameKana,
  seatNumber,
  electedCount: 1,
  factionId,
  positions: [],
  questions: {
    count: 0,
    representativeCount: 0,
    generalCount: 0,
    topicCount: 0,
  },
});

const factions = [
  faction("f2", "b", 2),
  faction("f1", "a", 1),
  faction("f3", "c", 3),
];
const members = [
  member("m3", "f2", 3, "う"),
  member("m1", "f1", 1, "お"),
  member("m2", "f1", 2, "あ"),
  member("m4", null, 4, "い"),
];

describe("summarizeFactionComposition", () => {
  it("会派構成ページの並びで人数を数え、0人の会派は出さない", () => {
    const composition = summarizeFactionComposition(members, factions);
    expect(
      composition.rows.map((row) => [row.faction.slug, row.count])
    ).toEqual([
      ["a", 2],
      ["b", 1],
    ]);
    expect(composition.total).toBe(4);
  });

  it("全体に占める割合を小数1桁で出す", () => {
    const composition = summarizeFactionComposition(members, factions);
    expect(composition.rows.map((row) => row.percent)).toEqual([50, 25]);
  });

  it("会派の無い議員・知らない会派の議員は別に数える", () => {
    const composition = summarizeFactionComposition(
      [...members, member("m5", "unknown", 5, "え")],
      factions
    );
    expect(composition.unaffiliatedCount).toBe(2);
  });

  it("議員がいなければ割合は0", () => {
    expect(summarizeFactionComposition([], factions)).toEqual({
      total: 0,
      rows: [],
      unaffiliatedCount: 0,
    });
  });
});

describe("buildMembersListView", () => {
  it("会派で絞り、指定の順に並べる", () => {
    const view = buildMembersListView(members, factions, {
      faction: "a",
      sort: "kana",
    });
    expect(view.selectedFaction?.id).toBe("f1");
    expect(view.members.map((m) => m.id)).toEqual(["m2", "m1"]);
  });

  // 絞り込んでも、上部の会派ごとの人数は全体のまま出す。
  it("会派ごとの人数は絞り込みの前の全体から数える", () => {
    const view = buildMembersListView(members, factions, {
      faction: "a",
      sort: "seat",
    });
    expect(view.composition.total).toBe(4);
  });

  it("知らない会派の slug ならすべての議員を出す", () => {
    const view = buildMembersListView(members, factions, {
      faction: "nothing",
      sort: "seat",
    });
    expect(view.selectedFaction).toBeNull();
    expect(view.members.map((m) => m.id)).toEqual(["m1", "m2", "m3", "m4"]);
  });
});
