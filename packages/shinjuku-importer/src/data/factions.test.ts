import { describe, expect, it } from "vitest";
import { factionNameKey } from "../normalize-member-name";
import { findKnownFactionSlug, KNOWN_FACTIONS } from "./factions";
import { canonicalMemberKey } from "./member-name-aliases";

describe("KNOWN_FACTIONS", () => {
  it("slug と名前が重ならない", () => {
    const slugs = KNOWN_FACTIONS.map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const keys = KNOWN_FACTIONS.flatMap((f) => f.names.map((n) => factionNameKey(n.name)));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("最新の名前が名前の履歴に入っている", () => {
    for (const f of KNOWN_FACTIONS) expect(f.names.map((n) => n.name)).toContain(f.name);
  });
});

describe("findKnownFactionSlug", () => {
  it("名称変更の前の名前も同じ会派として引ける", () => {
    expect(findKnownFactionSlug("自由民主党新宿区議会議員団")).toBe("jimin-sansei");
    expect(findKnownFactionSlug("自民・参政クラブ")).toBe("jimin-sansei");
    expect(findKnownFactionSlug("れいわ新選組 新宿")).toBe("inochi");
    expect(findKnownFactionSlug("いのちの党 新宿")).toBe("inochi");
    expect(findKnownFactionSlug("社民党新宿区議会議員団")).toBe("shamin");
  });

  it("PDF の字間あきや注記の記号があっても引ける", () => {
    expect(findKnownFactionSlug("新 宿 未 来 の 会")).toBe("shinjuku-mirai");
    expect(findKnownFactionSlug("自由民主党新宿区議会議員団※")).toBe("jimin-sansei");
    expect(findKnownFactionSlug("れいわ新選組新宿")).toBe("inochi");
  });

  it("一覧に無い名前は推測せず null", () => {
    expect(findKnownFactionSlug("自民")).toBeNull();
    expect(findKnownFactionSlug("新しい会派")).toBeNull();
  });
});

describe("canonicalMemberKey", () => {
  it("確認済みの表記ゆれを議員名簿の表記にそろえる", () => {
    expect(canonicalMemberKey("かなくぼ ななこ")).toBe("かなくぼなな子");
    expect(canonicalMemberKey("かなくぼ なな子議員")).toBe("かなくぼなな子");
    expect(canonicalMemberKey("井下田　栄　一")).toBe("井下田栄一");
  });
});
