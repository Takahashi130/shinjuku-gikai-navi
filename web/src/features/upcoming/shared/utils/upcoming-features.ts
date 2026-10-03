import type { Route } from "next";
import { EXTERNAL_LINKS } from "@/config/external-links";
import {
  billsListHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "@/features/bills/shared/utils/parse-bills-list-params";
import { routes } from "@/lib/routes";

/**
 * まだ無い機能の説明ページ（/upcoming/[feature]）の中身。
 *
 * 機能ができたら、まずヘッダーのタブ（components/header/header-nav.ts の
 * HEADER_TABS）のそのオブジェクトだけを本物のページに書き換える。説明ページも
 * 要らなくなったら、ここ（UPCOMING_FEATURE_IDS と UPCOMING_FEATURES）と
 * upcoming-feature-icons.ts からその id を消す。
 * 例：議員カルテは別ブランチで /members（routes.membersList()）を作っている。
 */
export const UPCOMING_FEATURE_IDS = ["live", "impact", "members"] as const;

export type UpcomingFeatureId = (typeof UPCOMING_FEATURE_IDS)[number];

export function isUpcomingFeatureId(
  value: unknown
): value is UpcomingFeatureId {
  return (
    typeof value === "string" &&
    (UPCOMING_FEATURE_IDS as readonly string[]).includes(value)
  );
}

/** 説明ページに添えるリンク。いま実在するページだけを載せる。 */
export type UpcomingFeatureLink =
  | { kind: "internal"; label: string; href: Route; note?: string }
  | { kind: "external"; label: string; href: string; note?: string };

export type UpcomingFeature = {
  id: UpcomingFeatureId;
  /** ページの見出し。 */
  title: string;
  /** 見出しの下の1文。 */
  lead: string;
  /** 予定していること。数字や結果は書かない（まだ無いので）。 */
  points: readonly string[];
  /** いまの代わりに見られるもの。 */
  links: readonly UpcomingFeatureLink[];
};

export const UPCOMING_FEATURES: Record<UpcomingFeatureId, UpcomingFeature> = {
  live: {
    id: "live",
    title: "議会LIVE中継",
    lead: "区議会の中継を見ながら、審議中の議案を確かめ、区民として意思を示せるようにする予定です。",
    points: [
      "中継で審議している議案の解説を、同じ画面で読めるようにする",
      "中継を見ながら、その議案に区民投票できるようにする",
    ],
    links: [
      {
        kind: "external",
        label: "区議会のインターネット中継（新宿区）",
        href: EXTERNAL_LINKS.SHINJUKU_GIKAI_STREAM,
        note: "本会議と予算・決算特別委員会を、生中継と録画で見られます。",
      },
      {
        kind: "internal",
        label: "審議中の議案を見る",
        href: billsListHref(DEFAULT_BILLS_LIST_PARAMS, {
          status: "deliberating",
        }),
      },
    ],
  },
  impact: {
    id: "impact",
    title: "5年間の効果測定",
    lead: "可決された予算や条例が、その後どうなったのかを5年間追いかける予定です。",
    points: [
      "可決された議案の、その後の結果を区の公開資料で確かめる",
      "議決のときの区民投票の結果と、その後の結果を並べて見られるようにする",
    ],
    links: [
      {
        kind: "internal",
        label: "可決された議案を見る",
        href: billsListHref(DEFAULT_BILLS_LIST_PARAMS, { status: "enacted" }),
      },
    ],
  },
  members: {
    id: "members",
    title: "議員カルテ・政務活動費",
    lead: "議員ごとのページを作り、議会での活動と政務活動費の使いみちを読みやすくまとめる予定です。",
    points: [
      "議員ごとに、所属する会派と、その会派の議案への賛否をまとめる",
      "政務活動費の収支を、区が公開している資料から整理する",
    ],
    links: [
      {
        kind: "internal",
        label: "会派の賛否が分かれた議案を見る",
        href: billsListHref(DEFAULT_BILLS_LIST_PARAMS, { splitOnly: true }),
      },
      {
        kind: "external",
        label: "新宿区議会（公式）",
        href: EXTERNAL_LINKS.SHINJUKU_GIKAI,
      },
    ],
  },
};

/** 説明ページの URL。 */
export function upcomingFeatureHref(id: UpcomingFeatureId): Route {
  return routes.upcoming(id) as Route;
}
