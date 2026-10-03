import { describe, expect, it } from "vitest";
import { extractScheduleLines, parseSessionPage, toHalfWidthDigits } from "./parse-session-page";

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

describe("parseVoteSchedule（採決予定）", () => {
  const page = (title: string, period: string, schedule: string[]) =>
    parseSessionPage(
      [
        `<h1>${title}</h1>`,
        "<h2>会期と日程</h2><h3>会期</h3>",
        `<p>${period}</p>`,
        "<h3>主な会議日程</h3>",
        ...schedule.map((l) => `<p>${l}</p>`),
        "<h2>議案</h2>",
        "<p>・第63号議案 令和8年度新宿区一般会計補正予算（第4号）</p>",
      ].join("\n"),
      "https://example.com/"
    );

  it("「議案の討論・採決等」の本会議の日時を読む（令和8年第3回定例会）", () => {
    const p = page("令和8年 第3回定例会", "令和8年9月16日（水曜日）から10月15日（木曜日）まで【30日間】", [
      "9月16日（水曜日）",
      "10時 本会議（代表質問等） 質問者・質問内容一覧",
      "10月13日（火曜日）",
      "特別委員会終了後 議会運営委員会",
      "10月15日（木曜日）",
      "11時 議会運営委員会",
      "14時 本会議（議案の討論・採決等）",
    ]);
    expect(p.finalVoteAt).toBe("2026-10-15T14:00:00+09:00");
    expect(p.finalVoteTimeInferred).toBe(false);
    expect(p.earlyVoteAt).toBeNull();
  });

  it("先議の時刻は、同じ日の直前に書かれた時刻を使う。追加議案の採決は数えない（令和8年第1回定例会）", () => {
    const p = page("令和8年 第1回定例会", "令和8年2月17日（火曜日）から3月24日（火曜日）まで［36日間］", [
      "2月17日（火曜日）",
      "14時 本会議（令和8年度区政の基本方針説明）",
      "本会議休憩中 常任委員会（総務区民、福祉健康、文教子ども家庭）",
      "常任委員会終了後 議会運営委員会",
      "議会運営委員会終了後 本会議（先議議案の採決等）",
      "3月24日（火曜日）",
      "11時 議会運営委員会",
      "14時 本会議（議案の採決等）",
      "本会議休憩中 予算特別委員会",
      "議会運営委員会終了後 本会議（追加議案の採決等）",
    ]);
    expect(p.finalVoteAt).toBe("2026-03-24T14:00:00+09:00");
    expect(p.earlyVoteAt).toBe("2026-02-17T14:00:00+09:00");
  });

  it("「14：00本会議」のような古い書き方と分の付いた時刻を読む", () => {
    const p = page("令和3年 第1回定例会", "令和3年2月15日（月曜日）から3月17日（水曜日）まで［31日間］", [
      "2月15日（月曜日）",
      "14：00本会議（令和3年度区政の基本方針説明）",
      "3月17日（水曜日）",
      "11：00議会運営委員会",
      "13時30分 本会議（議案の採決等）",
    ]);
    expect(p.finalVoteAt).toBe("2021-03-17T13:30:00+09:00");
  });

  it("年をまたぐ会期では翌年の日付にする", () => {
    const p = page("令和7年 第4回定例会", "令和7年11月20日（木曜日）から令和8年1月5日（月曜日）まで", [
      "11月20日（木曜日）",
      "10時 本会議（代表質問等）",
      "1月5日（月曜日）",
      "14時 本会議（議案の討論・採決等）",
    ]);
    expect(p.finalVoteAt).toBe("2026-01-05T14:00:00+09:00");
  });

  it("臨時会で採決の行が無いときは、初日の最初の本会議の時刻にする", () => {
    const p = page("令和7年 第1回臨時会", "令和7年3月31日（月曜日）［1日間］", [
      "3月31日（月曜日）",
      "14時 本会議",
      "本会議休憩中 常任委員会（総務区民）",
      "議会運営委員会終了後 本会議",
    ]);
    expect(p.finalVoteAt).toBe("2025-03-31T14:00:00+09:00");
    expect(p.finalVoteTimeInferred).toBe(true);
  });

  it("臨時会で時刻の無い採決の行は、その日の直前の時刻を使う", () => {
    const p = page("令和3年 第1回臨時会", "令和3年3月31日（水曜日）【1日間】", [
      "3月31日（水曜日）",
      "14：00 本会議（議案の説明・付託等）",
      "常任委員会終了後 議会運営委員会",
      "議会運営委員会終了後 本会議 （議案の採決等）",
    ]);
    expect(p.finalVoteAt).toBe("2021-03-31T14:00:00+09:00");
    // 「議会運営委員会終了後」の採決は 14 時より後のことがある（下限の時刻）
    expect(p.finalVoteTimeInferred).toBe(true);
  });

  it("臨時会で日程が無いときは初日の 14 時にする", () => {
    const p = parseSessionPage(
      "<h1>令和7年 第2回臨時会</h1><p>会期</p><p>令和7年5月23日（金曜日）［1日間］</p>",
      "https://example.com/"
    );
    expect(p.finalVoteAt).toBe("2025-05-23T14:00:00+09:00");
  });

  it("定例会で採決の行が読めなければ null にする", () => {
    const p = page("令和8年 第2回定例会", "令和8年6月10日（水曜日）から6月19日（金曜日）まで［10日間］", [
      "6月10日（水曜日）",
      "10時 本会議（代表質問等）",
    ]);
    expect(p.finalVoteAt).toBeNull();
    expect(p.finalVoteTimeInferred).toBe(true);
    expect(p.earlyVoteAt).toBeNull();
  });
});

describe("extractScheduleLines", () => {
  it("「会期と日程」から議案の一覧の手前までを返す", () => {
    const lines = extractScheduleLines(
      "<h1>令和8年 第3回定例会</h1><h2>会期と日程</h2><h3>会期</h3><p>令和8年9月16日（水曜日）から10月15日（木曜日）まで</p><h3>主な会議日程</h3><p>10月15日（木曜日）<br>14時 本会議（議案の討論・採決等）</p><h2>議案</h2><p>・第63号議案 補正予算</p>"
    );
    expect(lines).toEqual([
      "会期と日程",
      "会期",
      "令和8年9月16日（水曜日）から10月15日（木曜日）まで",
      "主な会議日程",
      "10月15日（木曜日）",
      "14時 本会議（議案の討論・採決等）",
    ]);
  });
});
