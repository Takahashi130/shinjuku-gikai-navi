import type { BillTag as BillTagType } from "../../../shared/types";

/** 議案のテーマ（タグ）。一覧の行や詳細に添える小さなラベル。 */
export function BillTag({ tag }: { tag: BillTagType }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-mirai-surface px-2.5 py-0.5 text-xs font-medium text-mirai-text-secondary">
      {tag.label}
    </span>
  );
}
