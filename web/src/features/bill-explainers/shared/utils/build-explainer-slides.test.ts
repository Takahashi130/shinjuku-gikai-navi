import { describe, expect, it } from "vitest";
import {
  buildExplainerSlides,
  CONCERNS_EMPTY_MESSAGE,
  formatPagesLabel,
} from "./build-explainer-slides";
import { sampleBillExplainer } from "./explainer-fixtures";

describe("formatPagesLabel", () => {
  it("ページが無ければ null", () => {
    expect(formatPagesLabel([])).toBeNull();
  });

  it("1ページ・とびとびのページ・続いたページを短く書く", () => {
    expect(formatPagesLabel([3])).toBe("3ページ");
    expect(formatPagesLabel([5, 3])).toBe("3・5ページ");
    expect(formatPagesLabel([3, 4])).toBe("3・4ページ");
    expect(formatPagesLabel([5, 4, 3])).toBe("3〜5ページ");
    expect(formatPagesLabel([3, 3, 4, 5])).toBe("3〜5ページ");
  });
});

describe("buildExplainerSlides", () => {
  const { body, sources } = sampleBillExplainer();

  it("7枚を決まった順に並べる", () => {
    const slides = buildExplainerSlides(body, sources);
    expect(slides.map((s) => s.id)).toEqual([
      "cover",
      "purpose",
      "background",
      "merits",
      "concerns",
      "keyFacts",
      "notInMaterials",
    ]);
  });

  it("表紙に見出しとひとことを入れる", () => {
    const [cover] = buildExplainerSlides(body, sources);
    expect(cover).toEqual({
      kind: "cover",
      id: "cover",
      heading: "ひとことで言うと",
      title: body.title,
      oneLiner: body.oneLiner,
    });
  });

  it("項目の出典 id を資料名・ページ・リンクに置き換える", () => {
    const slides = buildExplainerSlides(body, sources);
    const merits = slides.find((s) => s.id === "merits");
    if (merits?.kind !== "items") throw new Error("merits slide missing");
    expect(merits.items[0]?.sources).toEqual([
      {
        id: "overview",
        title: "令和8年第3回区議会定例会提出案件概要",
        kindLabel: "提出案件概要（PDF）",
        pagesLabel: "3ページ",
        pageUrl: "https://www.city.shinjuku.lg.jp/kusei/proposal.html",
      },
      {
        id: "full-text",
        title: "第90号議案（本文）",
        kindLabel: "議案の本文（PDF）",
        pagesLabel: "2ページ",
        pageUrl: "https://www.city.shinjuku.lg.jp/kusei/proposal.html",
      },
    ]);
    expect(merits.items[0]?.evidence).toEqual(["照明をＬＥＤに改修する"]);
  });

  it("主な数字は、項目名と値を持つ", () => {
    const slides = buildExplainerSlides(body, sources);
    const facts = slides.find((s) => s.id === "keyFacts");
    if (facts?.kind !== "facts") throw new Error("facts slide missing");
    expect(facts.facts[0]).toMatchObject({
      label: "契約金額",
      text: "2億2,990万円",
    });
  });

  it("論点が無いときは、その旨の文を出す", () => {
    const slides = buildExplainerSlides({ ...body, concerns: [] }, sources);
    const concerns = slides.find((s) => s.id === "concerns");
    if (concerns?.kind !== "items") throw new Error("concerns slide missing");
    expect(concerns.items).toEqual([]);
    expect(concerns.emptyMessage).toBe(CONCERNS_EMPTY_MESSAGE);
  });

  it("論点があれば emptyMessage は null", () => {
    const slides = buildExplainerSlides(body, sources);
    const concerns = slides.find((s) => s.id === "concerns");
    if (concerns?.kind !== "items") throw new Error("concerns slide missing");
    expect(concerns.emptyMessage).toBeNull();
  });

  it("最後のスライドに、資料に無いことと出典の一覧を入れる", () => {
    const slides = buildExplainerSlides(body, sources);
    const last = slides[slides.length - 1];
    if (last?.kind !== "notes") throw new Error("notes slide missing");
    expect(last.notes).toEqual(body.notInMaterials);
    expect(last.sources.map((s) => s.id)).toEqual(["overview", "full-text"]);
  });

  it("sources に無い出典 id と重複は無視する", () => {
    const slides = buildExplainerSlides(
      {
        ...body,
        purpose: {
          ...body.purpose,
          sourceRefs: ["overview", "overview", "missing"],
        },
      },
      sources
    );
    const purpose = slides.find((s) => s.id === "purpose");
    if (purpose?.kind !== "items") throw new Error("purpose slide missing");
    expect(purpose.items[0]?.sources.map((s) => s.id)).toEqual(["overview"]);
  });
});
