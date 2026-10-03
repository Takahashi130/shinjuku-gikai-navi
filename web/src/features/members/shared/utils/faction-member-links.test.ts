import { describe, expect, it } from "vitest";
import {
  buildFactionMemberLinkLookup,
  factionNameKey,
  findFactionMembersHref,
} from "./faction-member-links";

describe("factionNameKey", () => {
  it("全角半角・空白・注記の記号をそろえる", () => {
    expect(factionNameKey("いのちの党　新宿")).toBe("いのちの党新宿");
    expect(factionNameKey("自民・参政クラブ（※1）")).toBe("自民・参政クラブ");
    expect(factionNameKey("新宿未来の会※")).toBe("新宿未来の会");
  });
});

describe("findFactionMembersHref", () => {
  const lookup = buildFactionMemberLinkLookup([
    { name: "自民・参政クラブ", slug: "jimin-sansei", isCurrent: true },
    // 名前を変える前の会派名でも、今の会派の一覧へ送る
    {
      name: "自由民主党新宿区議会議員団",
      slug: "jimin-sansei",
      isCurrent: true,
    },
    { name: "れいわ新選組 新宿", slug: "inochi", isCurrent: true },
    {
      name: "新宿区議会立憲フォーラム",
      slug: "rikken-forum",
      isCurrent: false,
    },
  ]);

  it("会派名から、会派で絞った議員の一覧へのリンクを作る", () => {
    expect(findFactionMembersHref(lookup, "自民・参政クラブ")).toBe(
      "/members?faction=jimin-sansei"
    );
  });

  it("前の会派名でも今の会派に送る", () => {
    expect(findFactionMembersHref(lookup, "自由民主党新宿区議会議員団")).toBe(
      "/members?faction=jimin-sansei"
    );
    expect(findFactionMembersHref(lookup, "れいわ新選組　新宿")).toBe(
      "/members?faction=inochi"
    );
  });

  it("解散した会派・知らない会派はリンクにしない", () => {
    expect(
      findFactionMembersHref(lookup, "新宿区議会立憲フォーラム")
    ).toBeNull();
    expect(findFactionMembersHref(lookup, "どこかの会")).toBeNull();
  });
});
