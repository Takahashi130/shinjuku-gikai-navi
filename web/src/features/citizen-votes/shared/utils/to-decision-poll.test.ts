import { describe, expect, it } from "vitest";
import { type PollRow, toDecisionPoll } from "./to-decision-poll";

function row(overrides: Partial<PollRow> = {}): PollRow {
  return {
    id: "poll-1",
    opens_at: "2026-10-01T00:00:00Z",
    closes_at: "2026-10-15T05:00:00Z",
    accepts_after_close: true,
    is_hidden: false,
    audience: "anyone",
    options: ["for", "against"],
    ...overrides,
  };
}

describe("toDecisionPoll", () => {
  it("列名を画面用の名前にする", () => {
    expect(toDecisionPoll(row())).toEqual({
      id: "poll-1",
      opensAt: "2026-10-01T00:00:00Z",
      closesAt: "2026-10-15T05:00:00Z",
      acceptsAfterClose: true,
      isHidden: false,
      audience: "anyone",
      options: ["for", "against"],
    });
  });

  it("知らない audience は、いちばん狭い範囲として扱う", () => {
    expect(toDecisionPoll(row({ audience: "everyone" })).audience).toBe(
      "resident_verified"
    );
  });

  it("選択肢が null なら空にする", () => {
    expect(toDecisionPoll(row({ options: null })).options).toEqual([]);
  });
});
