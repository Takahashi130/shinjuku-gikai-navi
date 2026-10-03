/**
 * 議員の並び順。議席番号順と五十音順だけを用意する。
 *
 * 質問の回数などの多い順（ランキング）は出さない。2027年4月ごろに区議選が
 * あるため、全員を同じ形で見せ、数で順位を付けない（設計書 5. リスク）。
 */
export const MEMBER_SORT_ORDERS = ["seat", "kana"] as const;
export type MemberSortOrder = (typeof MEMBER_SORT_ORDERS)[number];

export const MEMBER_SORT_LABELS: Record<MemberSortOrder, string> = {
  seat: "議席番号順",
  kana: "五十音順",
};

export function isMemberSortOrder(value: unknown): value is MemberSortOrder {
  return (
    typeof value === "string" &&
    (MEMBER_SORT_ORDERS as readonly string[]).includes(value)
  );
}

type SortableMember = {
  name: string;
  nameKana: string | null;
  seatNumber: number | null;
};

const collator = new Intl.Collator("ja");

/** よみ（無ければ表示名）。空白は1つにそろえ、姓の区切りとして残す。 */
function readingOf(member: SortableMember): string {
  return (member.nameKana || member.name).replace(/[\s　]+/g, " ").trim();
}

function compareByKana(a: SortableMember, b: SortableMember): number {
  return collator.compare(readingOf(a), readingOf(b));
}

/** 議席番号の無い議員は最後に回す。 */
function compareBySeat(a: SortableMember, b: SortableMember): number {
  if (a.seatNumber === b.seatNumber) return 0;
  if (a.seatNumber === null) return 1;
  if (b.seatNumber === null) return -1;
  return a.seatNumber - b.seatNumber;
}

/**
 * 議員を並べ替えた新しい配列を返す（元の配列は変えない）。
 *
 * - seat: 議席番号の小さい順。同じ（または無い）ときは五十音順
 * - kana: よみの五十音順。同じときは議席番号順
 */
export function sortMembers<T extends SortableMember>(
  members: readonly T[],
  order: MemberSortOrder
): T[] {
  const [primary, secondary] =
    order === "seat"
      ? [compareBySeat, compareByKana]
      : [compareByKana, compareBySeat];
  return [...members].sort((a, b) => primary(a, b) || secondary(a, b));
}
