"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";
import {
  type BillsListParams,
  billsListHref,
} from "../../../shared/utils/parse-bills-list-params";
import {
  BILL_SORT_KEYS,
  BILL_SORT_LABELS,
  isBillSortKey,
} from "../../../shared/utils/sort-bills";

/**
 * 並び替えのセレクト（一覧の右上）。
 *
 * 他の絞り込みはリンクで完結するが、select は変更を拾って遷移させる必要が
 * あるためここだけクライアントにする。状態は URL にあるので、戻る操作でも
 * 選択が復元される。
 */
export function BillsSortSelect({ params }: { params: BillsListParams }) {
  const router = useRouter();
  const selectId = useId();

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={selectId}
        className="whitespace-nowrap text-[13px] text-mirai-text-secondary"
      >
        並び替え
      </label>
      <select
        id={selectId}
        value={params.sort}
        onChange={(event) => {
          const next = event.target.value;
          if (!isBillSortKey(next)) return;
          router.push(billsListHref(params, { sort: next }));
        }}
        className="h-9 rounded-md border border-mirai-border bg-mirai-surface px-2.5 text-[13px] font-medium text-mirai-text shadow-xs hover:bg-mirai-surface-muted"
      >
        {BILL_SORT_KEYS.map((key) => (
          <option key={key} value={key}>
            {BILL_SORT_LABELS[key]}
          </option>
        ))}
      </select>
    </div>
  );
}
