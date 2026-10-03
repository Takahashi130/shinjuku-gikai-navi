import { describe, expect, it } from "vitest";
import {
  checkCloseFlags,
  parseCloseAtInput,
  planCloseChange,
  reclassifiedRange,
  resolveCloseTarget,
} from "./poll-close";

describe("parseCloseAtInput", () => {
  it.each([
    ["2027-02-17T14:00+09:00", "2027-02-17T05:00:00.000Z"],
    ["2027-02-17T14:00:00+09:00", "2027-02-17T05:00:00.000Z"],
    ["2027-02-17T05:00:00Z", "2027-02-17T05:00:00.000Z"],
    // 時差の無い書き方は日本時間として読む
    ["2027-02-17 14:00", "2027-02-17T05:00:00.000Z"],
    ["2027-02-17T15:30", "2027-02-17T06:30:00.000Z"],
  ])("%s → %s", (text, iso) => {
    expect(parseCloseAtInput(text)).toEqual({ ok: true, iso });
  });

  it.each([
    [undefined],
    [""],
    ["2027-02-17"],
    ["明日の14時"],
    ["2027-13-40T14:00+09:00"],
  ])("%s は読めない", (text) => {
    expect(parseCloseAtInput(text).ok).toBe(false);
  });
});

describe("checkCloseFlags", () => {
  it("--at の日時か、--early だけを受け付ける", () => {
    expect(checkCloseFlags({ at: "2027-02-17 14:00", early: false })).toEqual({
      ok: true,
    });
    expect(checkCloseFlags({ at: undefined, early: true })).toEqual({
      ok: true,
    });
    expect(checkCloseFlags({ at: undefined, early: false }).ok).toBe(false);
    expect(checkCloseFlags({ at: "明日", early: false }).ok).toBe(false);
    expect(checkCloseFlags({ at: "2027-02-17 14:00", early: true }).ok).toBe(
      false
    );
  });
});

describe("resolveCloseTarget", () => {
  it("--at の日時を使う", () => {
    expect(
      resolveCloseTarget({
        at: "2027-02-17 14:00",
        early: false,
        earlyVoteAt: null,
      })
    ).toEqual({ ok: true, iso: "2027-02-17T05:00:00.000Z" });
  });

  it("--early は会期の先議の予定（early_vote_at）を使う", () => {
    expect(
      resolveCloseTarget({
        at: undefined,
        early: true,
        earlyVoteAt: "2027-02-17T05:00:00+00:00",
      })
    ).toEqual({ ok: true, iso: "2027-02-17T05:00:00.000Z" });
  });

  it("--early で会期に先議の予定が無ければ直さない", () => {
    const result = resolveCloseTarget({
      at: undefined,
      early: true,
      earlyVoteAt: null,
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toContain("early_vote_at");
  });

  it("--at と --early を一緒には使えない", () => {
    expect(
      resolveCloseTarget({
        at: "2027-02-17 14:00",
        early: true,
        earlyVoteAt: "2027-02-17T05:00:00+00:00",
      }).ok
    ).toBe(false);
  });
});

describe("reclassifiedRange", () => {
  it("締切を早めると、新しい締切から古い締切までの票が採決後に変わる", () => {
    expect(
      reclassifiedRange("2027-03-24T05:00:00Z", "2027-02-17T05:00:00.000Z")
    ).toEqual({
      gte: "2027-02-17T05:00:00.000Z",
      lt: "2027-03-24T05:00:00.000Z",
    });
  });

  it("締切を遅らせても、同じ範囲の票の区分が変わる", () => {
    expect(
      reclassifiedRange("2027-02-17T05:00:00Z", "2027-03-24T05:00:00.000Z")
    ).toEqual({
      gte: "2027-02-17T05:00:00.000Z",
      lt: "2027-03-24T05:00:00.000Z",
    });
  });

  it("締切が無かった回は、新しい締切より後の票が採決後になる", () => {
    expect(reclassifiedRange(null, "2027-02-17T05:00:00.000Z")).toEqual({
      gte: "2027-02-17T05:00:00.000Z",
      lt: null,
    });
  });

  it("同じ時刻なら区分は変わらない（表記の違いは問わない）", () => {
    expect(
      reclassifiedRange("2027-02-17T14:00:00+09:00", "2027-02-17T05:00:00.000Z")
    ).toBeNull();
  });
});

describe("planCloseChange", () => {
  const base = {
    current: "2027-03-24T05:00:00+00:00",
    currentSource: "schedule",
    next: "2027-02-17T05:00:00.000Z",
    reclassifiedVotes: 0,
    force: false,
  };

  it("区分が変わる票が無ければ直す（手で決めた締切にする）", () => {
    expect(planCloseChange(base)).toEqual({ action: "update", note: null });
  });

  it("区分が入れ替わる票があれば --force が要る", () => {
    const plan = planCloseChange({ ...base, reclassifiedVotes: 3 });
    expect(plan.action).toBe("blocked");
    expect(plan.action === "blocked" && plan.reason).toContain("3 件");
  });

  it("--force なら直し、入れ替わる件数を知らせる", () => {
    expect(
      planCloseChange({ ...base, reclassifiedVotes: 3, force: true })
    ).toEqual({
      action: "update",
      note: "票 3 件の採決前・後の区分が入れ替わります",
    });
  });

  it("すでに同じ締切が手で決められていれば何もしない", () => {
    expect(
      planCloseChange({
        ...base,
        current: "2027-02-17T14:00:00+09:00",
        currentSource: "manual",
      })
    ).toEqual({ action: "unchanged" });
  });

  it("同じ時刻でも日程由来なら、手で決めた締切として記録し直す（取り込みで変わらないように）", () => {
    expect(
      planCloseChange({ ...base, current: "2027-02-17T14:00:00+09:00" })
    ).toEqual({ action: "update", note: null });
  });
});
