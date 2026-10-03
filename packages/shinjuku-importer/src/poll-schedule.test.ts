import { describe, expect, it } from "vitest";
import { staleClosedPollWarning, updatableScheduleCloseFilter, voteScheduleWarnings } from "./poll-schedule";

describe("updatableScheduleCloseFilter", () => {
  it("締切が未設定の回か、締切がまだ来ていない回で値が違うものだけを対象にする", () => {
    expect(
      updatableScheduleCloseFilter("2026-10-15T05:00:00.000Z", new Date("2026-10-04T00:00:00.000Z"))
    ).toBe(
      'closes_at.is.null,and(closes_at.gt."2026-10-04T00:00:00.000Z",closes_at.neq."2026-10-15T05:00:00.000Z")'
    );
  });
});

describe("staleClosedPollWarning", () => {
  const schedule = "2026-03-24T05:00:00.000Z";

  it("日程と同じ締切なら警告しない（表記が違っても同じ時刻なら同じ）", () => {
    expect(
      staleClosedPollWarning(
        [
          { billSlug: "r8-teirei-1-gian-1", closesAt: "2026-03-24T05:00:00+00:00" },
          { billSlug: "r8-teirei-1-gian-2", closesAt: "2026-03-24T14:00:00+09:00" },
        ],
        schedule
      )
    ).toBeNull();
  });

  it("食い違う回があれば、件数と例を出し、直し方を示す", () => {
    const warning = staleClosedPollWarning(
      [
        { billSlug: "r8-teirei-1-gian-1", closesAt: "2026-02-17T05:00:00+00:00" },
        { billSlug: "r8-teirei-1-gian-2", closesAt: schedule },
      ],
      schedule
    );
    expect(warning).toContain("1 件");
    expect(warning).toContain("r8-teirei-1-gian-1");
    expect(warning).not.toContain("r8-teirei-1-gian-2");
    expect(warning).toContain("polls:set-close");
  });

  it("例は3件までにする", () => {
    const rows = [1, 2, 3, 4].map((n) => ({ billSlug: `s-${n}`, closesAt: "2026-01-01T00:00:00Z" }));
    const warning = staleClosedPollWarning(rows, schedule) ?? "";
    expect(warning).toContain("4 件");
    expect(warning).toContain("s-3");
    expect(warning).not.toContain("s-4");
    expect(warning).toContain("ほか");
  });
});

describe("voteScheduleWarnings", () => {
  const base = {
    title: "令和8年第1回定例会",
    finalVoteAt: "2026-03-24T14:00:00+09:00",
    finalVoteTimeInferred: false,
    earlyVoteAt: null,
    endDate: "2026-03-24",
  };

  it("先議も時刻の推定も無ければ警告しない", () => {
    expect(voteScheduleWarnings(base)).toEqual([]);
  });

  it("先議があれば、先議の議案の締切を手で直すよう警告する", () => {
    const [warning] = voteScheduleWarnings({ ...base, earlyVoteAt: "2026-02-17T14:00:00+09:00" });
    expect(warning).toContain("先議（2026-02-17T14:00:00+09:00）");
    expect(warning).toContain("polls:set-close <先議の議案slug>... --early");
  });

  it("採決の時刻が書かれていなければ、下限の時刻であることを警告する", () => {
    const [warning] = voteScheduleWarnings({
      ...base,
      title: "令和2年第1回臨時会",
      finalVoteAt: "2020-05-01T15:59:00+09:00",
      finalVoteTimeInferred: true,
    });
    expect(warning).toContain("2020-05-01T15:59:00+09:00 を締切にしています");
  });

  it("採決予定が読めないときは、会期の最終日 14 時を示す", () => {
    const [warning] = voteScheduleWarnings({ ...base, finalVoteAt: null, finalVoteTimeInferred: true });
    expect(warning).toContain("2026-03-24T14:00:00+09:00 を締切にしています");
  });
});
