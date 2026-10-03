import { materialFileSchema } from "@mirai-gikai/shared/bill-explainer/schema";
import { describe, expect, it } from "vitest";
import { buildMaterialFiles } from "./map-materials";
import type { SessionPage } from "./parse-session-page";
import type { ProposalPdfLink } from "./parse-proposal-page";

const session: SessionPage = {
  title: "令和8年第3回定例会",
  reiwaYear: 8,
  ordinal: 3,
  type: "regular",
  startDate: "2026-09-16",
  endDate: "2026-10-15",
  finalVoteAt: "2026-10-15T14:00:00+09:00",
  finalVoteTimeInferred: false,
  earlyVoteAt: null,
  bills: [
    { kind: "mayor", number: 63, label: "第63号議案", name: "一般会計補正予算(第4号)" },
    { kind: "mayor", number: 67, label: "第67号議案", name: "条例の一部を改正する条例" },
    { kind: "consent", number: 1, label: "同意第1号", name: "教育委員会委員任命の同意について" },
    { kind: "member", number: 11, label: "議員提出議案第11号", name: "議員の条例" },
  ],
  resultsPdfUrl: null,
};

const link = (over: Partial<ProposalPdfLink>): ProposalPdfLink => ({
  url: "https://www.city.shinjuku.lg.jp/content/1.pdf",
  kind: "other",
  text: "",
  desc: null,
  label: null,
  ...over,
});

describe("buildMaterialFiles", () => {
  const { files, missing } = buildMaterialFiles({
    session,
    sessionUrl: "https://www.city.shinjuku.lg.jp/kusei/session.html",
    scheduleLines: ["会期", "令和8年9月16日（水曜日）から10月15日（木曜日）まで"],
    proposalPageUrl: "https://www.city.shinjuku.lg.jp/kusei/proposal.html",
    pdfs: [
      {
        link: link({ kind: "full_text", label: "第63号議案", text: "第63号議案 補正予算", url: "https://www.city.shinjuku.lg.jp/content/63.pdf" }),
        pages: [
          { page: 1, text: "第 ６ ３ 号 議 案" },
          { page: 2, text: "歳 入 歳 出 そ れ ぞ れ 514,734 千 円 を 追 加" },
        ],
      },
      {
        link: link({ kind: "budget_overview", text: "9月補正予算概要", desc: "一般会計（補正第4号）" }),
        pages: [{ page: 1, text: "第63号議案 令和8年9月\n備蓄物資の充実" }],
      },
      {
        link: link({ kind: "overview", text: "提出案件概要" }),
        pages: [{ page: 1, text: "第 67\n号議案\n引用条項を改める。" }],
      },
    ],
    fetchedAt: "2026-10-04T00:00:00.000Z",
  });

  it("資料のある議案ごとに材料を作り、スキーマに合う", () => {
    expect(files.map((f) => f.billSlug)).toEqual(["r8-teirei-3-gian-63", "r8-teirei-3-gian-67"]);
    for (const f of files) expect(materialFileSchema.safeParse(f).success).toBe(true);
  });

  it("会期の日程・全文・補正予算概要を、議案ごとの文書として持つ", () => {
    const gian63 = files[0];
    expect(gian63.documents.map((d) => [d.key, d.kind])).toEqual([
      ["session-page", "session_page"],
      ["full-text", "full_text_pdf"],
      ["budget-overview", "budget_overview_pdf"],
    ]);
    expect(gian63.documents[0].pages[0].text).toContain("第63号議案 一般会計補正予算(第4号)");
    expect(gian63.documents[1].pages).toEqual([
      { page: 1, text: "第63号議案" },
      { page: 2, text: "歳入歳出それぞれ514,734千円を追加" },
    ]);
    expect(gian63.documents[2].title).toBe("9月補正予算概要（一般会計（補正第4号））");
  });

  it("提出案件概要から、その議案の部分だけを持つ", () => {
    expect(files[1].documents.map((d) => d.key)).toEqual(["session-page", "overview"]);
    expect(files[1].documents[1].pages[0].text).toBe("第67号議案\n引用条項を改める。");
  });

  it("人事案件と、資料の無い議員提出議案は理由つきで除く", () => {
    expect(missing.map((m) => [m.slug, m.reason])).toEqual([
      ["r8-teirei-3-doi-1", "人事案件（同意・諮問・候補者の推薦）は解説の対象外"],
      ["r8-teirei-3-giin-11", "議員提出議案は区の提出議案ページに資料が無い"],
    ]);
  });
});
