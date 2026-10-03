import { describe, expect, it } from "vitest";
import { parseMemberList } from "./parse-member-list";

// 区の議員名簿ページの一部（2026年8月時点の形）。住所・電話・メールの行は読まないことを確かめるため、
// 実在の値ではなく伏せ字に置き換えている。
const html = `
<h1 class="h1_basic01"><span>議員名簿</span></h1>
<div class="free_text_area01">令和5年4月23日の新宿区議会議員選挙で、新たな議員が選出されました。<br>
（第20期任期：令和5年5月1日～令和9年4月30日）<br>
<a href="/kusei/file08_00003.html">会派構成</a></div>
<h2 class="h2_basic02"><span>定数:38名（議席番号順）</span></h2>
<div class="free_text_area01">氏名（ふりがな）　当選期数<br>所属会派名<br>住所　<br>電話番号<br>その他連絡先<br>所属委員会</div>
<div class="clearfix">
  <div class="imgArticle01 imgArticleLeft"><img src="/content/000000001.jpg" alt="木もと ひろゆき議員" /></div>
  <div class="free_text_area01">No.1 木もと ひろゆき（きもと ひろゆき）　3期<br>新宿区議会公明党<br>〒000-0000 （住所）<br>TEL （電話番号）<br>URL　https://example.com/<br>常任委員会（文教子ども家庭委員会・委員長）<br>特別委員会（防災等安全対策特別委員会）</div>
</div>
<div class="clearfix">
  <div class="free_text_area01">No.2 時光 じゅん子（ときみつ じゅんこ）　2期<br>
新宿区議会公明党<br>
〒000-0000 （住所）※<br>
E-mail　（メールアドレス）<br>
常任委員会（環境建設委員会）、議会運営委員会<br>
　　　　　　　 特別委員会（本庁舎対策等特別委員会）</div>
</div>
<div class="clearfix">
  <div class="free_text_area01">No.37 さわい めぐみ（さわい めぐみ）　1期<br>いのちの党 新宿<br>TEL ※</div>
</div>
<div>本ページに関するお問い合わせ</div>
`;

describe("parseMemberList", () => {
  const list = parseMemberList(html);

  it("任期と選挙の日を読む", () => {
    expect(list).toMatchObject({
      termNumber: 20,
      termStart: "2023-05-01",
      termEnd: "2027-04-30",
      electionDate: "2023-04-23",
    });
  });

  it("議席番号・氏名・ふりがな・当選期数・会派だけを読む", () => {
    expect(list.members).toEqual([
      { seatNumber: 1, name: "木もと ひろゆき", nameKana: "きもと ひろゆき", electedCount: 3, factionName: "新宿区議会公明党" },
      { seatNumber: 2, name: "時光 じゅん子", nameKana: "ときみつ じゅんこ", electedCount: 2, factionName: "新宿区議会公明党" },
      { seatNumber: 37, name: "さわい めぐみ", nameKana: "さわい めぐみ", electedCount: 1, factionName: "いのちの党 新宿" },
    ]);
  });

  it("住所・電話・メールは結果に含めない", () => {
    expect(JSON.stringify(list)).not.toMatch(/住所|電話番号|メールアドレス|example\.com/);
  });

  it("議員の行が無ければエラーにする", () => {
    expect(() => parseMemberList("<h1>議員名簿</h1><p>準備中</p>")).toThrow("議員名簿の行");
  });
});
