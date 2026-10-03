/**
 * 議案ごとの「解説の材料」（.materials/<会期slug>/<議案slug>.json）を組み立てる。
 *
 * 材料は区の資料の文字そのものなので、リポジトリにも DB にも入れない。
 * 解説を書く AI と、解説を資料と照合する検査（explainers:check）だけが読む。
 */
import {
  type MaterialDocument,
  type MaterialFile,
  MATERIAL_SCHEMA_VERSION,
} from "@mirai-gikai/shared/bill-explainer/schema";
import { normalizeMaterialText } from "@mirai-gikai/shared/bill-explainer/normalize-material-text";
import { billSlug, isPollTarget, sessionSlug } from "./build-content";
import type { SessionBill, SessionPage } from "./parse-session-page";
import type { ProposalPdfLink } from "./parse-proposal-page";
import { type PdfPageText, splitPagesByBill } from "./split-overview";

export type FetchedPdf = { link: ProposalPdfLink; pages: PdfPageText[] };

export type MissingMaterial = { bill: SessionBill; slug: string; reason: string };

function withSuffix(key: string, n: number): string {
  return n === 0 ? key : `${key}-${n + 1}`;
}

function pdfTitle(link: ProposalPdfLink): string {
  return link.desc ? `${link.text}（${link.desc}）` : link.text;
}

export function buildMaterialFiles(input: {
  session: SessionPage;
  sessionUrl: string;
  /** 会期ページの「会期と日程」の行 */
  scheduleLines: string[];
  /** PDF が載っている提出議案ページ */
  proposalPageUrl: string;
  pdfs: FetchedPdf[];
  fetchedAt: string;
}): { files: MaterialFile[]; missing: MissingMaterial[] } {
  const { session, sessionUrl, scheduleLines, proposalPageUrl, pdfs, fetchedAt } = input;
  const splitByKind = (kind: "overview" | "budget_overview") =>
    pdfs.filter((p) => p.link.kind === kind).map((p) => ({ link: p.link, byBill: splitPagesByBill(p.pages) }));
  const overviews = splitByKind("overview");
  const budgetOverviews = splitByKind("budget_overview");

  const files: MaterialFile[] = [];
  const missing: MissingMaterial[] = [];
  for (const bill of session.bills) {
    const slug = billSlug(session, bill);
    if (!isPollTarget(bill)) {
      missing.push({ bill, slug, reason: "人事案件（同意・諮問・候補者の推薦）は解説の対象外" });
      continue;
    }
    const docs: MaterialDocument[] = [];
    const pdfDoc = (key: string, kind: MaterialDocument["kind"], link: ProposalPdfLink, pages: PdfPageText[]) => {
      const kept = pages
        .map((p) => ({ page: p.page, text: normalizeMaterialText(p.text) }))
        .filter((p) => p.text.length > 0);
      if (kept.length === 0) return;
      docs.push({ key, kind, title: pdfTitle(link), pageUrl: proposalPageUrl, fileUrl: link.url, pages: kept });
    };

    pdfs
      .filter((p) => p.link.kind === "full_text" && p.link.label === bill.label)
      .forEach((p, i) => pdfDoc(withSuffix("full-text", i), "full_text_pdf", p.link, p.pages));
    overviews
      .filter((o) => o.byBill.has(bill.label))
      .forEach((o, i) => pdfDoc(withSuffix("overview", i), "overview_pdf", o.link, o.byBill.get(bill.label)!));
    budgetOverviews
      .filter((o) => o.byBill.has(bill.label))
      .forEach((o, i) =>
        pdfDoc(withSuffix("budget-overview", i), "budget_overview_pdf", o.link, o.byBill.get(bill.label)!)
      );

    if (docs.length === 0) {
      missing.push({
        bill,
        slug,
        reason:
          bill.kind === "member"
            ? "議員提出議案は区の提出議案ページに資料が無い"
            : "提出議案ページに、この議案の資料が見つからない",
      });
      continue;
    }

    docs.unshift({
      key: "session-page",
      kind: "session_page",
      title: `新宿区議会「${session.title}」`,
      pageUrl: sessionUrl,
      fileUrl: null,
      pages: [{ page: null, text: [...scheduleLines, "議案", `${bill.label} ${bill.name}`].join("\n") }],
    });
    files.push({
      schemaVersion: MATERIAL_SCHEMA_VERSION,
      sessionSlug: sessionSlug(session),
      sessionTitle: session.title,
      sessionUrl,
      billSlug: slug,
      billLabel: bill.label,
      billName: bill.name,
      fetchedAt,
      documents: docs,
    });
  }
  return { files, missing };
}
