import { describe, expect, it } from "vitest";
import { describePollStatus } from "./describe-poll-status";

const CLOSES_AT = "2026-10-15T05:00:00.000Z";
const NOW = new Date("2026-10-04T01:00:00Z");

describe("describePollStatus", () => {
  it("締切前は締切の日時と残りを出す", () => {
    expect(
      describePollStatus({ state: "open", closesAt: CLOSES_AT }, NOW)
    ).toEqual({
      headline: "締切 10月15日（木）14:00",
      detail: "本会議で採決する予定の時刻です。",
      remaining: "あと11日",
    });
  });

  it("締切が無ければ未定と出す", () => {
    expect(
      describePollStatus({ state: "open", closesAt: null }, NOW).headline
    ).toBe("締切は未定です");
  });

  it("採決後も受け付けているときは、採決後の票として数えると説明する", () => {
    const result = describePollStatus(
      { state: "open_after_close", closesAt: CLOSES_AT },
      NOW
    );
    expect(result.headline).toBe(
      "採決の予定（10月15日（木）14:00）を過ぎました"
    );
    expect(result.detail).toContain("採決後の票");
    expect(result.remaining).toBeNull();
  });

  it("受付終了・受付前を説明する", () => {
    expect(
      describePollStatus({ state: "closed", closesAt: CLOSES_AT }, NOW)
    ).toMatchObject({
      headline: "投票の受付は終了しました",
      detail: "締切：10月15日（木）14:00",
    });
    expect(
      describePollStatus(
        { state: "upcoming", opensAt: "2026-10-12T00:00:00+09:00" },
        NOW
      ).headline
    ).toBe("投票の受付は 10月12日（月）00:00 から始まります");
  });

  it("人事案件は対象外の理由を出す", () => {
    const result = describePollStatus(
      { state: "not_applicable", reason: "personnel" },
      NOW
    );
    expect(result.headline).toBe("人事案件のため、投票の対象外です");
    expect(result.detail).not.toBeNull();
  });

  it("そのほかの対象外は短く出す", () => {
    expect(
      describePollStatus({ state: "not_applicable", reason: "hidden" }, NOW)
    ).toEqual({
      headline: "この議案は投票の対象外です",
      detail: null,
      remaining: null,
    });
  });
});
