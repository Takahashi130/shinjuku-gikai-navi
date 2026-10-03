import { describe, expect, it } from "vitest";
import {
  BILL_FINDER_LINKS,
  buildHeaderBandLinks,
  buildSessionLinks,
  buildSessionPill,
  buildThemeLinks,
} from "./header-nav";

const themes = [
  { id: "budget", label: "予算・お金" },
  { id: "childcare", label: "子育て" },
];

describe("BILL_FINDER_LINKS", () => {
  it("議案一覧をステータスや賛否の分かれ方で開く", () => {
    expect(BILL_FINDER_LINKS.map((link) => link.href)).toEqual([
      "/bills",
      "/bills?status=deliberating",
      "/bills?split=1",
      "/bills?status=enacted",
      "/bills?status=rejected",
    ]);
  });
});

describe("buildThemeLinks", () => {
  it("タグで絞った一覧へのリンクを、渡した順に作る", () => {
    expect(buildThemeLinks(themes)).toEqual([
      { label: "予算・お金", href: "/bills?tag=budget" },
      { label: "子育て", href: "/bills?tag=childcare" },
    ]);
  });

  it("タグが無ければ空", () => {
    expect(buildThemeLinks([])).toEqual([]);
  });
});

describe("buildHeaderBandLinks", () => {
  it("審議中・賛否が分かれた議案のあとにテーマを並べる", () => {
    expect(buildHeaderBandLinks(themes).map((link) => link.label)).toEqual([
      "審議中の議案",
      "賛否が分かれた議案",
      "予算・お金",
      "子育て",
    ]);
  });

  // 取得に失敗してテーマが無くても、状況から探すリンクは残す。
  it("テーマが無くても状況のリンクは出す", () => {
    expect(buildHeaderBandLinks([])).toHaveLength(2);
  });
});

const session = (slug: string | null) => ({
  name: "令和8年第3回定例会",
  slug,
  start_date: "2026-09-16",
  end_date: "2026-10-15",
});

describe("buildSessionLinks", () => {
  it("会期別の一覧へのリンクを作り、slug の無い会期は除く", () => {
    expect(
      buildSessionLinks([
        session("r8-teirei-3"),
        { ...session(null), name: "slug なし" },
      ])
    ).toEqual([
      { label: "令和8年第3回定例会", href: "/kokkai/r8-teirei-3/bills" },
    ]);
  });
});

describe("buildSessionPill", () => {
  // 呼び出し側は日本時刻の壁時計を持つ Date を渡す。
  const now = new Date("2026-10-03 09:00");

  it("会期名と閉会までの日数を出し、会期の一覧へ送る", () => {
    expect(buildSessionPill(session("r8-teirei-3"), now)).toEqual({
      label: "令和8年第3回定例会・閉会まであと12日",
      daysLeftLabel: "閉会まであと12日",
      shortLabel: "あと12日",
      href: "/kokkai/r8-teirei-3/bills",
    });
  });

  // 「あと0日」は閉会済みに読めるので言い方を変える。
  it("閉会日の当日は本日閉会と出す", () => {
    const pill = buildSessionPill(
      session("r8-teirei-3"),
      new Date("2026-10-15 09:00")
    );
    expect(pill?.label).toBe("令和8年第3回定例会・本日閉会予定");
    expect(pill?.shortLabel).toBe("本日閉会");
  });

  it("slug が無ければ審議中の議案の一覧へ送る", () => {
    expect(buildSessionPill(session(null), now)?.href).toBe(
      "/bills?status=deliberating"
    );
  });

  it("会期中でなければ出さない", () => {
    expect(buildSessionPill(null, now)).toBeNull();
  });
});
