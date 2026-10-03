import type { BillListItem, BillTag } from "../types";
import {
  type BillStatusGroup,
  countByStatusGroup,
  filterByStatusGroup,
} from "./bill-status-group";
import { filterBills } from "./filter-bills";
import { BILLS_PER_PAGE, type PageInfo, paginate } from "./pagination";
import type { BillsListParams } from "./parse-bills-list-params";
import { sortBills } from "./sort-bills";
import { countTagChipItems } from "./tag-chip-items";

/** カテゴリのチップ1つ分。tagId が null のものは「すべて」。 */
export type BillsListTagChip = {
  id: string;
  label: string;
  tagId: string | null;
  count: number;
};

/** 議案一覧（/bills）に出すもの一式。 */
export type BillsListView<T> = {
  /** ステータスのタブの件数。ページ分割の前の全体から数える。 */
  statusCounts: Record<BillStatusGroup, number>;
  /** カテゴリのチップ。先頭は「すべて」。件数はページ分割の前の全体から数える。 */
  tagChips: BillsListTagChip[];
  /** 絞り込み・並び替えのあと、表示するページの分だけ切り出した議案。 */
  pageBills: T[];
  /** ページ分割の結果。totalCount は絞り込んだあとの全体の件数。 */
  pageInfo: PageInfo;
};

/**
 * 一覧の絞り込み・件数・並び替え・ページ分割をまとめて行う純粋関数。
 *
 * 順序に意味がある。件数（タブとチップ）は、ページ分割の前の全体から数える。
 * 先に切り出すと、どのページを開いているかで数字が変わってしまう。
 *
 * - ステータスのタブ: ステータス以外の絞り込みを適用した母集合から数える
 * - カテゴリのチップ: タグ以外の絞り込みを適用した母集合から数える。タグ自身を
 *   母集合に含めると、選択中のタグ以外がすべて0件になる
 * - 表示する議案: すべての絞り込み → 並び替え → ページ分割の順
 *
 * 範囲外のページ番号はここで丸める（最終ページ超えは最終ページに）。
 */
export function buildBillsListView<T extends BillListItem>(
  bills: readonly T[],
  featuredTags: readonly BillTag[],
  params: BillsListParams,
  perPage: number = BILLS_PER_PAGE
): BillsListView<T> {
  // タグ以外の絞り込みを先に適用し、そこからタグ絞り込みを派生させる。
  // 同じキーワード検索を2度走らせずに、タブとチップの母集合を作れる。
  const withoutTag = filterBills(bills, { ...params, tagId: null });
  const scoped = params.tagId
    ? withoutTag.filter((bill) =>
        bill.tags.some((tag) => tag.id === params.tagId)
      )
    : withoutTag;
  const statusCounts = countByStatusGroup(scoped);

  const forTagCounts = filterByStatusGroup(withoutTag, params.status);
  const tags = countTagChipItems(featuredTags, forTagCounts, params.tagId);
  const tagChips: BillsListTagChip[] = [
    { id: "all", label: "すべて", tagId: null, count: forTagCounts.length },
    ...tags.map((tag) => ({
      id: tag.id,
      label: tag.label,
      tagId: tag.id,
      count: tag.count,
    })),
  ];

  const sorted = sortBills(
    filterByStatusGroup(scoped, params.status),
    params.sort
  );
  const { items: pageBills, pageInfo } = paginate(sorted, params.page, perPage);

  return { statusCounts, tagChips, pageBills, pageInfo };
}
