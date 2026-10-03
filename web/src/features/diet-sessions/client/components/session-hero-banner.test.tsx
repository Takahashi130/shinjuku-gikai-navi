// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DietSession } from "../../shared/types";
import { SessionHeroBanner } from "./session-hero-banner";

const session = (overrides: Partial<DietSession> = {}): DietSession => ({
  id: "s1",
  name: "令和8年第3回定例会",
  slug: "r8-teirei-3",
  shugiin_url: null,
  start_date: "2026-09-16",
  end_date: "2026-10-15",
  is_active: true,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  ...overrides,
});

// 呼び出し側は日本時刻の壁時計を持つ Date を渡す。
const now = new Date("2026-10-03 09:00");

describe("SessionHeroBanner", () => {
  it("会期中は会期名・閉会までの日数・審議中の件数を出し、審議中の一覧へ送る", () => {
    render(
      <SessionHeroBanner
        session={session()}
        closedSession={null}
        now={now}
        deliberatingCount={28}
        totalCount={940}
      />
    );

    expect(
      screen.getByRole("heading", { name: "令和8年第3回定例会" })
    ).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("28")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /審議中の議案を見る/ })
    ).toHaveAttribute("href", "/bills?status=deliberating");
    expect(
      screen.getByRole("link", { name: /この会期の議案をすべて見る/ })
    ).toHaveAttribute("href", "/kokkai/r8-teirei-3/bills");
  });

  it("閉会中は終わった会期を出し、その会期の一覧へ送る", () => {
    render(
      <SessionHeroBanner
        session={null}
        closedSession={session({
          name: "令和8年第2回定例会",
          slug: "r8-teirei-2",
        })}
        now={now}
        deliberatingCount={0}
        totalCount={940}
      />
    );

    expect(screen.getByText("新宿区議会は いま閉会中です")).toBeInTheDocument();
    expect(
      screen.getByText(/令和8年第2回定例会（.*）は終了しました/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /令和8年第2回定例会の議案を見る/ })
    ).toHaveAttribute("href", "/kokkai/r8-teirei-2/bills");
  });

  // 行き先の無いリンクを作らない。
  it("閉会中で直近の会期も無ければ、会期へのリンクを出さない", () => {
    render(
      <SessionHeroBanner
        session={null}
        closedSession={null}
        now={now}
        deliberatingCount={0}
        totalCount={940}
      />
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("940")).toBeInTheDocument();
  });
});
