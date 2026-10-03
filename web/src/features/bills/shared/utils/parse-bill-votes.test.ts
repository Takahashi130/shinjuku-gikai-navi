import { describe, expect, it } from "vitest";
import {
  FACTION_VOTES_HEADING,
  parseBillVotes,
  RESULT_HEADING,
  removeMarkdownSections,
  tallyFactionVotes,
} from "./parse-bill-votes";

/** 取り込み（buildContent）が書く形 */
const imported = [
  "## 概要",
  "",
  "予算額：1,878億3,556万円",
  "",
  "## 議決結果",
  "",
  "**可決**（第1号議案）",
  "",
  "## 会派ごとの賛否",
  "",
  "- **賛成**：自民・参政クラブ、新宿区議会公明党（1人反対）、日本維新の会・新宿区議団",
  "- **反対**：日本共産党新宿区議会議員団、れいわ新選組 新宿",
  "",
  "## 出典",
  "",
  "- [新宿区議会「令和8年第1回定例会」](https://example.com)",
  "",
  "※この内容は新宿区議会の公開資料をもとに自動で作成しています。",
].join("\n");

describe("parseBillVotes", () => {
  it("議決結果と会派ごとの賛否を読む", () => {
    expect(parseBillVotes(imported)).toEqual({
      result: "可決",
      resultNote: "第1号議案",
      hasFactionVotes: true,
      for: [
        { name: "自民・参政クラブ", note: null },
        { name: "新宿区議会公明党", note: "1人反対" },
        { name: "日本維新の会・新宿区議団", note: null },
      ],
      against: [
        { name: "日本共産党新宿区議会議員団", note: null },
        { name: "れいわ新選組 新宿", note: null },
      ],
    });
  });

  it("「なし」は0会派にする", () => {
    const markdown = [
      "## 議決結果",
      "",
      "**同意**（第5号議案）",
      "",
      "## 会派ごとの賛否",
      "",
      "- **賛成**：会派A、会派B",
      "- **反対**：なし",
    ].join("\n");

    expect(parseBillVotes(markdown)).toMatchObject({
      result: "同意",
      for: [
        { name: "会派A", note: null },
        { name: "会派B", note: null },
      ],
      against: [],
    });
  });

  // 添え書きに読点が入っても、会派の区切りと取り違えない。
  it("括弧の中の読点では区切らない", () => {
    const markdown = [
      "## 会派ごとの賛否",
      "",
      "- **賛成**：会派A（1人反対、1人退席）、会派B",
    ].join("\n");

    expect(parseBillVotes(markdown)?.for).toEqual([
      { name: "会派A", note: "1人反対、1人退席" },
      { name: "会派B", note: null },
    ]);
  });

  it("添え書きの無い議決結果も読む", () => {
    const markdown = ["## 議決結果", "", "**否決**"].join("\n");

    expect(parseBillVotes(markdown)).toMatchObject({
      result: "否決",
      resultNote: null,
      hasFactionVotes: false,
      for: [],
      against: [],
    });
  });

  // 審議中の議案や、管理画面で書かれた解説は構造化できないのでそのまま出す。
  it("議決結果も会派の賛否も無ければ null", () => {
    const pending = [
      "## 審議の状況",
      "",
      "令和8年第3回定例会で審議中です（第60号議案）。",
    ].join("\n");

    expect(parseBillVotes(pending)).toBeNull();
    expect(parseBillVotes("")).toBeNull();
    expect(parseBillVotes(null)).toBeNull();
    expect(parseBillVotes(undefined)).toBeNull();
  });
});

describe("removeMarkdownSections", () => {
  it("指定した h2 の節だけを取り除く", () => {
    expect(
      removeMarkdownSections(imported, [RESULT_HEADING, FACTION_VOTES_HEADING])
    ).toBe(
      [
        "## 概要",
        "",
        "予算額：1,878億3,556万円",
        "",
        "## 出典",
        "",
        "- [新宿区議会「令和8年第1回定例会」](https://example.com)",
        "",
        "※この内容は新宿区議会の公開資料をもとに自動で作成しています。",
      ].join("\n")
    );
  });

  it("見出しが無ければそのまま返す", () => {
    expect(removeMarkdownSections("## 概要\n\n本文", ["議決結果"])).toBe(
      "## 概要\n\n本文"
    );
  });

  it("h3 は節の区切りとして扱わない", () => {
    const markdown = [
      "## 議決結果",
      "",
      "### 補足",
      "",
      "取り除かれる",
      "",
      "## 出典",
      "",
      "残る",
    ].join("\n");

    expect(removeMarkdownSections(markdown, ["議決結果"])).toBe(
      "## 出典\n\n残る"
    );
  });
});

describe("tallyFactionVotes", () => {
  const faction = (name: string) => ({ name, note: null });

  it("会派の数と賛成の割合を出す", () => {
    expect(
      tallyFactionVotes({
        for: [faction("A"), faction("B"), faction("C")],
        against: [faction("D")],
      })
    ).toEqual({ forCount: 3, againstCount: 1, forPercent: 75 });
  });

  it("全会一致は100%", () => {
    expect(
      tallyFactionVotes({ for: [faction("A")], against: [] }).forPercent
    ).toBe(100);
  });

  // 0除算で NaN% を描かないようにする。
  it("会派が無ければ割合は null", () => {
    expect(tallyFactionVotes({ for: [], against: [] })).toEqual({
      forCount: 0,
      againstCount: 0,
      forPercent: null,
    });
  });
});
