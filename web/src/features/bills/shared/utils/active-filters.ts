import type { Route } from "next";
import type { BillTag } from "../types";
import { BILL_STATUS_GROUP_LABELS } from "./bill-status-group";
import { type BillsListParams, billsListHref } from "./parse-bills-list-params";

/** 一覧の上に並べる「いま効いている絞り込み」1つ分。押すとその条件だけ外す。 */
export type ActiveFilter = {
  key: "query" | "status" | "tag" | "split" | "interview";
  label: string;
  /** この条件だけを外した一覧へのリンク。 */
  removeHref: Route;
};

/**
 * いま効いている絞り込みを、外すためのリンクつきで並べる純粋関数。
 *
 * 狭い画面では絞り込みの一覧が上に畳まれるので、何で絞っているのかを結果の
 * すぐ上に出す。並び替えは絞り込みではないので含めない。
 */
export function buildActiveFilters(
  params: BillsListParams,
  tags: readonly BillTag[]
): ActiveFilter[] {
  const filters: ActiveFilter[] = [];

  if (params.query) {
    filters.push({
      key: "query",
      label: `「${params.query}」`,
      removeHref: billsListHref(params, { query: "" }),
    });
  }
  if (params.status !== "all") {
    filters.push({
      key: "status",
      label: BILL_STATUS_GROUP_LABELS[params.status],
      removeHref: billsListHref(params, { status: "all" }),
    });
  }
  if (params.tagId) {
    filters.push({
      key: "tag",
      // 掲載をやめたタグの URL が開かれても、何かで絞っていることは示す。
      label: tags.find((tag) => tag.id === params.tagId)?.label ?? "テーマ",
      removeHref: billsListHref(params, { tagId: null }),
    });
  }
  if (params.splitOnly) {
    filters.push({
      key: "split",
      label: "賛否が分かれた議案",
      removeHref: billsListHref(params, { splitOnly: false }),
    });
  }
  if (params.interviewOnly) {
    filters.push({
      key: "interview",
      label: "AIインタビュー受付中",
      removeHref: billsListHref(params, { interviewOnly: false }),
    });
  }
  return filters;
}

/** 絞り込みをすべて外した一覧へのリンク。並び替えは残す。 */
export function clearFiltersHref(params: BillsListParams): Route {
  return billsListHref(params, {
    query: "",
    status: "all",
    tagId: null,
    splitOnly: false,
    interviewOnly: false,
  });
}
