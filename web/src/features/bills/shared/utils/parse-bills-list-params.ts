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
  /** 議員提出議案（slug が …-giin-N）のみに絞るか。議員のページから送る。 */
  memberSubmittedOnly: boolean;
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
  giin?: string | string[];
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
  memberSubmittedOnly: false,
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
    memberSubmittedOnly: firstValue(searchParams.giin) === "1",
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
  if (next.memberSubmittedOnly) params.set("giin", "1");
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

/**
 * 一覧の検索欄の id。ヘッダーの検索アイコンはここへ送る。
 *
 * ページ内の移動だけではブラウザは入力欄にフォーカスを移さない（ページを
 * 開き直したときなど）ので、絞り込みのフォーム（BillsFilterForm）が、
 * URL のハッシュがこの id のときに入力欄へフォーカスする。
 */
export const BILLS_SEARCH_INPUT_ID = "bills-search";

/** ヘッダーの検索アイコンの行き先（一覧の検索欄）。 */
export function billsSearchHref(): Route {
  return `${routes.billsList()}#${BILLS_SEARCH_INPUT_ID}` as Route;
}

/**
 * 一覧の絞り込みのフォーム（検索欄・テーマ・並び替え）と一緒に送る隠しフィールド
 * （名前と値）。
 *
 * 検索し直してもステータスなどの絞り込みが外れないよう、いまの条件を引き継ぐ。
 * 検索語・テーマ・並び替えはフォームの入力欄と選択欄が持つので含めない（同じ
 * 名前が2つあると、先に来る古い値が使われる）。ページ番号も含めない（検索し
 * 直したら件数も並びも変わるので、1ページ目に戻す）。既定値を URL に出さない
 * 規則は buildBillsListQuery が持っているので、そこから導出する。
 */
export function buildSearchHiddenFields(
  params: BillsListParams
): [name: string, value: string][] {
  const rest = buildBillsListQuery(params, {
    query: "",
    tagId: null,
    sort: DEFAULT_BILL_SORT,
  }).replace(/^\?/, "");
  return [...new URLSearchParams(rest)];
}

/**
 * 絞り込みのフォームの送信内容（FormData の組）から、一覧の URL を作る。
 *
 * フォームは JavaScript が無くても GET 送信で動くが、そのままだと空の検索語や
 * 既定の並び替えまで URL に出る。JavaScript があるときは、送信の代わりに
 * この URL へ移動して、共有しやすい短い URL にする。同じ名前が2つあれば
 * 先のものを使う（URL のときと同じ）。
 */
export function billsListHrefFromFormEntries(
  entries: Iterable<readonly [string, unknown]>
): Route {
  const searchParams: Record<string, string> = {};
  for (const [name, value] of entries) {
    if (typeof value !== "string" || name in searchParams) continue;
    searchParams[name] = value;
  }
  return billsListHref(parseBillsListParams(searchParams));
}
