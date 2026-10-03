/**
 * 新宿区議会「会派構成」ページのパーサー
 * https://www.city.shinjuku.lg.jp/kusei/file08_00003.html
 *
 * 会派ごとに「会派名（n人）」の見出しと、所属議員の表がある。
 * 表のセルに「[幹事長]」のような役職が書かれている議員だけ役職を記録する
 * （役職の書かれていないセルに前の役職が続くのかはページから判断できないため、推測しない）。
 */
import { cleanFactionName, cleanMemberName } from "./normalize-member-name";
import { extractMainHtml, htmlLines } from "./page-content";

export type FactionPageMember = { name: string; role: string | null };

export type FactionPageEntry = {
  name: string;
  memberCount: number;
  members: FactionPageMember[];
  /** 「※令和8年7月1日付けで…」などの注記 */
  notes: string[];
};

const HEADING = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;

export function parseFactionPage(html: string): FactionPageEntry[] {
  const main = extractMainHtml(html);
  const headings = [...main.matchAll(HEADING)];
  const entries: FactionPageEntry[] = [];
  for (const [k, h] of headings.entries()) {
    const title = htmlLines(h[1]).join("");
    const m = title.match(/^(.+?)\s*[（(](\d+)\s*人[）)]$/);
    if (!m) continue;
    const sectionStart = (h.index ?? 0) + h[0].length;
    const sectionEnd = k + 1 < headings.length ? headings[k + 1].index : main.length;
    const section = main.slice(sectionStart, sectionEnd);

    const members: FactionPageMember[] = [];
    for (const cell of section.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)) {
      const cellLines = htmlLines(cell[1]);
      let role: string | null = null;
      for (const line of cellLines) {
        const r = line.match(/^\[(.+)\]$/);
        if (r) role = r[1].trim();
        else members.push({ name: cleanMemberName(line), role });
      }
    }
    const notes = htmlLines(section.replace(/<table[\s\S]*?<\/table>/gi, "")).filter((l) => l.startsWith("※"));
    entries.push({ name: cleanFactionName(m[1]), memberCount: Number(m[2]), members, notes });
  }
  if (entries.length === 0) throw new Error("会派の見出し（会派名（n人））が見つかりません");
  return entries;
}
