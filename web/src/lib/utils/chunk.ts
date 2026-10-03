/**
 * 配列を size 件ずつに分ける。
 * Supabase の `.in()` は ID を URL に並べるため、件数が多いと
 * 「URI too long」になる。その回避のために分割して問い合わせる。
 */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) throw new Error("size must be positive");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** `.in()` に一度に渡す ID の上限（UUID 100件で URL が約4KB） */
export const IN_QUERY_CHUNK_SIZE = 100;
