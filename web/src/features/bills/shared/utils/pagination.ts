/** 議案一覧の1ページあたりの件数。 */
export const BILLS_PER_PAGE = 30;

/**
 * URL の page を1始まりのページ番号に読む純粋関数。
 *
 * 数字以外・0・負数・小数は 1 に倒す。URL 直打ちでページを壊せないように
 * する。最終ページを超える番号は、件数が分かるまで判定できないので
 * ここでは丸めず、`getPageInfo` に任せる。
 */
export function parsePageParam(value: string | undefined): number {
  const trimmed = value?.trim() ?? "";
  if (!/^\d+$/.test(trimmed)) return 1;

  const page = Number(trimmed);
  if (page < 1) return 1;
  // 桁が大きすぎると精度が落ちるので、安全な整数の上限で止める。
  // どのみち最終ページに丸められる。
  return Math.min(page, Number.MAX_SAFE_INTEGER);
}

/** ページ分割の結果。表示とページ送りのリンクに使う。 */
export type PageInfo = {
  /** 丸めたあとの現在ページ（1始まり）。 */
  page: number;
  /** 総ページ数。0件でも1ページとして扱う。 */
  totalPages: number;
  /** ページ分割前の件数。 */
  totalCount: number;
  /** 表示する範囲の先頭（0始まり、含む）。 */
  startIndex: number;
  /** 表示する範囲の末尾（0始まり、含まない）。 */
  endIndex: number;
  /** 前のページ番号。1ページ目では null。 */
  prevPage: number | null;
  /** 次のページ番号。最終ページでは null。 */
  nextPage: number | null;
};

/**
 * 件数と要求されたページから、表示する範囲を決める純粋関数。
 *
 * ページは 1〜総ページ数に丸める。最終ページを超えたら最終ページを、
 * 1未満なら1ページ目を出す。絞り込みで件数が減ったあとに古いページ番号の
 * URL が開かれても、空のページにはしない。
 */
export function getPageInfo(
  totalCount: number,
  requestedPage: number,
  perPage: number
): PageInfo {
  if (!Number.isInteger(perPage) || perPage <= 0) {
    throw new Error("perPage must be a positive integer");
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const requested = Number.isFinite(requestedPage)
    ? Math.floor(requestedPage)
    : 1;
  const page = Math.min(Math.max(requested, 1), totalPages);
  const startIndex = (page - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, totalCount);

  return {
    page,
    totalPages,
    totalCount,
    startIndex,
    endIndex,
    prevPage: page > 1 ? page - 1 : null,
    nextPage: page < totalPages ? page + 1 : null,
  };
}

/** 配列から要求されたページの分だけを切り出す。範囲は `getPageInfo` に従う。 */
export function paginate<T>(
  items: readonly T[],
  requestedPage: number,
  perPage: number
): { items: T[]; pageInfo: PageInfo } {
  const pageInfo = getPageInfo(items.length, requestedPage, perPage);
  return {
    items: items.slice(pageInfo.startIndex, pageInfo.endIndex),
    pageInfo,
  };
}
