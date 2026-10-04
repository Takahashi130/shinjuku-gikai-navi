import type { MembershipPeriod } from "../types";

/**
 * 「今の会派の賛否・政務活動費」を、この議員に結び付けてよい期間の始まりと、
 * その日を選んだ理由。
 *
 * - term_start：今の任期の始まり（会派を移った記録が無い議員はみなここから）
 * - faction_event：区が公表している日付（会派の結成・会派名の変更・前の会派の
 *   消滅）。今の任期の中で会派を移った議員で、移った時期に当てはまるもの
 * - first_seen：区の資料で今の会派への所属を最初に確認できた日（移った議員で、
 *   当てはまる公表の日付が無いとき）
 * - none：任期も所属も分からない（区切らない）
 */
export type MembershipWindowBasis =
  | "term_start"
  | "faction_event"
  | "first_seen"
  | "none";

export type MembershipWindow = {
  /** YYYY-MM-DD。null は区切らない */
  start: string | null;
  basis: MembershipWindowBasis;
};

type MembershipLike = Pick<
  MembershipPeriod,
  "faction_id" | "first_seen_on" | "last_seen_on"
>;

/**
 * 今の任期の中で、今の会派の前に別の会派にいた記録（区の資料で確認できたもの）。
 * 前の任期だけで終わった会派（任期の始まりより前に最後に確認したもの）は含めない。
 * 選挙のあとは会派を組み直すので、前の任期の会派は「移った」とみなさない。
 */
export function findPreviousMembershipsInTerm({
  memberships,
  currentFactionId,
  termStart,
}: {
  memberships: readonly MembershipLike[];
  currentFactionId: string | null;
  termStart: string | null;
}): MembershipLike[] {
  if (!currentFactionId) return [];
  const current = latestMembershipOf(memberships, currentFactionId);
  if (!current) return [];
  return memberships.filter(
    (m) =>
      m.faction_id !== currentFactionId &&
      m.first_seen_on < current.first_seen_on &&
      (termStart === null || m.last_seen_on >= termStart)
  );
}

/**
 * 会派の賛否と政務活動費は会派のものなので、議員がその会派に入る前の分は
 * その議員のものではない（1期目の議員に当選前の会派の賛否を付けない。会派を
 * 移った議員に、移る前の会派の賛否を付けない）。
 *
 * 区は会派に入った日を公表していないので、次の順で決める。
 * 1. 今の任期の中で会派を移った記録が無い議員：今の任期の始まり。
 *    本会議で初めて質問した日などで区切ると、同じ会派に同じ期間いる議員どうしで
 *    数がそろわない（質問しない年がある議員ほど短くなる）。前の任期の分は、
 *    区の資料が全部そろっていないので含めない
 * 2. 移った記録がある議員：前の会派で最後に確認した日のあと、今の会派で最初に
 *    確認した日までの間にある、区が公表している日付（knownJoinDates。会派の
 *    結成・会派名の変更・前の会派の消滅）。いくつかあれば遅い方（確かな方）
 * 3. 2が無ければ、今の会派への所属を区の資料で最初に確認できた日
 *
 * 日付は YYYY-MM-DD の文字列で比べる。
 */
export function resolveMembershipWindow({
  memberships,
  currentFactionId,
  termStart,
  knownJoinDates = [],
}: {
  memberships: readonly MembershipLike[];
  currentFactionId: string | null;
  termStart: string | null;
  /** 今の会派に入った日になりうる、区が公表している日付（factionJoinDateCandidates） */
  knownJoinDates?: readonly string[];
}): MembershipWindow {
  const fromTerm: MembershipWindow = termStart
    ? { start: termStart, basis: "term_start" }
    : { start: null, basis: "none" };
  if (!currentFactionId) return fromTerm;

  const current = latestMembershipOf(memberships, currentFactionId);
  if (!current) return fromTerm;

  const previous = findPreviousMembershipsInTerm({
    memberships,
    currentFactionId,
    termStart,
  });
  if (previous.length === 0) {
    return termStart
      ? fromTerm
      : { start: current.first_seen_on, basis: "first_seen" };
  }

  const lastSeenInPrevious = previous
    .map((m) => m.last_seen_on)
    .sort()
    .at(-1) as string;
  const [joinedOn] = knownJoinDates
    .filter(
      (date) => date > lastSeenInPrevious && date <= current.first_seen_on
    )
    .sort()
    .reverse();
  return joinedOn
    ? { start: joinedOn, basis: "faction_event" }
    : { start: current.first_seen_on, basis: "first_seen" };
}

/** 会派の結成・消滅の日と、会派名の履歴（区の資料の注記から取り込んだもの） */
export type FactionHistory = {
  factions: readonly {
    id: string;
    formed_on: string | null;
    dissolved_on: string | null;
  }[];
  names: readonly { faction_id: string; valid_from: string | null }[];
};

/**
 * 今の会派に入った日になりうる、区が公表している日付を集める。
 * - 今の会派の結成日（例：アップデート新宿 2026-07-01）
 * - 今の会派が会派名を変えた日（合流で名前が変わることがある。例：自民・参政
 *   クラブ 2025-04-10）
 * - 前にいた会派が消滅した日（例：参政党新宿まなびとまもりの会 2025-04-10）
 */
export function factionJoinDateCandidates({
  history,
  currentFactionId,
  previousFactionIds,
}: {
  history: FactionHistory;
  currentFactionId: string;
  previousFactionIds: readonly string[];
}): string[] {
  const dates = new Set<string>();
  for (const faction of history.factions) {
    if (faction.id === currentFactionId && faction.formed_on) {
      dates.add(faction.formed_on);
    }
    if (previousFactionIds.includes(faction.id) && faction.dissolved_on) {
      dates.add(faction.dissolved_on);
    }
  }
  for (const name of history.names) {
    if (name.faction_id === currentFactionId && name.valid_from) {
      dates.add(name.valid_from);
    }
  }
  return [...dates].sort();
}

/**
 * resolveMembershipWindow と factionJoinDateCandidates をまとめて呼ぶ
 * （議員のページと一覧のカードで同じ期間にするため）。
 */
export function resolveMembershipWindowWithHistory({
  memberships,
  currentFactionId,
  termStart,
  history,
}: {
  memberships: readonly MembershipLike[];
  currentFactionId: string | null;
  termStart: string | null;
  history: FactionHistory;
}): MembershipWindow {
  const previous = findPreviousMembershipsInTerm({
    memberships,
    currentFactionId,
    termStart,
  });
  return resolveMembershipWindow({
    memberships,
    currentFactionId,
    termStart,
    knownJoinDates:
      currentFactionId && previous.length > 0
        ? factionJoinDateCandidates({
            history,
            currentFactionId,
            previousFactionIds: previous.map((m) => m.faction_id),
          })
        : [],
  });
}

function latestMembershipOf(
  memberships: readonly MembershipLike[],
  factionId: string
): MembershipLike | undefined {
  return memberships
    .filter((m) => m.faction_id === factionId)
    .sort((a, b) => b.first_seen_on.localeCompare(a.first_seen_on))[0];
}

/** 期間の始まり以降か（始まりが null なら常に true）。 */
export function isOnOrAfter(date: string, start: string | null): boolean {
  return start === null || date >= start;
}

/** 会派の所属の履歴を新しい順に並べる。 */
export function sortMembershipsNewestFirst<
  T extends Pick<MembershipPeriod, "first_seen_on" | "is_current">,
>(memberships: readonly T[]): T[] {
  return [...memberships].sort(
    (a, b) =>
      Number(b.is_current) - Number(a.is_current) ||
      b.first_seen_on.localeCompare(a.first_seen_on)
  );
}
