/**
 * 議案への会派ごとの賛否（bill_faction_votes）を作って書き込む
 *
 * 審議結果 PDF の表の見出し（会派の略称）・凡例（正式名称）・賛否の記号・注記（「1人反対」など）を
 * そのまま行にする。会派の id は名前の履歴から引けたときだけ入れる。
 */
import { type Db, getFactionResolver } from "./faction-store";
import { cleanFactionName } from "./normalize-member-name";
import type { Faction, ResultRow, Vote } from "./parse-results-pdf";

export type FactionVoteInput = {
  factionAbbr: string;
  factionName: string;
  vote: Vote;
  note: string | null;
  sortOrder: number;
};

/** PDF の1行（議案）から、会派ごとの賛否の行を作る。略称が重なった場合は最初の列を使う */
export function buildFactionVotes(result: ResultRow, factions: Faction[]): FactionVoteInput[] {
  const seen = new Set<string>();
  const rows: FactionVoteInput[] = [];
  for (const f of factions) {
    if (!f.abbr || seen.has(f.abbr)) continue;
    seen.add(f.abbr);
    rows.push({
      factionAbbr: f.abbr,
      factionName: cleanFactionName(f.name),
      vote: result.votes[f.abbr] ?? "unknown",
      note: result.voteNotes[f.abbr]?.trim() || null,
      sortOrder: rows.length,
    });
  }
  return rows;
}

/**
 * 議案の会派ごとの賛否を消してから入れ直す。
 * @returns 会派を引けなかった名前
 */
export async function replaceBillFactionVotes(db: Db, billId: string, votes: FactionVoteInput[]): Promise<string[]> {
  const resolve = await getFactionResolver(db);
  const unresolved: string[] = [];
  const rows = votes.map((v) => {
    const factionId = resolve(v.factionName);
    if (!factionId) unresolved.push(v.factionName);
    return {
      bill_id: billId,
      faction_abbr: v.factionAbbr,
      faction_name: v.factionName,
      faction_id: factionId,
      vote: v.vote,
      note: v.note,
      sort_order: v.sortOrder,
    };
  });
  const { error: deleteError } = await db.from("bill_faction_votes").delete().eq("bill_id", billId);
  if (deleteError) throw deleteError;
  if (rows.length > 0) {
    const { error } = await db.from("bill_faction_votes").insert(rows);
    if (error) throw error;
  }
  return unresolved;
}
