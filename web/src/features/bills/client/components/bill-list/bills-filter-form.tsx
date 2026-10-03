"use client";

import { ChevronDown, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import type { BillsListTagChip } from "../../../shared/utils/build-bills-list-view";
import {
  BILLS_SEARCH_INPUT_ID,
  type BillsListParams,
  billsListHrefFromFormEntries,
  buildSearchHiddenFields,
} from "../../../shared/utils/parse-bills-list-params";
import {
  BILL_SORT_KEYS,
  BILL_SORT_LABELS,
} from "../../../shared/utils/sort-bills";

/** 「すべてのテーマ」を表す select の値。タグの id とは重ならない。 */
const ALL_THEMES_VALUE = "";

interface BillsFilterFormProps {
  params: BillsListParams;
  /** 先頭は「すべて」（tagId が null）。件数はテーマ以外の絞り込みのあとの数。 */
  tagChips: BillsListTagChip[];
  /** 検索欄と、テーマ・並び替えの間に置くもの（ステータスのピルなど）。 */
  children?: ReactNode;
}

/**
 * 議案一覧（/bills）の上部の絞り込みのフォーム。検索欄・テーマ・並び替え。
 *
 * テーマと並び替えは、選んだだけでは移動しない。「表示する」か「検索」を
 * 押したときに、検索語と一緒に反映する。選んだ瞬間に移動すると、矢印キーで
 * 選択肢を見比べられず（Windows などでは閉じた select で矢印キーを押すたびに
 * change が起きる）、移動のたびに一覧を作り直すのでフォーカスも失われる。
 *
 * JavaScript が無くてもフォームの GET 送信で動く。あるときは、空の値や既定値を
 * 除いた短い URL へ移動する（billsListHrefFromFormEntries）。
 *
 * ヘッダーの検索アイコン（/bills#bills-search）から来たときは、検索欄に
 * フォーカスを移して、すぐ入力できるようにする。
 */
export function BillsFilterForm({
  params,
  tagChips,
  children,
}: BillsFilterFormProps) {
  const router = useRouter();
  const themeId = useId();
  const sortId = useId();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearchIfTargeted = () => {
      const input = searchRef.current;
      if (!input || window.location.hash !== `#${BILLS_SEARCH_INPUT_ID}`) {
        return;
      }
      if (document.activeElement !== input) input.focus();
    };
    focusSearchIfTargeted();
    window.addEventListener("hashchange", focusSearchIfTargeted);
    return () =>
      window.removeEventListener("hashchange", focusSearchIfTargeted);
  }, []);

  return (
    <form
      action={routes.billsList()}
      role="search"
      aria-label="議案の検索と絞り込み"
      onSubmit={(event) => {
        event.preventDefault();
        router.push(
          billsListHrefFromFormEntries(new FormData(event.currentTarget))
        );
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex h-13 w-full items-center gap-2 rounded-full border border-line-soft bg-mirai-surface pr-1 pl-4 focus-within:border-brand-link focus-within:bg-white focus-within:ring-[3px] focus-within:ring-brand-accent/40">
        <Search className="size-5 shrink-0 text-mirai-text-muted" aria-hidden />
        <label htmlFor={BILLS_SEARCH_INPUT_ID} className="sr-only">
          議案を検索
        </label>
        {/* iOS で入力のたびにページが拡大されないよう、文字は 16px にする */}
        <input
          ref={searchRef}
          id={BILLS_SEARCH_INPUT_ID}
          type="search"
          name="q"
          defaultValue={params.query}
          placeholder="議案名・キーワード"
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 scroll-mt-24 bg-transparent text-base text-mirai-text outline-none placeholder:text-mirai-text-muted"
        />
        <Button type="submit" size="sm" className="h-11 shrink-0 px-5">
          検索
        </Button>
      </div>
      {buildSearchHiddenFields(params).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {children}

      {/* 狭い画面では選択肢の文字が切れないよう、縦に並べる */}
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_auto]">
        <SelectField id={themeId} label="テーマ">
          <select
            id={themeId}
            name="tag"
            defaultValue={params.tagId ?? ALL_THEMES_VALUE}
            className={SELECT_CLASS}
          >
            {tagChips.map((chip) => (
              <option key={chip.id} value={chip.tagId ?? ALL_THEMES_VALUE}>
                {`${chip.tagId ? chip.label : "すべてのテーマ"}（${chip.count}）`}
              </option>
            ))}
          </select>
        </SelectField>

        <SelectField id={sortId} label="並び替え">
          <select
            id={sortId}
            name="sort"
            defaultValue={params.sort}
            className={SELECT_CLASS}
          >
            {BILL_SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {BILL_SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </SelectField>

        <Button
          type="submit"
          variant="outline"
          className="h-11 w-full px-5 sm:w-auto"
        >
          表示する
        </Button>
      </div>
    </form>
  );
}

/** iOS で選択のたびにページが拡大されないよう、文字は 16px にする。 */
const SELECT_CLASS =
  "h-11 w-full appearance-none rounded-full border border-line-soft bg-white pr-9 pl-4 text-base font-bold text-mirai-text shadow-xs hover:border-brand-link/40";

function SelectField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold text-mirai-text-muted">
        {label}
      </label>
      <div className="relative">
        {children}
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-mirai-text-muted"
          aria-hidden
        />
      </div>
    </div>
  );
}
