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

describe("parseSessionPage（臨時会・その他の議案）", () => {
  const page = parseSessionPage(
    `<h1>令和7年 第1回臨時会</h1><p>会期</p><p>令和7年3月31日（月曜日）［1日間］</p>
     <p>第46号議案　新宿区特別区税条例の一部を改正する条例<br>
     同意第1号　新宿区副区長選任の同意について<br>
     認定第1号　令和5年度新宿区一般会計歳入歳出決算<br>
     諮問第1号 人権擁護委員候補者の推薦に関する意見の聴取について<br>
     第3回定例会の日程</p>`,
    "https://example.com/"
  );

  it("1日だけの会期を読む", () => {
    expect(page).toMatchObject({ type: "extraordinary", startDate: "2025-03-31", endDate: "2025-03-31" });
  });

  it("「・」のない行や、同意・認定・諮問の議案を読む", () => {
    expect(page.bills.map((b) => [b.kind, b.label])).toEqual([
      ["mayor", "第46号議案"],
      ["consent", "同意第1号"],
      ["accounts", "認定第1号"],
      ["inquiry", "諮問第1号"],
    ]);
  });
});

describe("parseSessionPage（令和元年）", () => {
  it("「令和元年」を令和1年として読む", () => {
    const p = parseSessionPage(
      "<h1>令和元年 第2回定例会</h1><p>令和元年6月4日（火曜日）から6月14日（金曜日）まで</p>",
      "https://example.com/"
    );
    expect(p).toMatchObject({ reiwaYear: 1, startDate: "2019-06-04", endDate: "2019-06-14" });
  });
});
