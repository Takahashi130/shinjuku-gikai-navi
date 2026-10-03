import { describe, expect, it } from "vitest";
import { buildExplainerFooter } from "./build-explainer-footer";

const NOW = new Date("2026-10-06T00:00:00Z");

describe("buildExplainerFooter", () => {
  it("公開済みの解説は、作成・照合の表示と版・照合日を出す", () => {
    expect(
      buildExplainerFooter(
        {
          isDraft: false,
          reviewedBy: "ai-crosscheck",
          reviewedAt: "2026-10-05T01:00:00Z",
          version: 2,
          sourcePath: "explainers/r8-teirei-3/r8-teirei-3-gian-63.json",
        },
        NOW
      )
    ).toEqual({
      isDraft: false,
      badge: "AI作成・照合済み",
      attributionText:
        "AI（Claude）が新宿区の公開資料をもとに作成し、別のAIが資料と照合しました。",
      correction: {
        before: "誤りがあれば、",
        linkText: "GitHub の Issue",
        after: " でお知らせください。",
        url: "https://github.com/Takahashi130/shinjuku-gikai-navi/issues",
      },
      versionLabel: "第2版・10月5日（月）照合",
      sourceFileUrl:
        "https://github.com/Takahashi130/shinjuku-gikai-navi/blob/develop/explainers/r8-teirei-3/r8-teirei-3-gian-63.json",
    });
  });

  it("下書きは照合日を出さず、下書きと示す", () => {
    const footer = buildExplainerFooter(
      {
        isDraft: true,
        reviewedBy: null,
        reviewedAt: null,
        version: 1,
        sourcePath: null,
      },
      NOW
    );
    expect(footer.versionLabel).toBe("第1版（下書き）");
    expect(footer.badge).toBe("下書き・公開前");
    expect(footer.sourceFileUrl).toBeNull();
  });
});
