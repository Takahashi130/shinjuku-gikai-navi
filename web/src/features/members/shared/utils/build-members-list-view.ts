import type { FactionSummary, MemberListItem } from "../types";
import type { MembersListParams } from "./members-list-params";
import { sortMembers } from "./sort-members";

/** 会派ごとの人数の1行。 */
export type FactionCompositionRow = {
  faction: FactionSummary;
  count: number;
  /** 全体に占める割合（0〜100）。帯の長さに使う */
  percent: number;
};

export type FactionComposition = {
  total: number;
  /** 会派構成ページの並び（sort_order）。人数が0の会派は除く */
  rows: FactionCompositionRow[];
  /** 会派に属していない（または会派が分からない）議員の数 */
  unaffiliatedCount: number;
};

/**
 * 会派ごとの人数を、今の議員名簿から数える。
 *
 * 会派構成ページの人数（factions.member_count）ではなく、名簿の所属会派から
 * 数える。一覧のカードの数と必ず一致させるため。並びは区の会派構成ページの順
 * （人数の多い順になっていることが多いが、こちらで並べ替えはしない）。
 */
export function summarizeFactionComposition(
  members: readonly Pick<MemberListItem, "factionId">[],
  factions: readonly FactionSummary[]
): FactionComposition {
  const counts = new Map<string, number>();
  for (const member of members) {
    if (!member.factionId) continue;
    counts.set(member.factionId, (counts.get(member.factionId) ?? 0) + 1);
  }

  const total = members.length;
  const rows = [...factions]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((faction) => {
      const count = counts.get(faction.id) ?? 0;
      return {
        faction,
        count,
        percent: total === 0 ? 0 : Math.round((count / total) * 1000) / 10,
      };
    })
    .filter((row) => row.count > 0);

  const counted = rows.reduce((sum, row) => sum + row.count, 0);
  return { total, rows, unaffiliatedCount: total - counted };
}

export type MembersListView = {
  composition: FactionComposition;
  /** 絞り込み中の会派。URL の slug が知らない会派なら null（すべてを出す） */
  selectedFaction: FactionSummary | null;
  /** 絞り込み・並べ替えの済んだ議員 */
  members: MemberListItem[];
};

/** 一覧ページに出すものをまとめて作る。 */
export function buildMembersListView(
  members: readonly MemberListItem[],
  factions: readonly FactionSummary[],
  params: MembersListParams
): MembersListView {
  const selectedFaction =
    factions.find((faction) => faction.slug === params.faction) ?? null;
  const filtered = selectedFaction
    ? members.filter((member) => member.factionId === selectedFaction.id)
    : members;

  return {
    composition: summarizeFactionComposition(members, factions),
    selectedFaction,
    members: sortMembers(filtered, params.sort),
  };
}
