import { describe, expect, it } from "vitest";
import { isMemberSortOrder, sortMembers } from "./sort-members";

const member = (
  name: string,
  nameKana: string | null,
  seatNumber: number | null
) => ({ name, nameKana, seatNumber });

const members = [
  member("時光 じゅん子", "ときみつ じゅんこ", 2),
  member("木もと ひろゆき", "きもと ひろゆき", 1),
  member("石川 孝一", "いしかわ こういち", 4),
  member("高阪 まさし", "こうさか まさし", 3),
];

describe("sortMembers", () => {
  it("議席番号順に並べる", () => {
    expect(sortMembers(members, "seat").map((m) => m.seatNumber)).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it("よみの五十音順に並べる", () => {
    expect(sortMembers(members, "kana").map((m) => m.name)).toEqual([
      "石川 孝一",
      "木もと ひろゆき",
      "高阪 まさし",
      "時光 じゅん子",
    ]);
  });

  it("元の配列は並べ替えない", () => {
    const before = members.map((m) => m.name);
    sortMembers(members, "kana");
    expect(members.map((m) => m.name)).toEqual(before);
  });

  it("議席番号の無い議員は最後に回し、その中は五十音順にする", () => {
    const sorted = sortMembers(
      [
        member("う", "う", null),
        member("い", "い", null),
        member("あ", "あ", 5),
      ],
      "seat"
    );
    expect(sorted.map((m) => m.name)).toEqual(["あ", "い", "う"]);
  });

  it("よみが無ければ表示名で並べる", () => {
    const sorted = sortMembers(
      [member("さとう", null, 2), member("あべ", null, 1)],
      "kana"
    );
    expect(sorted.map((m) => m.name)).toEqual(["あべ", "さとう"]);
  });

  // 姓が同じ読みのときは名で比べる。空白を消すと姓と名の境目が無くなり、
  // 「いとう あ」と「いとうか い」の順が入れ替わる。
  it("姓の区切りの空白を残して比べる", () => {
    const sorted = sortMembers(
      [member("B", "いとうか い", 1), member("A", "いとう あ", 2)],
      "kana"
    );
    expect(sorted.map((m) => m.name)).toEqual(["A", "B"]);
  });

  it("よみが同じなら議席番号順にする", () => {
    const sorted = sortMembers(
      [member("X", "やまだ", 9), member("Y", "やまだ", 3)],
      "kana"
    );
    expect(sorted.map((m) => m.seatNumber)).toEqual([3, 9]);
  });
});

describe("isMemberSortOrder", () => {
  it("議席番号順と五十音順だけを受け付ける", () => {
    expect(isMemberSortOrder("seat")).toBe(true);
    expect(isMemberSortOrder("kana")).toBe(true);
    expect(isMemberSortOrder("questions")).toBe(false);
    expect(isMemberSortOrder(undefined)).toBe(false);
  });
});
