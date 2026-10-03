import { describe, expect, it } from "vitest";
import { extractQuestionPageLinks, parseQuestionPage } from "./parse-question-page";

// 区の「代表質問・一般質問」ページの一部（令和8年第3回定例会の形）
const html = `
<h1 class="h1_basic01"><span>令和8年 第3回定例会 代表質問・一般質問</span></h1>
<p><a href="/content/000000001.pdf">令和8年第3回定例会質問者・質問時間一覧 [PDF形式：80KB]</a></p>
<h2>代表質問 9月16日（水曜日）</h2>
<p>ひやま 真一議員（自民・参政クラブ）<br>
【一問一答方式】<br>
1 令和7年度の行財政運営について【区長】<br>
6 将来を担う子どもたちの教育環境について【区長】 【教育委員会】</p>
<h2>一般質問 9月17日（木曜日）</h2>
<p>さわい めぐみ議員（いのちの党 新宿）<br>
【一括方式】<br>
1 送り迎えできなければ学校に行けない、特別支援学級の壁と、子どもの学ぶ権利を守る区政について【区長】【教育委員会】</p>
<p>青木 仁美議員（自民・参政クラブ）<br>
1 安全で安心な暮らしを守る取り組みについて【区長】</p>
<div>本ページに関するお問い合わせ</div>
`;

describe("parseQuestionPage", () => {
  const { questions, skippedLines } = parseQuestionPage(html, "2026-09-16");

  it("代表質問・一般質問ごとに、日付・質問者・会派・方式・題名・答弁者を読む", () => {
    expect(questions).toEqual([
      {
        questionType: "representative",
        askedOn: "2026-09-16",
        speakerName: "ひやま 真一",
        factionName: "自民・参政クラブ",
        answerStyle: "one_by_one",
        topics: [
          { number: 1, title: "令和7年度の行財政運営について", responders: ["区長"] },
          { number: 6, title: "将来を担う子どもたちの教育環境について", responders: ["区長", "教育委員会"] },
        ],
      },
      {
        questionType: "general",
        askedOn: "2026-09-17",
        speakerName: "さわい めぐみ",
        factionName: "いのちの党 新宿",
        answerStyle: "bulk",
        topics: [
          {
            number: 1,
            title: "送り迎えできなければ学校に行けない、特別支援学級の壁と、子どもの学ぶ権利を守る区政について",
            responders: ["区長", "教育委員会"],
          },
        ],
      },
      {
        questionType: "general",
        askedOn: "2026-09-17",
        speakerName: "青木 仁美",
        factionName: "自民・参政クラブ",
        answerStyle: null,
        topics: [{ number: 1, title: "安全で安心な暮らしを守る取り組みについて", responders: ["区長"] }],
      },
    ]);
    expect(skippedLines).toEqual([]);
  });

  it("会期による表記の揺れ（「議員」「日」「方式」の抜け、番号の後の空白なし、半角括弧）を読む", () => {
    const variant = `
<h1>令和7年 第4回定例会 代表質問・一般質問</h1>
<p>代表質問 11月26（水曜日）</p>
<p>石川 孝一（自民・参政クラブ）<br>【一問一答】<br>1決算について<br>2 8050・7040問題について 【区長】</p>
<p>永原 たかやす議員(自由民主党新宿区議会議員団）<br>1 区財政について 【区長】</p>
<p>山口 かおる議員 （立憲民主党・無所属クラブ）<br>1 「いじめ」について【教育委員会】</p>
<div>本ページに関するお問い合わせ</div>`;
    const { questions: qs } = parseQuestionPage(variant, "2025-11-26");
    expect(qs.map((q) => [q.speakerName, q.factionName, q.askedOn, q.answerStyle])).toEqual([
      ["石川 孝一", "自民・参政クラブ", "2025-11-26", "one_by_one"],
      ["永原 たかやす", "自由民主党新宿区議会議員団", "2025-11-26", null],
      ["山口 かおる", "立憲民主党・無所属クラブ", "2025-11-26", null],
    ]);
    expect(qs[0].topics).toEqual([
      { number: 1, title: "決算について", responders: [] },
      { number: 2, title: "8050・7040問題について", responders: ["区長"] },
    ]);
  });

  it("年をまたぐ会期では、会期初日より前の月を翌年にする", () => {
    const { questions: qs } = parseQuestionPage(
      "<h1>x</h1><p>一般質問 1月8日（木曜日）</p><p>のづ ケン議員（新宿未来の会）<br>1 区政について【区長】</p>",
      "2025-11-26"
    );
    expect(qs[0].askedOn).toBe("2026-01-08");
  });

  it("読めない行を返す", () => {
    const { skippedLines: skipped } = parseQuestionPage(
      "<h1>x</h1><p>代表質問 6月12日（水曜日）</p><p>（休憩）</p>",
      "2019-06-12"
    );
    expect(skipped).toEqual(["（休憩）"]);
  });
});

describe("extractQuestionPageLinks", () => {
  it("会期ページから質問者一覧のページへのリンクを取り出す（PDF は除く）", () => {
    const sessionHtml = `
<a href="/kusei/file08_05_0005420210602_00020.html">質問者・質問内容一覧</a>
<a href="/kusei/file08_05_0005420210602_00020.html">質問者・質問内容一覧</a>
<a href="/content/000000001.pdf">質問者・質問時間一覧</a>
<a href="/kusei/other.html">議案の概要</a>`;
    expect(extractQuestionPageLinks(sessionHtml, "https://www.city.shinjuku.lg.jp/kusei/x.html")).toEqual([
      "https://www.city.shinjuku.lg.jp/kusei/file08_05_0005420210602_00020.html",
    ]);
  });

  it("令和元年〜2年の「※2月19日、20日質問内容」のリンクも取り出す", () => {
    const sessionHtml = '<a href="/kusei/file08_05_0005420200210.html">※2月19日、20日質問内容</a>';
    expect(extractQuestionPageLinks(sessionHtml, "https://www.city.shinjuku.lg.jp/kusei/x.html")).toEqual([
      "https://www.city.shinjuku.lg.jp/kusei/file08_05_0005420200210.html",
    ]);
  });
});
