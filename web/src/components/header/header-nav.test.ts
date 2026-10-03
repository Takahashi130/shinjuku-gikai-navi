import { describe, expect, it } from "vitest";
import {
  getActiveHeaderTabId,
  getHeaderTabAriaCurrent,
  HEADER_TABS,
  type HeaderTab,
} from "./header-nav";

function tabOf(id: HeaderTab["id"]): HeaderTab {
  const tab = HEADER_TABS.find((candidate) => candidate.id === id);
  if (!tab) throw new Error(`タブ ${id} が無い`);
  return tab;
}

describe("HEADER_TABS", () => {
  it("議案・LIVE中継・効果測定・議員カルテの順に並べる", () => {
    expect(HEADER_TABS.map((tab) => tab.label)).toEqual([
      "議案・区民投票",
      "議会LIVE中継",
      "5年間効果測定",
      "議員カルテ・政務活動費",
    ]);
  });

  // 「#」はヘッダーが飾りとして足す。文言に入れると読み上げで「シャープ」と読む。
  it("文言に「#」を含めない", () => {
    for (const tab of HEADER_TABS) {
      expect(tab.label.startsWith("#")).toBe(false);
    }
  });

  // 存在しないページへのリンクを作らない。まだ無い機能は説明ページへ送る。
  it("まだ無い機能は準備中の説明ページへ送る", () => {
    expect(
      HEADER_TABS.filter((tab) => tab.comingSoon).map((tab) => tab.href)
    ).toEqual(["/upcoming/live", "/upcoming/impact", "/upcoming/members"]);
  });

  it("議案のタブはトップへ送る", () => {
    expect(tabOf("bills")).toMatchObject({ href: "/", comingSoon: false });
  });
});

describe("getActiveHeaderTabId", () => {
  it.each([
    "/",
    "/bills",
    "/bills/abc",
    "/bills/abc/topics",
    "/kokkai/r8-teirei-3/bills",
    "/preview/bills/abc",
  ])("%s は議案のタブ", (pathname) => {
    expect(getActiveHeaderTabId(pathname)).toBe("bills");
  });

  it("説明ページはそれぞれのタブ", () => {
    expect(getActiveHeaderTabId("/upcoming/live")).toBe("live");
    expect(getActiveHeaderTabId("/upcoming/members")).toBe("members");
  });

  it("どのタブにも当たらないページは null", () => {
    expect(getActiveHeaderTabId("/terms")).toBeNull();
    expect(getActiveHeaderTabId("/developers")).toBeNull();
    expect(getActiveHeaderTabId("/upcoming/unknown")).toBeNull();
    expect(getActiveHeaderTabId("/upcoming/livestream")).toBeNull();
  });
});

describe("getHeaderTabAriaCurrent", () => {
  // トップへのリンクを、トップ以外で「現在のページ」と読み上げない。
  it("タブの行き先そのもののページだけ page にする", () => {
    expect(getHeaderTabAriaCurrent(tabOf("bills"), "/")).toBe("page");
    expect(getHeaderTabAriaCurrent(tabOf("live"), "/upcoming/live")).toBe(
      "page"
    );
  });

  it.each([
    "/bills",
    "/bills/abc",
    "/kokkai/r8-teirei-3/bills",
  ])("同じ区分のほかのページ（%s）では true にする", (pathname) => {
    expect(getHeaderTabAriaCurrent(tabOf("bills"), pathname)).toBe("true");
  });

  it("ほかの区分のページでは付けない", () => {
    expect(getHeaderTabAriaCurrent(tabOf("bills"), "/upcoming/live")).toBe(
      undefined
    );
    expect(getHeaderTabAriaCurrent(tabOf("live"), "/bills")).toBe(undefined);
    expect(getHeaderTabAriaCurrent(tabOf("members"), "/terms")).toBe(undefined);
  });
});
