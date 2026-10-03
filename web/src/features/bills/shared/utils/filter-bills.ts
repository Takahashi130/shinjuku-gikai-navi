import type { BillListItem } from "../types";
import type { BillsListParams } from "./parse-bills-list-params";
import { type SearchableBill, searchBills } from "./search-bills";

/**
 * 絞り込みに必要な最小の形。検索の対象（名称・タイトル・要約・タグ名）に、
 * カテゴリと受付中の判定に使う項目を足したもの。
 */
type FilterableBill = Omit<SearchableBill, "tags"> &
  Pick<BillListItem, "tags" | "hasPublicInterview">;

/**
 * ステータス以外の絞り込み（キーワード・カテゴリ・受付中）をまとめて適用する。
 *
 * ステータスのタブに出す件数は、この結果を母集合にして数える。先に適用しないと
 * タブの数字が実際に表示される件数とずれる。
 *
 * 引数は params ごと受け取る。個別に並べると string と string | null が隣接して、
 * 入れ替えても型が通ってしまう。
 */
export function filterBills<T extends FilterableBill>(
  bills: readonly T[],
  params: Pick<BillsListParams, "query" | "tagId" | "interviewOnly">
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
  return filtered;
}
