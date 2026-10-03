/** Supabase（PostgREST）が1リクエストで返す行数の上限（既定値）。 */
export const SUPABASE_MAX_ROWS = 1000;

/**
 * `fetchAllRows` が問い合わせる回数の上限。1000件ずつなら10万件にあたる。
 *
 * fetchPage が range を掛け忘れると、毎回同じ先頭の行が返って空のページに
 * 行き着かない。止まらずにメモリを食い続けるより、ここで投げて気づかせる。
 */
export const FETCH_ALL_ROWS_MAX_PAGES = 100;

/** `fetchAllRows` に渡す1ページ分の結果。Supabase のクエリ結果と同じ形。 */
export type RowsPage<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

/**
 * `.range()` で pageSize 件ずつ問い合わせて、全件を集める。
 *
 * Supabase は max_rows（既定1000）を超えた行をエラーにせず黙って切り捨てる。
 * 議案は会期ごとに増えるので、1回の select では上限を超えた分が静かに欠ける。
 *
 * 空のページが返るまで続け、次の開始位置は実際に返ってきた件数だけ進める。
 * 「pageSize に満たなければ最後」と判断すると、サーバーの max_rows が
 * pageSize より小さく設定されたときに1ページ目で黙って止まる。その代わり
 * 最後に空を確かめる問い合わせが毎回1回増えるが、呼び出し側はキャッシュ
 * 越しに使うので許容する。
 *
 * fetchPage には range を掛けたクエリを返す関数を渡す。ページをまたいで順序が
 * 揺れると行が重複・欠落するので、一意な列（id など）を含む order を必ず付ける。
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<RowsPage<T>>,
  pageSize: number = SUPABASE_MAX_ROWS
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error("pageSize must be a positive integer");
  }

  const rows: T[] = [];
  for (let pageCount = 0; pageCount < FETCH_ALL_ROWS_MAX_PAGES; pageCount++) {
    const from = rows.length;
    // range の終端は両端を含むので、件数から1を引く
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) {
      throw new Error(error.message);
    }
    const page = data ?? [];
    if (page.length === 0) {
      return rows;
    }
    rows.push(...page);
  }

  throw new Error(
    `fetchAllRows exceeded ${FETCH_ALL_ROWS_MAX_PAGES} pages. Check that fetchPage applies .range(from, to).`
  );
}
