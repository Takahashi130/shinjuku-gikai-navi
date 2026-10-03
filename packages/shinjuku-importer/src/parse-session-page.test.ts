import { describe, expect, it } from "vitest";
import { parseSessionPage, toHalfWidthDigits } from "./parse-session-page";

const html = `
<h1>令和8年 第2回定例会</h1>
<p>令和8年6月10日（水曜日）から6月19日（金曜日）まで［10日間］</p>
<p><a href="/content/000459252.pdf">議案の概要と審議結果</a></p>
<p>・承認第 2号&nbsp;&nbsp;専決処分の承認について<br>
・第42号議案      令和8年度新宿区一般会計補正予算（第2号）<br>
・議員提出議案第７号　新宿区立学校における学用品の給付に関する条例</p>
`;

describe("toHalfWidthDigits", () => {
  it("全角数字を半角にする", () => {
    expect(toHalfWidthDigits("第１２号")).toBe("第12号");
  });
});

describe("parseSessionPage", () => {
  const page = parseSessionPage(html, "https://www.city.shinjuku.lg.jp/kusei/x.html");

  it("会期名と会期を読む", () => {
    expect(page).toMatchObject({
      title: "令和8年第2回定例会",
      reiwaYear: 8,
      ordinal: 2,
      type: "regular",
      startDate: "2026-06-10",
      endDate: "2026-06-19",
    });
  });

  it("区長提出・承認・議員提出の議案を読み分ける", () => {
    expect(page.bills).toEqual([
      { kind: "approval", number: 2, label: "承認第2号", name: "専決処分の承認について" },
      { kind: "mayor", number: 42, label: "第42号議案", name: "令和8年度新宿区一般会計補正予算（第2号）" },
      { kind: "member", number: 7, label: "議員提出議案第7号", name: "新宿区立学校における学用品の給付に関する条例" },
    ]);
  });

  it("審議結果 PDF の URL を絶対 URL にする", () => {
    expect(page.resultsPdfUrl).toBe("https://www.city.shinjuku.lg.jp/content/000459252.pdf");
  });

  it("年をまたぐ会期を読む", () => {
    const p = parseSessionPage(
      "<h1>令和7年 第4回定例会</h1><p>令和7年11月20日（木曜日）から令和8年1月5日（月曜日）まで</p>",
      "https://example.com/"
    );
    expect(p.startDate).toBe("2025-11-20");
    expect(p.endDate).toBe("2026-01-05");
  });

  it("会期名がなければエラーにする", () => {
    expect(() => parseSessionPage("<p>なし</p>", "https://example.com/")).toThrow("会期名");
  });
});
