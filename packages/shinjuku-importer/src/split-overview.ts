/**
 * 「提出案件概要」「補正予算概要」の PDF を議案ごとに分ける。
 *
 * どちらの PDF も、議案ごとの見出し（「第 67 / 号議案」「第63号議案 令和8年9月」）で始まり、
 * 次の見出しまでがその議案の内容になる。ページをまたぐ場合は前のページの議案の続きとする。
 */
import { normalizeMaterialText } from "@mirai-gikai/shared/bill-explainer/normalize-material-text";

export type PdfPageText = { page: number; text: string };

const MARKER = /^(第\d+号議案|議員提出議案第\d+号|(?:承認|同意|認定|諮問)第\d+号)/;
/** 表の見出しや「（条例関係）」などの区分の見出し。どの議案にも属さない */
const NOISE = /^(議案番号件名概要等?|\([^()]*関係\))$/;

/** 1ページの文字をそろえ、2行に分かれた見出し（「第67」「号議案」）を1行にする */
export function normalizePageText(text: string): string {
  return normalizeMaterialText(text).replace(/^第(\d+)\n号議案/gm, "第$1号議案");
}

export function splitPagesByBill(pages: PdfPageText[]): Map<string, PdfPageText[]> {
  const out = new Map<string, PdfPageText[]>();
  let current: string | null = null;
  for (const { page, text } of pages) {
    const onPage = new Map<string, string[]>();
    for (const line of normalizePageText(text).split("\n")) {
      if (NOISE.test(line)) continue;
      const m = line.match(MARKER);
      if (m) current = m[1];
      if (!current) continue;
      onPage.set(current, [...(onPage.get(current) ?? []), line]);
    }
    for (const [label, lines] of onPage) {
      out.set(label, [...(out.get(label) ?? []), { page, text: lines.join("\n") }]);
    }
  }
  return out;
}
