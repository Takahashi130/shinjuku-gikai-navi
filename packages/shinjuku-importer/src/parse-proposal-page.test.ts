import { describe, expect, it } from "vitest";
import { findOverviewLink, findProposalPageLink, parseProposalPage } from "./parse-proposal-page";

const base = "https://www.city.shinjuku.lg.jp/kusei/";

describe("findOverviewLink", () => {
  it("「議案の概要」の HTML ページを返し、審議結果の PDF は選ばない", () => {
    const html = `
      <a href="/content/000459252.pdf">議案の概要と審議結果<span> [PDF形式：316KB] </span></a>
      <div class="free_text_area01"><a href="/kusei/index_gian01.html">議案の概要</a><br>`;
    expect(findOverviewLink(html, `${base}x.html`)).toBe(`${base}index_gian01.html`);
  });

  it("無ければ null", () => {
    expect(findOverviewLink("<a href='/a.html'>議案</a>", base)).toBeNull();
  });
});

describe("findProposalPageLink", () => {
  const index = `
    <li class="icoArrow01"><a href="/kusei/kuseijoho01_001109_03.html">令和8年第3回定例会提出議案</a></li>
    <li class="icoArrow01"><a href="/kusei/kuseijoho01_001109_02.html">令和8年第2回定例会提出議案</a></li>
    <li class="icoArrow01"><a href="/kusei/kuseijoho01_r7_03.html">令和7年第3回臨時会提出議案</a></li>`;

  it("会期名に「提出議案」が付いたリンクを返す", () => {
    expect(findProposalPageLink(index, `${base}index_gian01.html`, "令和8年第3回定例会")).toBe(
      `${base}kuseijoho01_001109_03.html`
    );
    expect(findProposalPageLink(index, `${base}index_gian01.html`, "令和7年第3回臨時会")).toBe(
      `${base}kuseijoho01_r7_03.html`
    );
  });

  it("一覧に無い会期は null", () => {
    expect(findProposalPageLink(index, base, "令和8年第4回定例会")).toBeNull();
  });
});

describe("parseProposalPage", () => {
  const html = `
    <li class="icoPdf01 even"><a href="/content/000464781.pdf" target="_blank">令和8年度9月補正予算概要<span> [PDF形式：137KB] </span>（新規ウィンドウ表示）</a><div class="desc">一般会計（補正第4号）</div></li>
    <li class="icoPdf01 odd"><a href="/content/000466336.pdf" target="_blank">第63号議案　令和8年度新宿区一般会計補正予算（第4号）<span> [PDF形式：151KB] </span>（新規ウィンドウ表示）</a></li>
    <li class="icoPdf01 odd"><a href="/content/000466361.pdf" target="_blank">認定第1号　令和7年度新宿区一般会計歳入歳出決算<span> [PDF形式：194KB] </span>（新規ウィンドウ表示）</a></li>
    <li class="icoPdf01 odd"><a href="/content/000464786.pdf" target="_blank">令和8年第3回区議会定例会提出案件概要<span> [PDF形式：312KB] </span>（新規ウィンドウ表示）</a></li>
    <li><a href="/kusei/zaisei.html">財政課ページ</a></li>`;
  const links = parseProposalPage(html, `${base}kuseijoho01_001109_03.html`);

  it("PDF へのリンクだけを、種類と議案番号つきで返す", () => {
    expect(links.map((l) => [l.kind, l.label, l.text])).toEqual([
      ["budget_overview", null, "令和8年度9月補正予算概要"],
      ["full_text", "第63号議案", "第63号議案 令和8年度新宿区一般会計補正予算(第4号)"],
      ["full_text", "認定第1号", "認定第1号 令和7年度新宿区一般会計歳入歳出決算"],
      ["overview", null, "令和8年第3回区議会定例会提出案件概要"],
    ]);
  });

  it("リンクの下の説明と、絶対 URL を返す", () => {
    expect(links[0]).toMatchObject({
      url: "https://www.city.shinjuku.lg.jp/content/000464781.pdf",
      desc: "一般会計(補正第4号)",
    });
    expect(links[1].desc).toBeNull();
  });
});
