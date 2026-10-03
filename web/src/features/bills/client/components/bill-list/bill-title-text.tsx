import { splitBillTitle } from "../../../shared/utils/split-bill-title";

/**
 * 議案名の文字。末尾の短い括弧書き（「（第2号）」など）は途中で改行しない
 * （「…補正予算（第／2号）」にしない）。見出しやリンクの中に置いて使う。
 */
export function BillTitleText({ title }: { title: string }) {
  const { head, tail } = splitBillTitle(title);
  if (!tail) return <>{title}</>;
  return (
    <>
      {head}
      <span className="whitespace-nowrap">{tail}</span>
    </>
  );
}
