// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import type { Route } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionNotice } from "@/features/diet-sessions/shared/utils/session-notice";
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
// 表示設定は自分の部品の責務なので、ここでは置き換える。
vi.mock("./display-settings", () => ({
  DisplaySettings: ({ showDifficulty }: { showDifficulty: boolean }) => (
    <span>
      {showDifficulty ? "表示設定（ふりがな・説明）" : "表示設定（ふりがな）"}
    </span>
  ),
}));

const notice: SessionNotice = {
  status: "open",
  text: "令和8年第3回定例会が開会中です（10月15日閉会予定・あと11日）",
  link: {
    label: "この会期の議案を見る",
    href: "/kokkai/r8-teirei-3/bills" as Route,
  },
};

function renderHeader(props: Partial<Parameters<typeof HeaderClient>[0]> = {}) {
  return render(
    <HeaderClient difficultyLevel="normal" notice={notice} {...props} />
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
    rerender(<HeaderClient difficultyLevel="normal" notice={notice} />);

    expect(sendGAEventMock).toHaveBeenCalledTimes(2);
  });

  it("サービス名とβ版の印を出す", () => {
    renderHeader();

    expect(
      screen.getByRole("link", { name: "新宿区議会ナビ トップページ" })
    ).toHaveAttribute("href", "/");
    expect(screen.getByText("β版")).toBeInTheDocument();
  });

  it("検索アイコンは議案一覧の検索欄へ送る", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "議案を検索" })).toHaveAttribute(
      "href",
      "/bills#bills-search"
    );
  });

  it("タブを4つ並べ、トップでは議案のタブを現在のページにする", () => {
    renderHeader();

    const nav = screen.getByRole("navigation", { name: "サービスの切り替え" });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(4);
    expect(links[0]).toHaveAttribute("href", "/");
    expect(links[0]).toHaveAttribute("aria-current", "page");
    expect(links[1]).not.toHaveAttribute("aria-current");
  });

  // 行き先はトップなので、一覧で「現在のページ」と読み上げない（パンくずと二重にもしない）。
  it("議案の一覧では、議案のタブを選択中にするが現在のページとは言わない", () => {
    usePathnameMock.mockReturnValue("/bills");
    renderHeader();

    const nav = screen.getByRole("navigation", { name: "サービスの切り替え" });
    const [bills] = within(nav).getAllByRole("link");
    expect(bills).toHaveAttribute("aria-current", "true");
  });

  // 「#」は飾り。読み上げで「シャープ」と読ませず、「準備中」は区切って読ませる。
  it("タブの名前に「#」を含めず、準備中は括弧で区切る", () => {
    renderHeader();

    expect(
      screen.getByRole("link", { name: "議会LIVE中継（準備中）" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "議案・区民投票" })
    ).toBeInTheDocument();
  });

  // まだ無い機能を、あるように見せない。行き先は準備中の説明ページ。
  it("まだ無い機能のタブには準備中と添え、説明ページへ送る", () => {
    renderHeader();

    const live = screen.getByRole("link", { name: /議会LIVE中継/ });
    expect(live).toHaveAttribute("href", "/upcoming/live");
    expect(within(live).getByText("準備中")).toBeInTheDocument();
    // 生中継が今まさに行われているように見せる印は出さない
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument();

    const members = screen.getByRole("link", { name: /議員カルテ/ });
    expect(members).toHaveAttribute("href", "/upcoming/members");
  });

  it("お知らせ帯に会期の状況と、その会期の議案へのリンクを出す", () => {
    renderHeader();

    expect(screen.getByText(notice.text)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "この会期の議案を見る" })
    ).toHaveAttribute("href", "/kokkai/r8-teirei-3/bills");
  });

  it("お知らせが無ければ帯を出さない", () => {
    renderHeader({ notice: null });

    expect(
      screen.queryByRole("link", { name: "この会期の議案を見る" })
    ).not.toBeInTheDocument();
  });

  it("インタビューのチャットでは検索・タブ・帯を出さず、中断ボタンを出す", () => {
    usePathnameMock.mockReturnValue("/bills/1/interview/chat");
    renderHeader();

    expect(
      screen.queryByRole("link", { name: "議案を検索" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "サービスの切り替え" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(notice.text)).not.toBeInTheDocument();
    expect(screen.getByText("保存して中断")).toBeInTheDocument();
  });

  // チャットでも、ふりがなを切り替えられるようにする。
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
