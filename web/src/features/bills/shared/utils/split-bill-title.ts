/** 末尾の括弧書きとして切り分ける長さの上限（括弧の中の文字数）。 */
const MAX_TAIL_INNER_LENGTH = 10;

/**
 * 議案名の末尾の短い括弧書き（「（第2号）」など）を切り分ける純粋関数。
 *
 * 議案名は長いので、ふつうに折り返すと「…補正予算（第／2号）」のように
 * 括弧の中で改行されることがある。末尾の括弧書きをひとまとまりにして
 * 折り返せるよう、本体（head）と括弧書き（tail）に分ける。括弧書きが無い、
 * 長すぎる、名前全体が括弧書きのときは、tail を空にする。
 */
export function splitBillTitle(title: string): { head: string; tail: string } {
  const matched = new RegExp(`（[^（）]{1,${MAX_TAIL_INNER_LENGTH}}）$`).exec(
    title
  );
  if (!matched || matched.index === 0) return { head: title, tail: "" };
  return { head: title.slice(0, matched.index), tail: matched[0] };
}
