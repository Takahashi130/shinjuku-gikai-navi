import type { Route } from "next";
import {
  DEFAULT_MEMBERS_LIST_PARAMS,
  membersListHref,
} from "./members-list-params";

/**
 * 議案ページの「会派ごとの賛否」に書かれた会派名から、その会派の議員の一覧
 * （/members?faction=…）へのリンクを引く。
 *
 * 会派名は年によって変わる（自由民主党新宿区議会議員団 → 自民・参政クラブ など）
 * ので、取り込み処理が作った名前の履歴（faction_names）から引く。今の会派だけを
 * リンクにする（解散した会派には今の議員がいない）。
 */

/**
 * 会派名を突き合わせ用のキーにする。取り込み処理（shinjuku-importer の
 * factionNameKey）と同じく、全角半角・空白・注記の記号（※、※1、（※1））をそろえる。
 */
export function factionNameKey(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/\(?※\s*\d*\)?/g, "")
    .replace(/\s+/g, "");
}

/** 会派名のキー → 会派の slug。 */
export type FactionMemberLinkLookup = Record<string, string>;

export function buildFactionMemberLinkLookup(
  names: readonly { name: string; slug: string; isCurrent: boolean }[]
): FactionMemberLinkLookup {
  const lookup: FactionMemberLinkLookup = {};
  for (const { name, slug, isCurrent } of names) {
    if (!isCurrent) continue;
    lookup[factionNameKey(name)] = slug;
  }
  return lookup;
}

/** 会派名に合う議員の一覧へのリンク。今の会派でなければ null。 */
export function findFactionMembersHref(
  lookup: FactionMemberLinkLookup,
  factionName: string
): Route | null {
  const slug = lookup[factionNameKey(factionName)];
  return slug
    ? membersListHref(DEFAULT_MEMBERS_LIST_PARAMS, { faction: slug })
    : null;
}
