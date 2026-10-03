import type {
  ExplainerFileInput,
  MaterialFile,
} from "@mirai-gikai/shared/bill-explainer/schema";

/** テスト用の材料と解説（架空の文面） */
export function material(): MaterialFile {
  return {
    schemaVersion: 1,
    sessionSlug: "r8-teirei-3",
    sessionTitle: "令和8年第3回定例会",
    sessionUrl: "https://www.city.shinjuku.lg.jp/kusei/session.html",
    billSlug: "r8-teirei-3-gian-90",
    billLabel: "第90号議案",
    billName: "テスト条例の一部を改正する条例",
    fetchedAt: "2026-10-04T00:00:00.000Z",
    documents: [
      {
        key: "overview",
        kind: "overview_pdf",
        title: "提出案件概要",
        pageUrl: "https://www.city.shinjuku.lg.jp/kusei/proposal.html",
        fileUrl: "https://www.city.shinjuku.lg.jp/content/000000001.pdf",
        pages: [
          {
            page: 1,
            text: "第90号議案\nテスト法の改正に伴い、引用条項を改める。\n［施行日］\n令和 8 年 12 月 1 日",
          },
        ],
      },
    ],
  };
}

export function explainer(): ExplainerFileInput {
  const item = (text: string, evidence: string) => ({
    text,
    sourceRefs: ["overview"],
    evidence: [evidence],
  });
  return {
    schemaVersion: 1,
    sessionSlug: "r8-teirei-3",
    billSlug: "r8-teirei-3-gian-90",
    billLabel: "第90号議案",
    billName: "テスト条例の一部を改正する条例",
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
        title: "提出案件概要",
        pageUrl: "https://www.city.shinjuku.lg.jp/kusei/proposal.html",
        pages: [1],
        materialKey: "overview",
      },
    ],
    body: {
      title: "法律の改正に合わせて条例の引用を直す",
      oneLiner: "法律の条の番号が変わるので、条例の中の引用を直します。",
      purpose: item("条例が引用している条項を改めます。", "引用条項を改める"),
      background: [item("テスト法が改正されました。", "テスト法の改正に伴い")],
      merits: [item("条例と法律の対応が正しくなります。", "引用条項を改める")],
      concerns: [],
      keyFacts: [
        {
          label: "施行日",
          value: "令和8年12月1日",
          sourceRefs: ["overview"],
          evidence: ["令和 8 年 12 月 1 日"],
        },
      ],
      notInMaterials: [
        "区民の手続きが変わるかどうかは資料に書かれていません。",
      ],
    },
  };
}
