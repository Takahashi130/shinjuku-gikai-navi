import {
  buildBillsListQuery,
  parseBillsListParams,
} from "@/features/bills/shared/utils/parse-bills-list-params";
import { routes } from "@/lib/routes";

/** ヘッダーの検索フォームの初期状態。 */
export type HeaderSearchState = {
  /** 入力欄に最初から入れておく語。 */
  query: string;
  /** 検索と一緒に送る隠しフィールド（名前と値）。 */
  hiddenFields: [name: string, value: string][];
};

/**
 * ヘッダーの検索フォームの初期状態を、いま開いているページから決める。
 *
 * 議案一覧（/bills）を見ているときは、入力欄に今の検索語を入れ、ステータスや
 * テーマなどの絞り込みを隠しフィールドで引き継ぐ。検索し直しても絞り込みが
 * 外れないようにするため。ページ番号は引き継がない（1ページ目に戻す）。
 * ほかのページからの検索は、絞り込みなしの一覧を開く。
 */
export function getHeaderSearchState(
  pathname: string,
  searchParams: Record<string, string>
): HeaderSearchState {
  if (pathname !== routes.billsList()) {
    return { query: "", hiddenFields: [] };
  }

  const params = parseBillsListParams(searchParams);
  // 既定値を URL に出さない規則は buildBillsListQuery が持っているので、
  // そこから導出する。q は入力欄が持つので取り除く。
  const rest = buildBillsListQuery(params, { query: "" }).replace(/^\?/, "");
  return {
    query: params.query,
    hiddenFields: [...new URLSearchParams(rest)],
  };
}
