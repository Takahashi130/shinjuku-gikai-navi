"use client";

import { Search } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useId } from "react";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import {
  getHeaderSearchState,
  type HeaderSearchState,
} from "./header-search-state";

/**
 * ヘッダーの検索バー。送信先は議案一覧（/bills?q=...）。
 *
 * フォームの GET 送信だけで動くので、JavaScript が読み込まれる前でも検索できる。
 * 一覧を見ているときは今の検索語と絞り込みを引き継ぐ（getHeaderSearchState）。
 *
 * useSearchParams は静的に描画するページでは Suspense の内側でしか使えないので、
 * 読み込み中は空のフォームを出しておく。
 */
export function HeaderSearch() {
  return (
    <Suspense fallback={<SearchForm query="" hiddenFields={[]} />}>
      <SearchFormWithParams />
    </Suspense>
  );
}

function SearchFormWithParams() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const state = getHeaderSearchState(
    pathname,
    Object.fromEntries(searchParams.entries())
  );

  // 検索語が変わったら入力欄を作り直して、新しい語を初期値にする。
  return <SearchForm key={state.query} {...state} />;
}

function SearchForm({ query, hiddenFields }: HeaderSearchState) {
  const inputId = useId();

  return (
    <form
      action={routes.billsList()}
      role="search"
      className="flex h-10 w-full overflow-hidden rounded-md bg-white focus-within:ring-[3px] focus-within:ring-brand-accent"
    >
      <label htmlFor={inputId} className="sr-only">
        議案を検索
      </label>
      <input
        id={inputId}
        type="search"
        name="q"
        defaultValue={query}
        placeholder="議案名やキーワードで探す"
        enterKeyHint="search"
        className="min-w-0 flex-1 bg-transparent px-3 text-[15px] text-mirai-text outline-none placeholder:text-mirai-text-muted"
      />
      {hiddenFields.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {/*
        フォーム全体の枠（focus-within）は入力欄と共通なので、ボタン自体にも
        フォーカスの印を付ける。入力欄からボタンへ Tab で移ったことが分かるよう、
        地の色を変え、内側にチャコールの枠を描く。
      */}
      <Button
        type="submit"
        aria-label="検索する"
        className="h-10 shrink-0 rounded-none border-0 px-4 shadow-none focus-visible:bg-brand-accent-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-on-accent focus-visible:ring-offset-0"
      >
        <Search className="size-5" aria-hidden />
      </Button>
    </form>
  );
}
