import { describe, expect, it } from "vitest";
import { parseCommitteeRoster, parseCouncilOfficers } from "./parse-committee-roster";

// 区の委員会名簿ページの一部（2026年8月時点の形）
const rosterHtml = `
<h1 class="h1_basic01"><span>委員会名簿</span></h1>
<p>・会派名略称<br>
自参ク&hellip;自民・参政クラブ<br>
公明&hellip;&hellip;新宿区議会公明党<br>
いのち…いのちの党 新宿</p>
<h2>総務区民委員会【定数：10名】</h2>
<p>委員長：藤原 たけき（共産）<br>
副委員長：有馬 としろう（公明）<br>
高阪 まさし（自参ク）</p>
<h2>議会運営委員会【定数：12名】</h2>
<p>委員長：ひやま 真一（自参ク）</p>
<h2>防災等安全対策特別委員会【定数：10名】</h2>
<p>青木 仁美 （自参ク）</p>
<div>本ページに関するお問い合わせ</div>
`;

describe("parseCommitteeRoster", () => {
  const roster = parseCommitteeRoster(rosterHtml);

  it("会派の略称と正式名称の対応を読む", () => {
    expect([...roster.factionAbbreviations]).toEqual([
      ["自参ク", "自民・参政クラブ"],
      ["公明", "新宿区議会公明党"],
      ["いのち", "いのちの党 新宿"],
    ]);
  });

  it("委員会ごとの種類・定数・委員と役職を読む", () => {
    expect(roster.committees).toEqual([
      {
        name: "総務区民委員会",
        kind: "standing_committee",
        capacity: 10,
        members: [
          { name: "藤原 たけき", role: "委員長", factionAbbr: "共産" },
          { name: "有馬 としろう", role: "副委員長", factionAbbr: "公明" },
          { name: "高阪 まさし", role: "委員", factionAbbr: "自参ク" },
        ],
      },
      {
        name: "議会運営委員会",
        kind: "steering_committee",
        capacity: 12,
        members: [{ name: "ひやま 真一", role: "委員長", factionAbbr: "自参ク" }],
      },
      {
        name: "防災等安全対策特別委員会",
        kind: "special_committee",
        capacity: 10,
        members: [{ name: "青木 仁美", role: "委員", factionAbbr: "自参ク" }],
      },
    ]);
  });

  it("委員会の見出しが無ければエラーにする", () => {
    expect(() => parseCommitteeRoster("<h1>委員会名簿</h1>")).toThrow("委員会の見出し");
  });
});

// 区の「議長と副議長」ページの一部
const officersHtml = `
<h1>議長と副議長</h1>
<p>令和7年第2回臨時会（令和7年5月23日）で、 議長と副議長を選任しました。</p>
<p>議長　渡辺 清人（わたなべ きよと）　3期<br>自民・参政クラブ</p>
<p>副議長　三沢 ひで子（みさわ ひでこ）　3期<br>新宿区議会公明党</p>
<div>本ページに関するお問い合わせ</div>
`;

describe("parseCouncilOfficers", () => {
  it("議長と副議長の氏名と会派を読む", () => {
    expect(parseCouncilOfficers(officersHtml)).toEqual([
      { role: "議長", name: "渡辺 清人", factionName: "自民・参政クラブ" },
      { role: "副議長", name: "三沢 ひで子", factionName: "新宿区議会公明党" },
    ]);
  });

  it("議長の行が無ければエラーにする", () => {
    expect(() => parseCouncilOfficers("<h1>議長と副議長</h1>")).toThrow("議長・副議長");
  });
});
