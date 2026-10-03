/**
 * 「議案の概要」から、会期ごとの「提出議案」ページと、そこに載っている PDF を読む。
 *
 * 会期ページ →「議案の概要」→（一覧ページ /kusei/index_gian01.html の場合は
 * 「令和8年第3回定例会提出議案」へ）→ 提出議案ページ
 *   - 予算案（概要）：令和8年度9月補正予算概要 [PDF]（一般会計（補正第4号））
 *   - 予算案（全文）・決算認定・条例案等（全文）：第63号議案 令和8年度… [PDF]
 *   - 条例案等（概要）：令和8年第3回区議会定例会提出案件概要 [PDF]
 */
import { htmlToLines } from "./parse-session-page";

export type ProposalPdfKind = "full_text" | "overview" | "budget_overview" | "other";

export type ProposalPdfLink = {
  url: string;
  kind: ProposalPdfKind;
  /** リンクの文字（[PDF形式] などを除いたもの） */
  text: string;
  /** リンクの下の説明（例：一般会計（補正第4号）） */
  desc: string | null;
  /** 全文 PDF の議案（例：第63号議案、認定第1号） */
  label: string | null;
};

/** 区の議案一覧ページ（会期ページに「議案の概要」が無いときの予備） */
export const PROPOSAL_INDEX_URL = "https://www.city.shinjuku.lg.jp/kusei/index_gian01.html";

const BILL_LABEL = /^(第\d+号議案|議員提出議案第\d+号|(?:承認|同意|認定|諮問)第\d+号)/;

function textOf(html: string): string {
  return htmlToLines(html)
    .join(" ")
    .normalize("NFKC")
    .replace(/\[PDF形式[^\]]*\]/g, "")
    .replace(/\(新規ウィンドウ表示\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function anchors(html: string): { href: string; text: string; end: number }[] {
  const out: { href: string; text: string; end: number }[] = [];
  for (const m of html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    out.push({ href: m[1], text: textOf(m[2]), end: (m.index ?? 0) + m[0].length });
  }
  return out;
}

function compact(s: string): string {
  return s.normalize("NFKC").replace(/\s/g, "").replace(/令和元年/g, "令和1年");
}

/** 会期ページの「議案の概要」リンク（審議結果の PDF ではなく HTML ページ） */
export function findOverviewLink(sessionHtml: string, sessionUrl: string): string | null {
  const a = anchors(sessionHtml).find((x) => compact(x.text) === "議案の概要" && !/\.pdf$/i.test(x.href));
  return a ? new URL(a.href, sessionUrl).toString() : null;
}

/** 議案一覧ページから、その会期の「提出議案」ページのリンクを探す（例：令和8年第3回定例会提出議案） */
export function findProposalPageLink(indexHtml: string, indexUrl: string, sessionTitle: string): string | null {
  const want = `${compact(sessionTitle)}提出議案`;
  const a = anchors(indexHtml).find((x) => compact(x.text) === want);
  return a ? new URL(a.href, indexUrl).toString() : null;
}

function classify(text: string): { kind: ProposalPdfKind; label: string | null } {
  const label = text.replace(/\s/g, "").match(BILL_LABEL)?.[1] ?? null;
  if (label) return { kind: "full_text", label };
  if (text.includes("提出案件概要")) return { kind: "overview", label: null };
  if (text.includes("予算概要")) return { kind: "budget_overview", label: null };
  return { kind: "other", label: null };
}

/** 提出議案ページの PDF へのリンクを読む */
export function parseProposalPage(html: string, pageUrl: string): ProposalPdfLink[] {
  const links: ProposalPdfLink[] = [];
  for (const a of anchors(html)) {
    if (!/\.pdf$/i.test(a.href)) continue;
    const descMatch = html.slice(a.end).match(/^\s*<div class="desc">([\s\S]*?)<\/div>/);
    const desc = descMatch ? textOf(descMatch[1]) || null : null;
    const url = new URL(a.href, pageUrl).toString();
    if (links.some((l) => l.url === url)) continue;
    links.push({ url, text: a.text, desc, ...classify(a.text) });
  }
  return links;
}
