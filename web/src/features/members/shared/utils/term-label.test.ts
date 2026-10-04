import { describe, expect, it } from "vitest";
import {
  formatCurrentTermSince,
  formatCurrentTermSinceShort,
  formatElectedTerms,
  isPresidingOfficerRole,
} from "./term-label";

describe("formatCurrentTermSince", () => {
  it("任期の始まりの年と月を書く", () => {
    expect(formatCurrentTermSince("2023-05-01")).toBe(
      "今の任期（2023年5月〜）"
    );
  });

  it("任期が分からなければ null", () => {
    expect(formatCurrentTermSince(null)).toBeNull();
    expect(formatCurrentTermSince("不明")).toBeNull();
  });
});

describe("formatCurrentTermSinceShort", () => {
  // 一覧のカードの狭い枠では、年月を先に書く
  it("年月を先に、今の任期を括弧で書く", () => {
    expect(formatCurrentTermSinceShort("2023-05-01")).toBe(
      "2023年5月〜（今の任期）"
    );
    expect(formatCurrentTermSinceShort(null)).toBeNull();
  });
});

describe("isPresidingOfficerRole", () => {
  it("議長・副議長だけを見分ける", () => {
    expect(isPresidingOfficerRole("議長")).toBe(true);
    expect(isPresidingOfficerRole("副議長")).toBe(true);
    expect(isPresidingOfficerRole("委員長")).toBe(false);
  });
});

describe("formatElectedTerms", () => {
  // 区の名簿は「当選期数（3期）」と書いている
  it("区の名簿と同じく「N期」と書く", () => {
    expect(formatElectedTerms(3)).toBe("3期");
  });
});
