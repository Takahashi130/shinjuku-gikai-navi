import { describe, expect, it } from "vitest";
import {
  buildSessionNotice,
  formatMonthDay,
  formatOpenSessionNote,
  formatPendingSessionNote,
} from "./session-notice";

type SessionArg = NonNullable<Parameters<typeof buildSessionNotice>[0]>;

const session = (overrides: Partial<SessionArg> = {}): SessionArg => ({
  name: "令和8年第3回定例会",
  slug: "r8-teirei-3",
  start_date: "2026-09-16",
  end_date: "2026-10-15",
  ...overrides,
});

// 呼び出し側は日本時刻の壁時計を持つ Date を渡す。
const now = new Date("2026-10-04 09:00");

describe("buildSessionNotice", () => {
  it("開会中は会期名・閉会予定日・残り日数を出し、会期の一覧へ送る", () => {
    expect(buildSessionNotice(session(), null, now)).toEqual({
      status: "open",
      text: "令和8年第3回定例会が開会中です（10月15日閉会予定・あと11日）",
      link: {
        label: "この会期の議案を見る",
        href: "/kokkai/r8-teirei-3/bills",
      },
    });
  });

  // 「あと0日」は閉会済みに読めるので言い方を変える。
  it("閉会日の当日は本日閉会予定と出す", () => {
    const notice = buildSessionNotice(
      session(),
      null,
      new Date("2026-10-15 09:00")
    );
    expect(notice?.text).toBe(
      "令和8年第3回定例会が開会中です（10月15日閉会予定・本日閉会予定）"
    );
  });

  it("開会中の会期に slug が無ければ審議中の議案の一覧へ送る", () => {
    expect(
      buildSessionNotice(session({ slug: null }), null, now)?.link.href
    ).toBe("/bills?status=deliberating");
  });

  it("閉会中は直近に閉会した会期を出し、その会期の一覧へ送る", () => {
    expect(
      buildSessionNotice(
        null,
        session({
          name: "令和8年第2回定例会",
          slug: "r8-teirei-2",
          end_date: "2026-06-19",
        }),
        now
      )
    ).toEqual({
      status: "closed",
      text: "新宿区議会は閉会中です。直近の会期は令和8年第2回定例会（6月19日閉会）",
      link: {
        label: "この会期の議案を見る",
        href: "/kokkai/r8-teirei-2/bills",
      },
    });
  });

  // 行き先の無いリンクを作らない。
  it("閉会中で直近の会期の一覧が無ければ帯を出さない", () => {
    expect(buildSessionNotice(null, session({ slug: null }), now)).toBeNull();
    expect(buildSessionNotice(null, null, now)).toBeNull();
  });
});

describe("formatMonthDay", () => {
  it("月日をゼロ埋めなしで出す", () => {
    expect(formatMonthDay("2026-06-09")).toBe("6月9日");
  });

  it("形が違えば空文字", () => {
    expect(formatMonthDay("2026/06/09")).toBe("");
  });
});

describe("formatOpenSessionNote", () => {
  it("会期名と閉会までの日数をつなぐ", () => {
    expect(formatOpenSessionNote(session(), now)).toBe(
      "令和8年第3回定例会・閉会まであと11日"
    );
  });
});

describe("formatPendingSessionNote", () => {
  it("会期がまだ開いていれば閉会予定日を書く", () => {
    expect(formatPendingSessionNote(session(), now)).toBe(
      "令和8年第3回定例会は10月15日に閉会予定です。"
    );
  });

  it("閉会日の当日も閉会予定と書く", () => {
    expect(
      formatPendingSessionNote(session(), new Date("2026-10-15 23:00"))
    ).toBe("令和8年第3回定例会は10月15日に閉会予定です。");
  });

  // 継続審査で前の会期の議案が残ることがある。終わった会期を閉会予定と書かない。
  it("会期が終わっていれば null", () => {
    expect(
      formatPendingSessionNote(session(), new Date("2026-10-16 09:00"))
    ).toBeNull();
  });
});
