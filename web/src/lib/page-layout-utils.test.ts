import { describe, expect, it } from "vitest";

import {
  extractBillIdFromPath,
  getMainLayoutKind,
  isInterviewPage,
  isInterviewSection,
  isMainPage,
} from "./page-layout-utils";

describe("isMainPage", () => {
  it("returns true for the top page", () => {
    expect(isMainPage("/")).toBe(true);
  });

  it("returns true for a bill detail page", () => {
    expect(isMainPage("/bills/abc-123")).toBe(true);
  });

  it("returns false for a bill sub-page", () => {
    expect(isMainPage("/bills/abc-123/interview")).toBe(false);
  });

  it("returns false for an unrelated path", () => {
    expect(isMainPage("/about")).toBe(false);
  });

  // 一覧でも難易度の切り替えを出す。
  it("returns true for the bills list page", () => {
    expect(isMainPage("/bills")).toBe(true);
  });

  // 末尾スラッシュは Next 側で正規化されるため、素の一致だけを見る。
  it("returns false for the bills list page with a trailing slash", () => {
    expect(isMainPage("/bills/")).toBe(false);
  });
});

describe("isInterviewPage", () => {
  it("returns true for an interview chat page", () => {
    expect(isInterviewPage("/bills/abc-123/interview/chat")).toBe(true);
  });

  it("returns false for an interview page without /chat", () => {
    expect(isInterviewPage("/bills/abc-123/interview")).toBe(false);
  });

  it("returns false for a bill detail page", () => {
    expect(isInterviewPage("/bills/abc-123")).toBe(false);
  });

  it("returns false for the top page", () => {
    expect(isInterviewPage("/")).toBe(false);
  });
});

describe("isInterviewSection", () => {
  it("returns true for the interview LP page", () => {
    expect(isInterviewSection("/bills/abc-123/interview")).toBe(true);
  });

  it("returns true for the interview chat page", () => {
    expect(isInterviewSection("/bills/abc-123/interview/chat")).toBe(true);
  });

  it("returns false for a bill detail page", () => {
    expect(isInterviewSection("/bills/abc-123")).toBe(false);
  });

  it("returns false for the top page", () => {
    expect(isInterviewSection("/")).toBe(false);
  });

  it("returns false for unrelated paths", () => {
    expect(isInterviewSection("/about")).toBe(false);
  });
});

describe("extractBillIdFromPath", () => {
  it("extracts bill ID from a bill detail path", () => {
    expect(extractBillIdFromPath("/bills/abc-123")).toBe("abc-123");
  });

  it("extracts bill ID from a bill sub-path", () => {
    expect(extractBillIdFromPath("/bills/abc-123/interview/chat")).toBe(
      "abc-123"
    );
  });

  it("returns null when path does not contain /bills/", () => {
    expect(extractBillIdFromPath("/about")).toBeNull();
  });

  it("returns null for the top page", () => {
    expect(extractBillIdFromPath("/")).toBeNull();
  });
});

describe("getMainLayoutKind", () => {
  it.each([
    "/",
    "/bills",
    "/bills/abc-123",
    "/preview/bills/abc-123",
    "/kokkai/r8-teirei-3/bills",
    "/terms",
    "/privacy",
  ])("%s は画面幅いっぱいに使う", (pathname) => {
    expect(getMainLayoutKind(pathname)).toBe("wide");
  });

  it.each([
    "/bills/abc-123/interview",
    "/bills/abc-123/interview/disclosure",
    "/bills/abc-123/opinions",
    "/bills/abc-123/topics",
    "/bills/abc-123/topics/topic-1",
    "/report/report-1",
    "/developers",
  ])("%s は従来の1カラムのまま", (pathname) => {
    expect(getMainLayoutKind(pathname)).toBe("narrow");
  });

  it("インタビューのチャットは画面の高さに収める", () => {
    expect(getMainLayoutKind("/bills/abc-123/interview/chat")).toBe(
      "interview-chat"
    );
    expect(getMainLayoutKind("/preview/bills/abc-123/interview/chat")).toBe(
      "interview-chat"
    );
  });

  // 末尾スラッシュや未知のページは、崩れの少ない従来の組み方に倒す。
  it("知らないページは narrow にする", () => {
    expect(getMainLayoutKind("/bills/")).toBe("narrow");
    expect(getMainLayoutKind("/unknown")).toBe("narrow");
  });
});
