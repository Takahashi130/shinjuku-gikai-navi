import { describe, expect, it } from "vitest";
import type { DecisionPoll } from "../types";
import {
  isBeforeClose,
  isPastClose,
  resolvePollState,
  shouldRevealResults,
} from "./resolve-poll-state";

const CLOSES_AT = "2026-10-15T05:00:00.000Z"; // 10/15 14:00 JST

function poll(overrides: Partial<DecisionPoll> = {}): DecisionPoll {
  return {
    id: "poll-1",
    opensAt: "2026-10-01T00:00:00.000Z",
    closesAt: CLOSES_AT,
    acceptsAfterClose: true,
    isHidden: false,
    audience: "anyone",
    options: ["for", "against"],
    ...overrides,
  };
}

const BEFORE = new Date("2026-10-15T04:59:59.000Z");
const AT_CLOSE = new Date(CLOSES_AT);
const AFTER = new Date("2026-10-16T00:00:00.000Z");

describe("resolvePollState", () => {
  it("締切前は open", () => {
    expect(
      resolvePollState({
        poll: poll(),
        billSlug: "r8-teirei-3-gian-63",
        billName: null,
        now: BEFORE,
      })
    ).toEqual({ state: "open", closesAt: CLOSES_AT });
  });

  it("締切ちょうどからは採決後（accepts_after_close なら受付を続ける）", () => {
    expect(
      resolvePollState({
        poll: poll(),
        billSlug: "r8-teirei-3-gian-63",
        billName: null,
        now: AT_CLOSE,
      })
    ).toEqual({ state: "open_after_close", closesAt: CLOSES_AT });
  });

  it("採決後に受け付けない回は closed", () => {
    expect(
      resolvePollState({
        poll: poll({ acceptsAfterClose: false }),
        billSlug: "r8-teirei-3-gian-63",
        billName: null,
        now: AFTER,
      })
    ).toEqual({ state: "closed", closesAt: CLOSES_AT });
  });

  it("締切が無い回はずっと open", () => {
    expect(
      resolvePollState({
        poll: poll({ closesAt: null }),
        billSlug: "r8-teirei-3-gian-63",
        billName: null,
        now: AFTER,
      })
    ).toEqual({ state: "open", closesAt: null });
  });

  it("受付開始前は upcoming", () => {
    expect(
      resolvePollState({
        poll: poll({ opensAt: "2026-10-20T00:00:00.000Z" }),
        billSlug: "r8-teirei-3-gian-63",
        billName: null,
        now: AFTER,
      })
    ).toEqual({ state: "upcoming", opensAt: "2026-10-20T00:00:00.000Z" });
  });

  it("人事案件（同意・諮問）は回があっても対象外", () => {
    expect(
      resolvePollState({
        poll: poll(),
        billSlug: "r8-teirei-3-doi-1",
        billName: null,
        now: BEFORE,
      })
    ).toEqual({ state: "not_applicable", reason: "personnel" });
    expect(
      resolvePollState({
        poll: poll(),
        billSlug: "r8-teirei-3-shimon-2",
        billName: null,
        now: BEFORE,
      })
    ).toEqual({ state: "not_applicable", reason: "personnel" });
  });

  it("特定の人を推薦する議案（議員提出議案）も、回があっても対象外", () => {
    expect(
      resolvePollState({
        poll: poll(),
        billSlug: "r7-teirei-2-giin-7",
        billName:
          "東京都後期高齢者医療広域連合議会議員選挙候補者の推薦について",
        now: BEFORE,
      })
    ).toEqual({ state: "not_applicable", reason: "personnel" });
  });

  it("回が無い・非表示の回は対象外", () => {
    expect(
      resolvePollState({
        poll: null,
        billSlug: "r8-teirei-3-gian-63",
        billName: null,
        now: BEFORE,
      })
    ).toEqual({ state: "not_applicable", reason: "no_poll" });
    expect(
      resolvePollState({
        poll: poll({ isHidden: true }),
        billSlug: "r8-teirei-3-gian-63",
        billName: null,
        now: BEFORE,
      })
    ).toEqual({ state: "not_applicable", reason: "hidden" });
  });

  it("締切の日時が読めないときは締切なしとして扱う", () => {
    expect(
      resolvePollState({
        poll: poll({ closesAt: "not-a-date" }),
        billSlug: null,
        billName: null,
        now: AFTER,
      })
    ).toEqual({ state: "open", closesAt: null });
  });
});

describe("isBeforeClose", () => {
  it("締切より前だけ true（DB の集計と同じく responded_at < closes_at）", () => {
    expect(isBeforeClose(CLOSES_AT, BEFORE)).toBe(true);
    expect(isBeforeClose(CLOSES_AT, AT_CLOSE)).toBe(false);
    expect(isBeforeClose(CLOSES_AT, AFTER)).toBe(false);
  });

  it("締切が無ければ常に締切前", () => {
    expect(isBeforeClose(null, AFTER)).toBe(true);
  });
});

describe("isPastClose", () => {
  it("採決後の状態だけ true", () => {
    expect(isPastClose({ state: "open", closesAt: CLOSES_AT })).toBe(false);
    expect(
      isPastClose({ state: "open_after_close", closesAt: CLOSES_AT })
    ).toBe(true);
    expect(isPastClose({ state: "closed", closesAt: CLOSES_AT })).toBe(true);
  });
});

describe("shouldRevealResults", () => {
  const open = { state: "open", closesAt: CLOSES_AT } as const;
  const after = { state: "open_after_close", closesAt: CLOSES_AT } as const;

  it("締切前は、本人が投票するまで見せない", () => {
    expect(shouldRevealResults({ pollState: open, hasVoted: false })).toBe(
      false
    );
    expect(shouldRevealResults({ pollState: open, hasVoted: true })).toBe(true);
  });

  it("締切後は投票していなくても見せる", () => {
    expect(shouldRevealResults({ pollState: after, hasVoted: false })).toBe(
      true
    );
    expect(
      shouldRevealResults({
        pollState: { state: "closed", closesAt: CLOSES_AT },
        hasVoted: false,
      })
    ).toBe(true);
  });

  it("対象外・受付前の回は見せない", () => {
    expect(
      shouldRevealResults({
        pollState: { state: "not_applicable", reason: "hidden" },
        hasVoted: true,
      })
    ).toBe(false);
    expect(
      shouldRevealResults({
        pollState: { state: "upcoming", opensAt: CLOSES_AT },
        hasVoted: false,
      })
    ).toBe(false);
  });
});
