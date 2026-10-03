/**
 * 新宿区議会「議員名簿」ページのパーサー
 * https://www.city.shinjuku.lg.jp/kusei/gikai01_000112.html
 *
 * 読むのは、議席番号・氏名・ふりがな・当選期数・所属会派・任期だけ。
 * 住所・電話・メール・ホームページ・顔写真はページにあっても読まない（保存しない）。
 */
import { cleanFactionName, cleanMemberName } from "./normalize-member-name";
import { mainContentLines, parseReiwaDate } from "./page-content";

export type ListedMember = {
  seatNumber: number;
  name: string;
  nameKana: string | null;
  electedCount: number | null;
  factionName: string;
};

export type MemberList = {
  /** 第◯期 */
  termNumber: number | null;
  termStart: string | null;
  termEnd: string | null;
  /** 一般選挙の日 */
  electionDate: string | null;
  members: ListedMember[];
};

// 「No.1 木もと ひろゆき（きもと ひろゆき） 3期」
const MEMBER_LINE = /^No\.?\s*(\d+)\s+(.+?)\s*(?:[（(]([^（()）]+)[）)])?\s*(?:(\d+)\s*期)?$/;

export function parseMemberList(html: string): MemberList {
  const lines = mainContentLines(html);

  const termLine = lines.find((l) => /第\s*\d+\s*期任期/.test(l));
  const termMatch = termLine?.match(/第\s*(\d+)\s*期任期[:：]\s*(.+?)[～〜~](.+?)[）)]?$/);
  const electionLine = lines.find((l) => /議員選挙/.test(l));

  const members: ListedMember[] = [];
  for (const [i, line] of lines.entries()) {
    const m = line.match(MEMBER_LINE);
    if (!m) continue;
    const [, seat, rawName, kana, count] = m;
    if (/欠員/.test(rawName)) continue;
    const factionLine = lines[i + 1];
    if (!factionLine || MEMBER_LINE.test(factionLine)) {
      throw new Error(`議席番号 ${seat} の所属会派が読めません`);
    }
    members.push({
      seatNumber: Number(seat),
      name: cleanMemberName(rawName),
      nameKana: kana ? kana.trim() : null,
      electedCount: count ? Number(count) : null,
      factionName: cleanFactionName(factionLine),
    });
  }
  if (members.length === 0) throw new Error("議員名簿の行（No.1 氏名（ふりがな） n期）が見つかりません");

  return {
    termNumber: termMatch ? Number(termMatch[1]) : null,
    termStart: termMatch ? parseReiwaDate(termMatch[2]) : null,
    termEnd: termMatch ? parseReiwaDate(termMatch[3]) : null,
    electionDate: electionLine ? parseReiwaDate(electionLine) : null,
    members,
  };
}
