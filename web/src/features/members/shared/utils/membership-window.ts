import type { MembershipPeriod } from "../types";

/**
 * 「今の会派の賛否・政務活動費」を、この議員に結び付けてよい期間の始まり。
 *
 * 会派の賛否と政務活動費は会派のものなので、議員がその会派に入る前の分は
 * その議員のものではない（1期目の議員に、当選前の会派の賛否を付けない。
 * 会派を移った議員に、移る前の会派の賛否を付けない）。
 *
 * 区は会派に入った日を公表していないので、区の資料で確かめられる日を使う。
 * - 前に別の会派にいたことが資料で分かる議員：今の会派への所属を資料で最初に
 *   確認できた日（first_seen_on）。移った正確な日は分からないので、確かな方に倒す
 * - 会派を移った記録の無い議員：今の任期の始まりと、資料で最初に確認できた日の
 *   早い方（1期目の議員は任期の始まりから、続けて議員の人は令和元年の記録から）
 * - 所属の記録が無いとき：任期の始まり（任期も分からなければ null＝区切らない）
 *
 * 日付は YYYY-MM-DD の文字列で比べる。
 */
export function resolveMembershipWindowStart({
  memberships,
  currentFactionId,
  termStart,
}: {
  memberships: readonly Pick<
    MembershipPeriod,
    "faction_id" | "first_seen_on" | "last_seen_on"
  >[];
  currentFactionId: string | null;
  termStart: string | null;
}): string | null {
  if (!currentFactionId) return termStart;

  const current = memberships
    .filter((m) => m.faction_id === currentFactionId)
    .sort((a, b) => b.first_seen_on.localeCompare(a.first_seen_on))[0];
  if (!current) return termStart;

  const movedFromAnother = memberships.some(
    (m) =>
      m.faction_id !== currentFactionId &&
      m.first_seen_on < current.first_seen_on
  );
  if (movedFromAnother) return current.first_seen_on;

  if (!termStart) return current.first_seen_on;
  return current.first_seen_on < termStart ? current.first_seen_on : termStart;
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
