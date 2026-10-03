import type { BillListItem, BillTag } from "../types";
import {
  type BillStatusGroup,
  countByStatusGroup,
  toBillStatusGroup,
} from "./bill-status-group";
import { sortBills } from "./sort-bills";

/** トップに並べる議案の最小限の形。 */
type HomeBill = Pick<
  BillListItem,
  "id" | "status" | "submitted_date" | "updated_at" | "tags" | "is_featured"
>;

/** テーマ別のカード1枚分（見出し＋議案サムネイル4つ）。 */
export type ThemeShelf<T> = {
  theme: BillTag;
  /** そのテーマの議案の総数。 */
  count: number;
  /** カードに並べる議案（提出日が新しい順に最大 shelfSize 件）。 */
  bills: T[];
};

/** トップページに出すもの一式。 */
export type HomeView<T> = {
  /** ステータスごとの件数（全議案）。 */
  statusCounts: Record<BillStatusGroup, number>;
  /** 会派の賛否が分かれた議案の件数。 */
  splitCount: number;
  /** テーマ別のカード。テーマの並び順のまま、議案の無いテーマは除く。 */
  themeShelves: ThemeShelf<T>[];
  /** 横スクロールの列。どれも提出日が新しい順に最大 rowLimit 件。 */
  rows: {
    deliberating: T[];
    split: T[];
    enacted: T[];
    rejected: T[];
  };
};

export const HOME_SHELF_SIZE = 4;
export const HOME_ROW_LIMIT = 15;

/**
 * トップページのカードと横スクロールの列に何を載せるかを決める純粋関数。
 *
 * 議案一覧（/bills）と同じ全件の軽い議案から作るので、トップの件数と一覧の
 * 件数が食い違わない。並びは提出日が新しい順（一覧の既定と同じ）。
 */
export function buildHomeView<T extends HomeBill>(
  bills: readonly T[],
  themes: readonly BillTag[],
  {
    shelfSize = HOME_SHELF_SIZE,
    rowLimit = HOME_ROW_LIMIT,
  }: { shelfSize?: number; rowLimit?: number } = {}
): HomeView<T> {
  const newest = sortBills(bills, "new");

  const themeShelves = themes.flatMap((theme) => {
    const matched = newest.filter((bill) =>
      bill.tags.some((tag) => tag.id === theme.id)
    );
    if (matched.length === 0) return [];
    return [
      {
        theme: { id: theme.id, label: theme.label },
        count: matched.length,
        bills: matched.slice(0, shelfSize),
      },
    ];
  });

  const byGroup = (group: Exclude<BillStatusGroup, "all">) =>
    newest
      .filter((bill) => toBillStatusGroup(bill.status) === group)
      .slice(0, rowLimit);
  const split = newest.filter((bill) => bill.is_featured === true);

  return {
    statusCounts: countByStatusGroup(bills),
    splitCount: split.length,
    themeShelves,
    rows: {
      deliberating: byGroup("deliberating"),
      split: split.slice(0, rowLimit),
      enacted: byGroup("enacted"),
      rejected: byGroup("rejected"),
    },
  };
}
