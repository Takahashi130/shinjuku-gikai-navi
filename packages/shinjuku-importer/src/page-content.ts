/**
 * 区のサイトの HTML ページから本文だけを取り出すヘルパー
 */
import { htmlToLines, toHalfWidthDigits } from "./parse-session-page";

const CONTENT_END = "本ページに関するお問い合わせ";

/** 見出し（h1）から「本ページに関するお問い合わせ」の手前までの HTML。見つからなければ全体 */
export function extractMainHtml(html: string): string {
  const start = html.search(/<h1[\s>]/i);
  const from = start >= 0 ? start : 0;
  const end = html.indexOf(CONTENT_END, from);
  return html.slice(from, end >= 0 ? end : undefined);
}

const NAMED_ENTITIES: Record<string, string> = {
  hellip: "…",
  middot: "・",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  times: "×",
  yen: "¥",
};

/** htmlToLines が扱わない文字参照（&hellip; や &#x2026; など）を文字に戻す */
export function decodeExtraEntities(html: string): string {
  return html
    .replace(/&([a-z]+);/g, (m, name: string) => NAMED_ENTITIES[name] ?? m)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)));
}

/** HTML をタグを除いた行にする（空白をそろえ、全角数字は半角にする） */
export function htmlLines(html: string): string[] {
  return htmlToLines(decodeExtraEntities(html)).map(toHalfWidthDigits);
}

/** 本文の行 */
export function mainContentLines(html: string): string[] {
  return htmlLines(extractMainHtml(html));
}

/** 「最終更新日：2026年8月7日」を YYYY-MM-DD にする。無ければ null */
export function pageUpdatedDate(html: string): string | null {
  const text = toHalfWidthDigits(html.replace(/<[^>]+>/g, ""));
  const m = text.match(/最終更新日[:：]\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

/** 和暦（令和）を西暦に。「元」は 1 として扱う */
export function reiwaToYear(reiwa: string | number): number {
  const n = reiwa === "元" ? 1 : Number(toHalfWidthDigits(String(reiwa)));
  return 2018 + n;
}

/** 「令和5年5月1日」を YYYY-MM-DD にする。読めなければ null */
export function parseReiwaDate(text: string): string | null {
  const m = toHalfWidthDigits(text).match(/令和\s*(\d+|元)\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (!m) return null;
  return `${reiwaToYear(m[1])}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}
