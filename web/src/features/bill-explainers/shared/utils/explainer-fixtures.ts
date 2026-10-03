import type { BillExplainer } from "../types";

/**
 * テストと開発用プレビュー（/dev）で使う、架空の議案の解説。
 * 実在の議案・資料・事業者とは関係ない。
 */
export function sampleBillExplainer(
  overrides: Partial<BillExplainer> = {}
): BillExplainer {
  return {
    billId: "00000000-0000-4000-8000-000000000090",
    version: 1,
    reviewedAt: "2026-10-05T10:00:00+09:00",
    reviewedBy: "ai-crosscheck",
    generatedBy: "claude-opus-5-5",
    firstPublishedAt: "2026-10-05T10:00:00+09:00",
    updatedAt: "2026-10-05T10:00:00+09:00",
    sourcePath: "explainers/r8-teirei-3/r8-teirei-3-gian-90.json",
    isDraft: false,
    sources: [
      {
        id: "overview",
        kind: "overview_pdf",
        title: "令和8年第3回区議会定例会提出案件概要",
        pageUrl: "https://www.city.shinjuku.lg.jp/kusei/proposal.html",
        pages: [3],
        materialKey: "overview",
      },
      {
        id: "full-text",
        kind: "full_text_pdf",
        title: "第90号議案（本文）",
        pageUrl: "https://www.city.shinjuku.lg.jp/kusei/proposal.html",
        pages: [2],
        materialKey: "full-text",
      },
    ],
    body: {
      title: "区の施設の照明をLEDにする工事の契約",
      oneLiner: "区立施設の照明をLEDに替える工事を、2億2,990万円で発注します。",
      purpose: {
        text: "区立施設の照明をLEDに改修するための契約を結びます。",
        sourceRefs: ["overview"],
        evidence: ["区立施設の照明をＬＥＤに改修するため"],
      },
      background: [
        {
          text: "区は照明を改修する必要があると説明しています。",
          sourceRefs: ["full-text"],
          evidence: ["照明を改修する必要があるため"],
        },
      ],
      merits: [
        {
          text: "工事が終わると、施設の照明がLEDになります。",
          sourceRefs: ["overview", "full-text"],
          evidence: ["照明をＬＥＤに改修する"],
        },
      ],
      concerns: [
        {
          text: "契約期間は令和15年2月28日までと長く、その間の費用の内訳は資料にありません。",
          sourceRefs: ["overview"],
          evidence: ["令和15年2月28日まで"],
        },
      ],
      keyFacts: [
        {
          label: "契約金額",
          value: "2億2,990万円",
          sourceRefs: ["overview"],
          evidence: ["契約金額 2億2,990万円"],
        },
        {
          label: "契約期間",
          value: "契約の翌日から令和15年2月28日まで",
          sourceRefs: ["overview"],
          evidence: ["令和15年2月28日まで"],
        },
      ],
      notInMaterials: [
        "省エネの効果（電気代がいくら減るか）は資料に書かれていません。",
      ],
    },
    ...overrides,
  };
}
