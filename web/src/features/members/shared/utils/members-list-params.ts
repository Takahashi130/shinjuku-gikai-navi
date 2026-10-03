import type { Route } from "next";
import { routes } from "@/lib/routes";
import { isMemberSortOrder, type MemberSortOrder } from "./sort-members";

/** 議員の一覧（/members）の状態。すべて URL に載せる。 */
export type MembersListParams = {
  /** 会派の slug。null は「すべての会派」。 */
  faction: string | null;
  sort: MemberSortOrder;
};

/** ページ・コンポーネント間で共有する searchParams の形。 */
export type MembersListSearchParams = {
  faction?: string | string[];
  sort?: string | string[];
};

export const DEFAULT_MEMBERS_LIST_PARAMS: Readonly<MembersListParams> = {
  faction: null,
  sort: "seat",
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * URL パラメータを一覧の状態に正規化する純粋関数。不正な値は既定に倒す。
 * 会派の slug があるかどうかは、会派の一覧を持つ側（buildMembersListView）で確かめる。
 */
export function parseMembersListParams(
  searchParams: MembersListSearchParams
): MembersListParams {
  const sort = firstValue(searchParams.sort);
  const faction = firstValue(searchParams.faction)?.trim();
  return {
    faction: faction || null,
    sort: isMemberSortOrder(sort) ? sort : DEFAULT_MEMBERS_LIST_PARAMS.sort,
  };
}

/**
 * 今の状態から1つだけ差し替えた一覧へのリンク。既定値は URL に出さない。
 * 議案ページの「会派ごとの賛否」からも、会派で絞った一覧を開くのに使う。
 */
export function membersListHref(
  current: MembersListParams = DEFAULT_MEMBERS_LIST_PARAMS,
  patch: Partial<MembersListParams> = {}
): Route {
  const next = { ...current, ...patch };
  const query = new URLSearchParams();
  if (next.faction) query.set("faction", next.faction);
  if (next.sort !== DEFAULT_MEMBERS_LIST_PARAMS.sort) {
    query.set("sort", next.sort);
  }
  const search = query.toString();
  return `${routes.membersList()}${search ? `?${search}` : ""}` as Route;
}
