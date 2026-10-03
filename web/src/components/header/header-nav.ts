import { ChartLine, IdCard, type LucideIcon, Video, Vote } from "lucide-react";
import type { Route } from "next";
import { upcomingFeatureHref } from "@/features/upcoming/shared/utils/upcoming-features";
import { routes } from "@/lib/routes";

export type HeaderTabId = "bills" | "live" | "impact" | "members";

/** ヘッダーのハッシュタグ型のタブ1つ分。 */
export type HeaderTab = {
  id: HeaderTabId;
  /**
   * タブの文言。先頭の「#」は含めない（ヘッダーが飾りとして足し、読み上げでは
   * 「シャープ」と読ませない）。
   */
  label: string;
  href: Route;
  /** まだ無い機能。タブに「準備中」と添え、行き先は説明ページにする。 */
  comingSoon: boolean;
  icon: LucideIcon;
};

/**
 * ヘッダーのタブ。フッターも同じものを並べる。
 *
 * 「議案・区民投票」はトップ（議案）へ。ほかはまだ無い機能なので、準備中の
 * 説明ページ（/upcoming/[feature]）へ送る。
 *
 * 機能ができたら、そのタブのオブジェクトだけを書き換える。例：議員カルテ
 * （別ブランチで /members を作っている）は
 *
 *   { id: "members", label: "議員カルテ・政務活動費",
 *     href: routes.membersList(), comingSoon: false, icon: IdCard }
 *
 * にする。説明ページ（/upcoming/members）も要らなくなったら、
 * features/upcoming/shared/utils/upcoming-features.ts の UPCOMING_FEATURE_IDS・
 * UPCOMING_FEATURES と upcoming-feature-icons.ts から members を消す。
 *
 * 「住民投票」は法律・条例にもとづく正式な投票を指す語なので使わず、
 * このサービスでの意思表示は「区民投票」と呼ぶ。
 */
export const HEADER_TABS: readonly HeaderTab[] = [
  {
    id: "bills",
    label: "議案・区民投票",
    href: routes.home(),
    comingSoon: false,
    icon: Vote,
  },
  {
    id: "live",
    label: "議会LIVE中継",
    href: upcomingFeatureHref("live"),
    comingSoon: true,
    icon: Video,
  },
  {
    id: "impact",
    label: "5年間効果測定",
    href: upcomingFeatureHref("impact"),
    comingSoon: true,
    icon: ChartLine,
  },
  {
    id: "members",
    label: "議員カルテ・政務活動費",
    href: upcomingFeatureHref("members"),
    comingSoon: true,
    icon: IdCard,
  },
];

/** 議案まわりのページ（トップ・一覧・詳細・会期別一覧・プレビュー）。 */
const BILLS_TAB_PATTERNS: readonly RegExp[] = [
  /^\/$/,
  /^\/bills(\/|$)/,
  /^\/kokkai\//,
  /^\/preview\/bills\//,
];

/**
 * そのタブの区分のページか。議案のタブはトップ（/）を行き先にしているが、
 * 一覧・詳細・会期別一覧も同じ区分にする。ほかのタブは行き先とその下の
 * ページ（例：/members と /members/[id]）。
 */
function isInTabSection(tab: HeaderTab, pathname: string): boolean {
  if (tab.id === "bills") {
    return BILLS_TAB_PATTERNS.some((pattern) => pattern.test(pathname));
  }
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

/**
 * いま開いているページに対応するタブ。どのタブにも当たらないページ
 * （利用規約など）は null にして、どれも選択中にしない。
 */
export function getActiveHeaderTabId(pathname: string): HeaderTabId | null {
  return HEADER_TABS.find((tab) => isInTabSection(tab, pathname))?.id ?? null;
}

/**
 * タブのリンクに付ける aria-current。
 *
 * - タブの行き先そのもののページ："page"（「現在のページ」と読み上げる）
 * - 同じ区分のほかのページ（例：議案のタブで /bills を開いているとき）："true"
 *   （行き先はトップなので「現在のページ」とは言わない。パンくずの末尾の
 *   aria-current="page" と二重にもならない）
 * - それ以外：付けない
 */
export function getHeaderTabAriaCurrent(
  tab: HeaderTab,
  pathname: string
): "page" | "true" | undefined {
  if (pathname === tab.href) return "page";
  return isInTabSection(tab, pathname) ? "true" : undefined;
}
