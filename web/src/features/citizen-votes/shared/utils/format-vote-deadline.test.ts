import { describe, expect, it } from "vitest";
import {
  formatJstDate,
  formatJstDateTime,
  formatRemaining,
} from "./format-vote-deadline";

const CLOSES_AT = "2026-10-15T05:00:00.000Z"; // 10/15（木）14:00 JST

describe("formatJstDateTime", () => {
  it("日本時間の月日・曜日・時刻にする", () => {
    expect(formatJstDateTime(CLOSES_AT)).toBe("10月15日（木）14:00");
  });

  it("UTC では前日でも日本時間の日付にする", () => {
    // 2026-10-14T15:30Z は日本時間 10/15 0:30
    expect(formatJstDateTime("2026-10-14T15:30:00.000Z")).toBe(
      "10月15日（木）00:30"
    );
  });

  it("読めない日時は空文字", () => {
    expect(formatJstDateTime("not-a-date")).toBe("");
  });

  it("now を渡すと、年が違うときだけ年を付ける（日本時間の年で比べる）", () => {
    const now = new Date("2026-10-04T01:00:00Z");
    expect(formatJstDateTime(CLOSES_AT, now)).toBe("10月15日（木）14:00");
    expect(formatJstDateTime("2025-03-24T05:00:00Z", now)).toBe(
      "2025年3月24日（月）14:00"
    );
    // UTC では 2026-12-31 でも、日本時間では 2027 年
    expect(formatJstDateTime("2026-12-31T16:00:00Z", now)).toBe(
      "2027年1月1日（金）01:00"
    );
  });
});

describe("formatJstDate", () => {
  it("日本時間の月日と曜日にする", () => {
    expect(formatJstDate(CLOSES_AT)).toBe("10月15日（木）");
  });

  it("年が違えば年を付ける", () => {
    expect(
      formatJstDate("2025-03-24T05:00:00Z", new Date("2026-10-04T01:00:00Z"))
    ).toBe("2025年3月24日（月）");
  });
});

describe("formatRemaining", () => {
  it("2日以上先は「あと n 日」（日本時間の暦日で数える）", () => {
    // 10/4 10:00 JST → 10/15 は 11 日後
    expect(formatRemaining(CLOSES_AT, new Date("2026-10-04T01:00:00Z"))).toBe(
      "あと11日"
    );
    // 10/4 23:59 JST でも 11 日後
    expect(formatRemaining(CLOSES_AT, new Date("2026-10-04T14:59:00Z"))).toBe(
      "あと11日"
    );
  });

  it("前日は「あすまで」、当日は「きょうまで」", () => {
    expect(formatRemaining(CLOSES_AT, new Date("2026-10-14T03:00:00Z"))).toBe(
      "あすまで"
    );
    // 10/15 0:30 JST（UTC では 10/14）
    expect(formatRemaining(CLOSES_AT, new Date("2026-10-14T15:30:00Z"))).toBe(
      "きょうまで"
    );
  });

  it("締切を過ぎたら null", () => {
    expect(formatRemaining(CLOSES_AT, new Date(CLOSES_AT))).toBeNull();
    expect(
      formatRemaining(CLOSES_AT, new Date("2026-10-16T00:00:00Z"))
    ).toBeNull();
  });

  it("読めない日時は null", () => {
    expect(formatRemaining("x", new Date())).toBeNull();
  });
});
