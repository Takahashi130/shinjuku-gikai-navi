import type { PageInfo } from "./pagination";

/**
 * 議案一覧の件数の行（例：「940件の議案（1〜30件目）」）。
 *
 * ページが複数あるときだけ表示中の範囲を添える。表示側では条件で出し入れする
 * 子要素にせず、この1つの文字列として描く（ふりがな表示が ON のとき、Rubyful が
 * 差し替えた要素から React が子要素を取り除こうとして落ちるのを避ける）。
 */
export function formatBillsResultCount(
  pageInfo: Pick<
    PageInfo,
    "totalCount" | "totalPages" | "startIndex" | "endIndex"
  >
): string {
  const count = `${pageInfo.totalCount}件の議案`;
  if (pageInfo.totalPages <= 1) return count;
  return `${count}（${pageInfo.startIndex + 1}〜${pageInfo.endIndex}件目）`;
}
