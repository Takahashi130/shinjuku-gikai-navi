import { describe, expect, it } from "vitest";
import {
  buildExplainerAttribution,
  EXPLAINER_CORRECTION,
  EXPLAINER_CORRECTION_URL,
  explainerSourceFileUrl,
} from "./explainer-attribution";

describe("buildExplainerAttribution", () => {
  it("AI の照合なら「別のAIが資料と照合しました」と出す", () => {
    expect(
      buildExplainerAttribution({ reviewedBy: "ai-crosscheck", isDraft: false })
    ).toEqual({
      badge: "AI作成・照合済み",
      text: "AI（Claude）が新宿区の公開資料をもとに作成し、別のAIが資料と照合しました。",
    });
  });

  it("人の確認なら運営者が照合したと出す", () => {
    expect(
      buildExplainerAttribution({ reviewedBy: "operator", isDraft: false }).text
    ).toContain("運営者が資料と照合しました");
  });

  it("下書きや照合前は、公開前であることを出す", () => {
    expect(
      buildExplainerAttribution({ reviewedBy: "ai-crosscheck", isDraft: true })
        .badge
    ).toBe("下書き・公開前");
    expect(
      buildExplainerAttribution({ reviewedBy: null, isDraft: false }).badge
    ).toBe("下書き・公開前");
  });
});

describe("explainerSourceFileUrl", () => {
  it("explainers/ の JSON なら公開リポジトリの URL にする", () => {
    expect(
      explainerSourceFileUrl("explainers/r8-teirei-3/r8-teirei-3-gian-63.json")
    ).toBe(
      "https://github.com/Takahashi130/shinjuku-gikai-navi/blob/develop/explainers/r8-teirei-3/r8-teirei-3-gian-63.json"
    );
  });

  it("想定外のパスや空なら null", () => {
    expect(explainerSourceFileUrl(null)).toBeNull();
    expect(explainerSourceFileUrl("../secret.json")).toBeNull();
    expect(explainerSourceFileUrl("explainers/a.txt")).toBeNull();
  });
});

describe("EXPLAINER_CORRECTION", () => {
  it("公開リポジトリの Issue を指す", () => {
    expect(EXPLAINER_CORRECTION_URL).toBe(
      "https://github.com/Takahashi130/shinjuku-gikai-navi/issues"
    );
    expect(EXPLAINER_CORRECTION.url).toBe(EXPLAINER_CORRECTION_URL);
  });

  it("「誤りがあれば」で始まる1文になる", () => {
    const { before, linkText, after } = EXPLAINER_CORRECTION;
    expect(`${before}${linkText}${after}`).toBe(
      "誤りがあれば、GitHub の Issue でお知らせください。"
    );
  });
});
