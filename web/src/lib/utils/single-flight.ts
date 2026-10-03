/**
 * 同時に何度呼ばれても、実行中の処理は1つだけにする関数を作る。
 *
 * 実行中に呼ばれたら、同じ Promise を返す。終わったら（成功・失敗とも）次の呼び出しで
 * また実行する。結果を覚えておくキャッシュではない。
 *
 * 例：まだログインしていない状態で2つのボタンが同時に押されても、
 * 匿名ユーザーを2つ作らないようにする。
 */
export function singleFlight<T>(run: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;
  return () => {
    if (inFlight) return inFlight;
    const current = (async () => {
      try {
        return await run();
      } finally {
        inFlight = null;
      }
    })();
    inFlight = current;
    return current;
  };
}
