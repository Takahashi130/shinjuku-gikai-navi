/**
 * key が同じ要素を1つにまとめる。最初に現れたものを残し、並びは保つ。
 *
 * range で分けた問い合わせは、それぞれ別の時点の DB を見る。途中で行が
 * 増えると、前のページの末尾が次のページの先頭にも出るので、その重複を
 * 取り除くのに使う。
 */
export function uniqueBy<T>(
  items: readonly T[],
  key: (item: T) => unknown
): T[] {
  const seen = new Set<unknown>();
  const result: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    result.push(item);
  }
  return result;
}
