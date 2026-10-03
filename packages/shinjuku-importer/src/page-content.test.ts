import { describe, expect, it } from "vitest";
import {
  decodeExtraEntities,
  extractMainHtml,
  mainContentLines,
  pageUpdatedDate,
  parseReiwaDate,
  reiwaToYear,
} from "./page-content";

const html = `
<header><a>くらし</a></header>
<h1 class="h1_basic01"><span>議員名簿</span></h1>
<p class="update">最終更新日：2026年8月7日</p>
<p>定数：３８名</p>
<div>本ページに関するお問い合わせ</div>
<footer>ページの先頭へ</footer>
`;

describe("extractMainHtml / mainContentLines", () => {
  it("見出しから問い合わせ欄の手前までを本文とし、全角数字を半角にする", () => {
    expect(extractMainHtml(html)).not.toContain("くらし");
    expect(mainContentLines(html)).toEqual(["議員名簿", "最終更新日：2026年8月7日", "定数：38名"]);
  });
});

describe("pageUpdatedDate", () => {
  it("最終更新日を読む", () => {
    expect(pageUpdatedDate(html)).toBe("2026-08-07");
    expect(pageUpdatedDate("<p>なし</p>")).toBeNull();
  });
});

describe("reiwaToYear / parseReiwaDate", () => {
  it("令和を西暦にする（元年は1年）", () => {
    expect(reiwaToYear(7)).toBe(2025);
    expect(reiwaToYear("元")).toBe(2019);
    expect(parseReiwaDate("令和5年5月1日")).toBe("2023-05-01");
    expect(parseReiwaDate("令和元年６月１２日")).toBe("2019-06-12");
    expect(parseReiwaDate("平成31年4月1日")).toBeNull();
  });
});

describe("decodeExtraEntities", () => {
  it("&hellip; などの文字参照を文字に戻し、知らないものはそのまま残す", () => {
    expect(decodeExtraEntities("自参ク&hellip;自民&#x30FB;参政&unknown;")).toBe("自参ク…自民・参政&unknown;");
  });
});
