import type { ExplainerFileInput, MaterialFile } from "./schema";

/**
 * テスト用の材料と解説。区の資料をまねた架空の文面。
 */
export function sampleMaterial(): MaterialFile {
  return {
    schemaVersion: 1,
    sessionSlug: "r8-teirei-3",
    sessionTitle: "令和8年第3回定例会",
    sessionUrl: "https://www.city.shinjuku.lg.jp/kusei/session.html",
    billSlug: "r8-teirei-3-gian-90",
    billLabel: "第90号議案",
    billName: "テスト施設照明改修工事請負契約",
    fetchedAt: "2026-10-04T00:00:00.000Z",
    documents: [
      {
        key: "overview",
        kind: "overview_pdf",
        title: "令和8年第3回区議会定例会提出案件概要",
        pageUrl: "https://www.city.shinjuku.lg.jp/kusei/proposal.html",
        fileUrl: "https://www.city.shinjuku.lg.jp/content/000000001.pdf",
        pages: [
          {
            page: 3,
            text: [
              "第 90",
              "号議案",
              "テスト施設照明改修工事請負契約 区立施設の照明をＬＥＤに",
              "改修するため、次のとおり請負契約を締結する。",
              "２ 工 事 場 所 東京都新宿区テスト町 2 番 42 号",
              "４ 契 約 期 間 本契約締結日の翌日から令和 15 年 2 月 28 日まで",
              "６ 契 約 金 額 2 億 2,990 万円",
              "７ 契約の相手方",
              "テスト電気株式会社",
              "代表取締役 山田 太郎",
            ].join("\n"),
          },
        ],
      },
      {
        key: "full-text",
        kind: "full_text_pdf",
        title: "第90号議案 テスト施設照明改修工事請負契約",
        pageUrl: "https://www.city.shinjuku.lg.jp/kusei/proposal.html",
        fileUrl: "https://www.city.shinjuku.lg.jp/content/000000002.pdf",
        pages: [
          {
            page: 2,
            text: "（ 提 案 理 由 ）\n照 明 を 改 修 す る 必 要 が あ る た め",
          },
        ],
      },
    ],
  };
}

export function sampleExplainer(): ExplainerFileInput {
  return {
    schemaVersion: 1,
    sessionSlug: "r8-teirei-3",
    billSlug: "r8-teirei-3-gian-90",
    billLabel: "第90号議案",
    billName: "テスト施設照明改修工事請負契約",
    status: "published",
    version: 1,
    publishAt: null,
    author: {
      kind: "ai",
      model: "claude-test",
      generatedAt: "2026-10-04T00:00:00+09:00",
    },
    review: {
      reviewedBy: "ai-crosscheck",
      reviewedAt: "2026-10-04T01:00:00+09:00",
    },
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
        title: "第90号議案",
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
        evidence: ["区立施設の照明をLEDに改修するため"],
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
          sourceRefs: ["overview"],
          evidence: ["照明をLEDに改修する"],
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
          evidence: ["契約金額2億2,990万円"],
        },
        {
          label: "契約の相手方",
          value: "テスト電気株式会社",
          sourceRefs: ["overview"],
          evidence: ["テスト電気株式会社"],
        },
      ],
      notInMaterials: [
        "省エネの効果（電気代がいくら減るか）は資料に書かれていません。",
      ],
    },
  };
}
