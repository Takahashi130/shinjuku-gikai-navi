import { describe, expect, it } from "vitest";
import {
  DEFAULT_MEMBERS_LIST_PARAMS,
  membersListHref,
  parseMembersListParams,
} from "./members-list-params";

describe("parseMembersListParams", () => {
  it("何も無ければすべての会派・議席番号順", () => {
    expect(parseMembersListParams({})).toEqual(DEFAULT_MEMBERS_LIST_PARAMS);
  });

  it("会派と並び順を読む", () => {
    expect(parseMembersListParams({ faction: "komei", sort: "kana" })).toEqual({
      faction: "komei",
      sort: "kana",
    });
  });

  // 「多い順」などのランキングは用意していないので、URL を直しても出さない。
  it("知らない並び順は議席番号順に倒す", () => {
    expect(parseMembersListParams({ sort: "questions" }).sort).toBe("seat");
  });

  it("同じパラメータが複数あれば最初を使い、空の会派は無視する", () => {
    expect(
      parseMembersListParams({ faction: ["  ", "x"], sort: ["kana", "seat"] })
    ).toEqual({ faction: null, sort: "kana" });
  });
});

describe("membersListHref", () => {
  it("既定値は URL に出さない", () => {
    expect(membersListHref()).toBe("/members");
  });

  it("会派で絞ったリンクを作る", () => {
    expect(
      membersListHref(DEFAULT_MEMBERS_LIST_PARAMS, { faction: "kyosan" })
    ).toBe("/members?faction=kyosan");
  });

  it("並び順を保ったまま会派を切り替える", () => {
    expect(
      membersListHref({ faction: "komei", sort: "kana" }, { faction: null })
    ).toBe("/members?sort=kana");
  });

  it("slug は URL 用にエンコードする", () => {
    expect(
      membersListHref(DEFAULT_MEMBERS_LIST_PARAMS, { faction: "a&b" })
    ).toBe("/members?faction=a%26b");
  });
});
