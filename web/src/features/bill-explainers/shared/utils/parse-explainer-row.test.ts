import { describe, expect, it } from "vitest";
import { sampleBillExplainer } from "./explainer-fixtures";
import {
  type BillExplainerRow,
  parseExplainerRow,
} from "./parse-explainer-row";

function row(overrides: Partial<BillExplainerRow> = {}): BillExplainerRow {
  const sample = sampleBillExplainer();
  return {
    bill_id: sample.billId,
    status: "published",
    body: sample.body,
    sources: sample.sources,
    version: 2,
    reviewed_at: "2026-10-05T01:00:00+00:00",
    reviewed_by: "ai-crosscheck",
    generated_by: "claude-opus-5-5",
    publish_at: null,
    first_published_at: "2026-10-05T01:00:00+00:00",
    updated_at: "2026-10-06T01:00:00+00:00",
    source_path: "explainers/r8-teirei-3/r8-teirei-3-gian-90.json",
    ...overrides,
  };
}

describe("parseExplainerRow", () => {
  it("正しい行を画面用の形にする", () => {
    const parsed = parseExplainerRow(row(), { isDraft: false });
    expect(parsed).toMatchObject({
      version: 2,
      reviewedBy: "ai-crosscheck",
      sourcePath: "explainers/r8-teirei-3/r8-teirei-3-gian-90.json",
      isDraft: false,
    });
    expect(parsed?.body.title).toBe("区の施設の照明をLEDにする工事の契約");
    expect(parsed?.sources).toHaveLength(2);
  });

  it("下書きの印を引き継ぐ", () => {
    expect(parseExplainerRow(row(), { isDraft: true })?.isDraft).toBe(true);
  });

  it("本文の形が壊れていれば null", () => {
    expect(
      parseExplainerRow(row({ body: { title: "だけ" } }), { isDraft: false })
    ).toBeNull();
    expect(
      parseExplainerRow(row({ body: null }), { isDraft: false })
    ).toBeNull();
  });

  it("出典が空・壊れていれば null", () => {
    expect(
      parseExplainerRow(row({ sources: [] }), { isDraft: false })
    ).toBeNull();
    expect(
      parseExplainerRow(row({ sources: [{ id: "x" }] }), { isDraft: false })
    ).toBeNull();
  });

  it("出典のリンクが区のサイト以外なら null", () => {
    const sample = sampleBillExplainer();
    expect(
      parseExplainerRow(
        row({
          sources: sample.sources.map((s) => ({
            ...s,
            pageUrl: "https://example.com/page.html",
          })),
        }),
        { isDraft: false }
      )
    ).toBeNull();
  });

  it("本文が sources に無い出典を指していれば null", () => {
    const sample = sampleBillExplainer();
    expect(
      parseExplainerRow(
        row({
          body: {
            ...sample.body,
            purpose: { ...sample.body.purpose, sourceRefs: ["missing"] },
          },
        }),
        { isDraft: false }
      )
    ).toBeNull();
  });
});
