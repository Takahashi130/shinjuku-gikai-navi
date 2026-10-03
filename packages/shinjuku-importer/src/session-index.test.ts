import { describe, expect, it } from "vitest";
import { extractSessionLinks } from "./session-index";

describe("extractSessionLinks", () => {
  it("会期ページへのリンクだけを絶対 URL で重複なく返す", () => {
    const html = `
      <a href="/kusei/a.html">第1回定例会</a>
      <a href="/kusei/b.html">第1回 臨時会</a>
      <a href="/kusei/a.html">第1回定例会</a>
      <a href="/kusei/c.html">令和8年第3回定例会の主な日程</a>
      <a href="/kusei/e.html">令和8年第3回定例会の議案を追加掲載しました</a>
      <a href="/kusei/d.html">会議録の検索</a>`;
    expect(extractSessionLinks(html, "https://www.city.shinjuku.lg.jp/kusei/file08_00015.html")).toEqual([
      "https://www.city.shinjuku.lg.jp/kusei/a.html",
      "https://www.city.shinjuku.lg.jp/kusei/b.html",
      "https://www.city.shinjuku.lg.jp/kusei/c.html",
    ]);
  });
});
