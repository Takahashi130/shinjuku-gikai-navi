// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { Route } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeaderClient } from "./header-client";

const sendGAEventMock = vi.hoisted(() => vi.fn());
const usePathnameMock = vi.hoisted(() => vi.fn());

vi.mock("@next/third-parties/google", () => ({
  sendGAEvent: sendGAEventMock,
}));
vi.mock("next/navigation", () => ({ usePathname: usePathnameMock }));
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));
vi.mock(
  "@/features/interview-session/client/components/interview-header-actions",
  () => ({
    InterviewHeaderActions: () => <span>保存して中断</span>,
  })
);
// メニュー・表示設定・検索バーはそれぞれの部品の責務なので、ここでは置き換える。
vi.mock("./all-menu", () => ({ AllMenu: () => <span>すべて</span> }));
vi.mock("./display-settings", () => ({
  DisplaySettings: ({ showDifficulty }: { showDifficulty: boolean }) => (
    <span>
      {showDifficulty ? "表示設定（ふりがな・説明）" : "表示設定（ふりがな）"}
    </span>
  ),
}));
vi.mock("./header-search", () => ({
  HeaderSearch: () => <form role="search" />,
}));

const themes = [{ id: "budget", label: "予算・お金" }];
const sessionPill = {
  label: "令和8年第3回定例会・閉会まであと12日",
  daysLeftLabel: "閉会まであと12日",
  shortLabel: "あと12日",
  href: "/kokkai/r8-teirei-3/bills" as Route,
};

function renderHeader(props: Partial<Parameters<typeof HeaderClient>[0]> = {}) {
  return render(
    <HeaderClient
      difficultyLevel="normal"
      themes={themes}
      sessionLinks={[]}
      sessionPill={sessionPill}
      {...props}
    />
  );
}

beforeEach(() => {
  sendGAEventMock.mockClear();
  usePathnameMock.mockReturnValue("/");
});

describe("HeaderClient", () => {
  it("マウント時に難易度設定の現在値をGAへ送る", () => {
    renderHeader({ difficultyLevel: "hard" });

    expect(sendGAEventMock).toHaveBeenCalledWith("event", "difficulty_state", {
      level: "hard",
    });
  });

  it("pathnameが変わると再度GAへ送る", () => {
    const { rerender } = renderHeader();
    expect(sendGAEventMock).toHaveBeenCalledTimes(1);

    usePathnameMock.mockReturnValue("/bills/1");
    rerender(
      <HeaderClient
        difficultyLevel="normal"
        themes={themes}
        sessionLinks={[]}
        sessionPill={sessionPill}
      />
    );

    expect(sendGAEventMock).toHaveBeenCalledTimes(2);
  });

  it("帯に絞り込みとテーマのリンクを並べる", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "審議中の議案" })).toHaveAttribute(
      "href",
      "/bills?status=deliberating"
    );
    expect(screen.getByRole("link", { name: "予算・お金" })).toHaveAttribute(
      "href",
      "/bills?tag=budget"
    );
  });

  it("帯に議員の一覧へのリンクを出す", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "議員の一覧" })).toHaveAttribute(
      "href",
      "/members"
    );
  });

  it("会期中は今の会期のピルを出し、閉会中は出さない", () => {
    const { rerender } = renderHeader();
    // スマホ用と広い画面用の2か所に置いている。見た目は短くしても、
    // 読み上げには会期名を含む完全な言い方を渡す。
    const pills = screen.getAllByRole("link", {
      name: "令和8年第3回定例会・閉会まであと12日",
    });
    expect(pills).toHaveLength(2);
    for (const pill of pills) {
      expect(pill).toHaveAttribute("href", "/kokkai/r8-teirei-3/bills");
    }
    expect(screen.getByText("あと12日")).toBeInTheDocument();

    rerender(
      <HeaderClient
        difficultyLevel="normal"
        themes={themes}
        sessionLinks={[]}
        sessionPill={null}
      />
    );
    expect(screen.queryByText(/閉会まで/)).not.toBeInTheDocument();
  });

  // 投票機能はまだ無いので、押せそうに見せない。
  it("投票履歴はリンクにせず準備中と添える", () => {
    renderHeader();

    expect(screen.getByText("投票履歴")).toBeInTheDocument();
    expect(screen.getByText("準備中")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /投票履歴/ })
    ).not.toBeInTheDocument();
  });

  it("インタビューのチャットでは検索と帯を出さず、中断ボタンを出す", () => {
    usePathnameMock.mockReturnValue("/bills/1/interview/chat");
    renderHeader();

    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    expect(screen.queryByText("審議中の議案")).not.toBeInTheDocument();
    expect(screen.getByText("保存して中断")).toBeInTheDocument();
  });

  // 帯の「すべて」メニューを出さないチャットでも、ふりがなを切り替えられるようにする。
  it("インタビューのチャットでも表示設定（ふりがな）を出す", () => {
    usePathnameMock.mockReturnValue("/bills/1/interview/chat");
    renderHeader();

    expect(screen.getByText("表示設定（ふりがな）")).toBeInTheDocument();
  });

  it("プレビューのチャットでも表示設定を出す", () => {
    usePathnameMock.mockReturnValue("/preview/bills/1/interview/chat");
    renderHeader();

    expect(screen.getByText("保存して中断")).toBeInTheDocument();
    expect(screen.getByText("表示設定（ふりがな）")).toBeInTheDocument();
  });

  it("議案のページでは説明の詳しさも切り替えられる", () => {
    usePathnameMock.mockReturnValue("/bills/1");
    renderHeader();

    expect(screen.getByText("表示設定（ふりがな・説明）")).toBeInTheDocument();
  });
});
