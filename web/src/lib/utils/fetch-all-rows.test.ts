import { describe, expect, it } from "vitest";
import {
  FETCH_ALL_ROWS_MAX_PAGES,
  fetchAllRows,
  type RowsPage,
} from "./fetch-all-rows";

/**
 * Supabase の range 問い合わせの代わり。max_rows を超える分は切り捨てて返す
 * ところまで本物に合わせ、呼ばれた範囲を記録する。
 */
function fakeTable(total: number, maxRows: number) {
  const rows = Array.from({ length: total }, (_, i) => i);
  const calls: [number, number][] = [];
  const fetchPage = async (
    from: number,
    to: number
  ): Promise<RowsPage<number>> => {
    calls.push([from, to]);
    const end = Math.min(to + 1, from + maxRows);
    return { data: rows.slice(from, end), error: null };
  };
  return { fetchPage, calls };
}

describe("fetchAllRows", () => {
  it("上限を超える件数でも全件を順に集める", async () => {
    const { fetchPage, calls } = fakeTable(2345, 1000);

    const result = await fetchAllRows(fetchPage);

    expect(result).toHaveLength(2345);
    expect(result[0]).toBe(0);
    expect(result.at(-1)).toBe(2344);
    // 最後のページが満杯でなくても、空のページを確かめてから止める。
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
      [2345, 3344],
    ]);
  });

  it("上限に満たなければ、空を確かめる1回を足して終わる", async () => {
    const { fetchPage, calls } = fakeTable(940, 1000);

    const result = await fetchAllRows(fetchPage);

    expect(result).toHaveLength(940);
    expect(calls).toEqual([
      [0, 999],
      [940, 1939],
    ]);
  });

  // 管理画面で Max Rows を下げられても、1ページ目で黙って止まらない。
  it("サーバーの上限が pageSize より小さくても全件を集める", async () => {
    const { fetchPage, calls } = fakeTable(940, 300);

    const result = await fetchAllRows(fetchPage);

    expect(result).toEqual(Array.from({ length: 940 }, (_, i) => i));
    expect(calls).toEqual([
      [0, 999],
      [300, 1299],
      [600, 1599],
      [900, 1899],
      [940, 1939],
    ]);
  });

  it("件数がページの倍数ちょうどなら空のページで止まる", async () => {
    const { fetchPage, calls } = fakeTable(6, 3);

    const result = await fetchAllRows(fetchPage, 3);

    expect(result).toEqual([0, 1, 2, 3, 4, 5]);
    expect(calls).toEqual([
      [0, 2],
      [3, 5],
      [6, 8],
    ]);
  });

  it("0件なら空配列を返す", async () => {
    const { fetchPage } = fakeTable(0, 1000);

    expect(await fetchAllRows(fetchPage)).toEqual([]);
  });

  it("data が null でも空ページとして扱う", async () => {
    const result = await fetchAllRows<number>(async () => ({
      data: null,
      error: null,
    }));

    expect(result).toEqual([]);
  });

  // 途中のページで失敗したときに、そこまでの分を全件として返さない。
  it("途中でエラーになったら投げる", async () => {
    let call = 0;
    const fetchPage = async (): Promise<RowsPage<number>> => {
      call += 1;
      return call === 1
        ? { data: [1, 2], error: null }
        : { data: null, error: { message: "boom" } };
    };

    await expect(fetchAllRows(fetchPage, 2)).rejects.toThrow("boom");
  });

  // range を掛け忘れると同じ行が返り続ける。止まらずにメモリを食うより投げる。
  it("空のページに行き着かなければ上限の回数で投げる", async () => {
    let call = 0;
    const fetchPage = async (): Promise<RowsPage<number>> => {
      call += 1;
      return { data: [1], error: null };
    };

    await expect(fetchAllRows(fetchPage, 1)).rejects.toThrow(".range");
    expect(call).toBe(FETCH_ALL_ROWS_MAX_PAGES);
  });

  it("pageSize が正の整数でなければエラー", async () => {
    const { fetchPage } = fakeTable(1, 1);

    await expect(fetchAllRows(fetchPage, 0)).rejects.toThrow();
    await expect(fetchAllRows(fetchPage, 1.5)).rejects.toThrow();
  });
});
