import { describe, expect, it } from "vitest";
import { describeMembershipWindow } from "./describe-membership-window";

const context = {
  memberName: "ひやま 真一",
  factionName: "自民・参政クラブ",
  termNumber: 20,
};

describe("describeMembershipWindow", () => {
  // 「資料で確認できる期間」と書くと、その期間しか所属していないように読める
  it("移った記録の無い議員は、今の任期の始まりからと書く", () => {
    const text = describeMembershipWindow(
      { start: "2023-05-01", basis: "term_start" },
      context
    );
    expect(text.since).toBe("2023年5月1日");
    expect(text.reason).toContain("今の任期（第20期）の始まり");
    expect(text.reason).not.toContain("確認できる");
  });

  it("会派の結成・合流の日から数えるときは、そう書く", () => {
    expect(
      describeMembershipWindow(
        { start: "2025-04-10", basis: "faction_event" },
        { ...context, memberName: "青木 仁美" }
      ).reason
    ).toBe(
      "青木 仁美さんが自民・参政クラブに入った時期にあたる、区が公表している会派の結成・合流などの日"
    );
  });

  it("最初に確認できた日から数えるときは、正確な日が無いことを書く", () => {
    expect(
      describeMembershipWindow(
        { start: "2025-06-11", basis: "first_seen" },
        context
      ).reason
    ).toContain("移った正確な日は公表されていません");
  });

  it("区切らないときは何も書かない", () => {
    expect(
      describeMembershipWindow({ start: null, basis: "none" }, context)
    ).toEqual({ since: null, reason: null });
  });
});
