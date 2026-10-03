import type { BillListItem } from "../types";
import type { BillsListParams } from "./parse-bills-list-params";
import { type SearchableBill, searchBills } from "./search-bills";

/**
 * 絞り込みに必要な最小の形。検索の対象（名称・タイトル・要約・タグ名）に、
 * カテゴリ・受付中・賛否が分かれたかの判定に使う項目を足したもの。
 */
type FilterableBill = Omit<SearchableBill, "tags"> &
  Pick<BillListItem, "tags" | "hasPublicInterview"> & {
    is_featured?: boolean;
  };

/**
 * ステータス以外の絞り込み（キーワード・カテゴリ・受付中・賛否が分かれた議案）を
 * まとめて適用する。
 *
 * ステータスのタブに出す件数は、この結果を母集合にして数える。先に適用しないと
 * タブの数字が実際に表示される件数とずれる。
 *
 * 引数は params ごと受け取る。個別に並べると string と string | null が隣接して、
 * 入れ替えても型が通ってしまう。
 */
export function filterBills<T extends FilterableBill>(
  bills: readonly T[],
  params: Pick<
    BillsListParams,
    "query" | "tagId" | "interviewOnly" | "splitOnly"
  >
): T[] {
  let filtered = searchBills(bills, params.query);

  if (params.tagId) {
    filtered = filtered.filter((bill) =>
      bill.tags.some((tag) => tag.id === params.tagId)
    );
  }
  if (params.interviewOnly) {
    filtered = filtered.filter((bill) => bill.hasPublicInterview);
  }
  // 取り込み時に「会派の賛成と反対が分かれた議案」へ is_featured を立てている。
  if (params.splitOnly) {
    filtered = filtered.filter((bill) => bill.is_featured === true);
  }
  return filtered;
}
