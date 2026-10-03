import { describe, expect, it } from "vitest";
import { cleanFactionName, cleanMemberName, factionNameKey, memberNameKey } from "./normalize-member-name";

describe("memberNameKey", () => {
  it.each([
    ["鈴木 ひろみ", "鈴木ひろみ"],
    ["鈴木ひろみ", "鈴木ひろみ"],
    ["井下田　栄　一議員", "井下田栄一"],
    ["のづ ケン", "のづケン"],
  ])("%s → %s", (name, expected) => {
    expect(memberNameKey(name)).toBe(expected);
  });
});

describe("cleanMemberName", () => {
  it("末尾の「議員」と余分な空白を除く", () => {
    expect(cleanMemberName("  ひやま　真一議員 ")).toBe("ひやま 真一");
  });
});

describe("factionNameKey", () => {
  it("注記の記号と空白を除いてそろえる", () => {
    expect(factionNameKey("自由民主党新宿区議会議員団※")).toBe("自由民主党新宿区議会議員団");
    expect(factionNameKey("社民新宿区議会議員団（※1）")).toBe("社民新宿区議会議員団");
    expect(factionNameKey("新 宿 未 来 の 会")).toBe("新宿未来の会");
    expect(factionNameKey("れいわ新選組 新宿")).toBe(factionNameKey("れいわ新選組新宿"));
  });
});

describe("cleanFactionName", () => {
  it("PDF の字間あきを詰める", () => {
    expect(cleanFactionName("日 本 共 産 党 新 宿 区 議 会 議 員 団")).toBe("日本共産党新宿区議会議員団");
    expect(cleanFactionName("新 宿 区 議会 立 憲 フォ ーラ ム ※４")).toBe("新宿区議会立憲フォーラム");
  });

  it("意味のある空白は1つ残す", () => {
    expect(cleanFactionName("れいわ新選組　 新宿")).toBe("れいわ新選組 新宿");
    expect(cleanFactionName("いのちの党 新宿")).toBe("いのちの党 新宿");
  });

  it("注記の記号を除く", () => {
    expect(cleanFactionName("現 役 世 代 に 優 し い 新 宿 ※ ３")).toBe("現役世代に優しい新宿");
    expect(cleanFactionName("社民新宿区議会議員団（※1）")).toBe("社民新宿区議会議員団");
  });
});
