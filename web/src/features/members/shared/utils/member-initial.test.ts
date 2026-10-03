import { describe, expect, it } from "vitest";
import { getMemberInitial } from "./member-initial";

describe("getMemberInitial", () => {
  it("名前の最初の1文字を返す", () => {
    expect(getMemberInitial("木もと ひろゆき")).toBe("木");
    expect(getMemberInitial("かなくぼ なな子")).toBe("か");
  });

  it("先頭の空白（全角を含む）は飛ばす", () => {
    expect(getMemberInitial("　 時光 じゅん子")).toBe("時");
  });

  // 「𠮷」はサロゲートペア。1文字目を半分に切ると文字化けする。
  it("サロゲートペアの漢字も1文字として扱う", () => {
    expect(getMemberInitial("𠮷田 太郎")).toBe("𠮷");
  });

  it("名前が空なら全角の？を返す", () => {
    expect(getMemberInitial("")).toBe("？");
    expect(getMemberInitial("   ")).toBe("？");
  });
});
