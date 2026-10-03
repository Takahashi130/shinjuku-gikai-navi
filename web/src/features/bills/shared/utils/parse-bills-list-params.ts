import type { Route } from "next";
import { routes } from "@/lib/routes";
import { type BillStatusGroup, isBillStatusGroup } from "./bill-status-group";
import { parsePageParam } from "./pagination";
import {
  type BillSortKey,
  DEFAULT_BILL_SORT,
  isBillSortKey,
} from "./sort-bills";

/** 一覧の絞り込み状態。すべて URL に載せる。 */
export type BillsListParams = {
  query: string;
  status: BillStatusGroup;
  /** タグ id。null は「すべて」。 */
  tagId: string | null;
  sort: BillSortKey;
  /** AIインタビュー受付中のみに絞るか。 */
  interviewOnly: boolean;
  /** 会派の賛否が分かれた議案（is_featured）のみに絞るか。 */
  splitOnly: boolean;
  /**
   * 1始まりのページ番号。最終ページを超える値もありうるので、表示の前に
   * `getPageInfo` で丸める。
   */
  page: number;
};

/** ページ・コンポーネント間で共有する searchParams の形。 */
export type BillsListSearchParams = {
  q?: string | string[];
  status?: string | string[];
  tag?: string | string[];
  sort?: string | string[];
  interview?: string | string[];
  split?: string | string[];
  page?: string | string[];
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** 絞り込みなしの一覧。ここから1つだけ差し替えてリンクを作る。 */
export const DEFAULT_BILLS_LIST_PARAMS: Readonly<BillsListParams> = {
  query: "",
  status: "all",
  tagId: null,
  sort: DEFAULT_BILL_SORT,
  interviewOnly: false,
  splitOnly: false,
  page: 1,
};

/**
 * URL パラメータを一覧の状態に正規化する純粋関数。
 * 不正値は既定に倒す。URL 直打ちでページを壊せないようにする。
 */
export function parseBillsListParams(
  searchParams: BillsListSearchParams
): BillsListParams {
  const status = firstValue(searchParams.status);
  const sort = firstValue(searchParams.sort);
  const tag = firstValue(searchParams.tag)?.trim();

  return {
    query: firstValue(searchParams.q)?.trim() ?? "",
    status: isBillStatusGroup(status) ? status : "all",
    tagId: tag || null,
    sort: isBillSortKey(sort) ? sort : DEFAULT_BILL_SORT,
    interviewOnly: firstValue(searchParams.interview) === "1",
    splitOnly: firstValue(searchParams.split) === "1",
    page: parsePageParam(firstValue(searchParams.page)),
  };
}

/**
 * 現在の状態から1つだけ差し替えたクエリ文字列を作る純粋関数。
 * 既定値はURLに出さない。共有されたURLが読みやすくなる。
 *
 * ページ番号は patch で明示したときだけ引き継ぐ。それ以外は1ページ目に
 * 戻す。絞り込みや並び替えを変えると件数も順序も変わるので、元のページ
 * 番号に留まっても意味がない。
 */
export function buildBillsListQuery(
  current: BillsListParams,
  patch: Partial<BillsListParams> = {}
): string {
  const next = { ...current, page: 1, ...patch };
  const params = new URLSearchParams();

  if (next.query) params.set("q", next.query);
  if (next.status !== "all") params.set("status", next.status);
  if (next.tagId) params.set("tag", next.tagId);
  if (next.sort !== DEFAULT_BILL_SORT) params.set("sort", next.sort);
  if (next.interviewOnly) params.set("interview", "1");
  if (next.splitOnly) params.set("split", "1");
  if (next.page > 1) params.set("page", String(next.page));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

/**
 * 一覧ページへのリンク。typedRoutes はクエリ付きのテンプレート文字列を
 * 推論できないため、キャストをこの関数だけに閉じる。
 */
export function billsListHref(
  current: BillsListParams,
  patch: Partial<BillsListParams> = {}
): Route {
  return `${routes.billsList()}${buildBillsListQuery(current, patch)}` as Route;
}

/**
 * 一覧の先頭（件数の行）に付ける id。ページ送りの着地点にする。
 *
 * ページ送りは一覧の下にあるので、ページの最上部に戻すと毎回絞り込みの UI を
 * スクロールし直すことになる。
 */
export const BILLS_RESULTS_ID = "bills-results";

/**
 * ページ送りのリンク。絞り込みを保ったまま page だけ差し替え、一覧の先頭に
 * 着地させる。
 *
 * Next はハッシュの指す要素まで scrollIntoView し、続けて focus() を呼ぶ。
 * 着地点に tabIndex={-1} を付けておくと、キーボードや読み上げの位置も一覧の
 * 先頭に移る。
 */
export function billsListPageHref(
  current: BillsListParams,
  page: number
): Route {
  return `${billsListHref(current, { page })}#${BILLS_RESULTS_ID}` as Route;
}
