import type { Route } from "next";
import type { BillTag } from "@/features/bills/shared/types";
import {
  billsListHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "@/features/bills/shared/utils/parse-bills-list-params";
import {
  calculateSessionProgress,
  formatDaysLeft,
} from "@/features/diet-sessions/shared/utils/session-progress";
import {
  DEFAULT_MEMBERS_LIST_PARAMS,
  membersListHref,
} from "@/features/members/shared/utils/members-list-params";
import { routes } from "@/lib/routes";

/** ヘッダー・メニューに並べるリンク1つ分。 */
export type HeaderNavLink = {
  label: string;
  href: Route;
};

/** 議案一覧をよく使う条件で開くリンク。ヘッダーの帯と「すべて」メニューで使う。 */
export const BILL_FINDER_LINKS: readonly HeaderNavLink[] = [
  { label: "すべての議案", href: routes.billsList() },
  {
    label: "審議中の議案",
    href: billsListHref(DEFAULT_BILLS_LIST_PARAMS, { status: "deliberating" }),
  },
  {
    label: "賛否が分かれた議案",
    href: billsListHref(DEFAULT_BILLS_LIST_PARAMS, { splitOnly: true }),
  },
  {
    label: "可決された議案",
    href: billsListHref(DEFAULT_BILLS_LIST_PARAMS, { status: "enacted" }),
  },
  {
    label: "否決された議案",
    href: billsListHref(DEFAULT_BILLS_LIST_PARAMS, { status: "rejected" }),
  },
];

/**
 * 議員の一覧へのリンク。ヘッダーの帯・「すべて」メニュー・フッターで使う。
 * 並び順は議席番号順と五十音順だけ（ランキングは出さない）。
 */
export const MEMBER_FINDER_LINKS: readonly HeaderNavLink[] = [
  { label: "議員の一覧", href: routes.membersList() },
  {
    label: "議員を五十音順で見る",
    href: membersListHref(DEFAULT_MEMBERS_LIST_PARAMS, { sort: "kana" }),
  },
];

/** テーマ（タグ）で絞った議案一覧へのリンク。並びは渡したタグの順のまま。 */
export function buildThemeLinks(themes: readonly BillTag[]): HeaderNavLink[] {
  return themes.map((theme) => ({
    label: theme.label,
    href: billsListHref(DEFAULT_BILLS_LIST_PARAMS, { tagId: theme.id }),
  }));
}

/**
 * ヘッダー下段の帯に横並びにするリンク。
 *
 * 先頭に「議員の一覧」を置く（議案とは別の入り口なので、スマホで帯を横に
 * 送らなくても見えるようにする）。続けて審議の状況から探す2つ、テーマを並べる。
 * 「すべての議案」は検索バーと「すべて」メニューから行けるので帯には置かない。
 * 可決・否決は件数が多く帯が長くなるので「すべて」メニューに回す。
 */
export function buildHeaderBandLinks(
  themes: readonly BillTag[]
): HeaderNavLink[] {
  const [, deliberating, split] = BILL_FINDER_LINKS;
  const [members] = MEMBER_FINDER_LINKS;
  return [members, deliberating, split, ...buildThemeLinks(themes)];
}

/** 会期1つ分の最小限。DietSession からヘッダーに要るものだけを受け取る。 */
type SessionLike = {
  name: string;
  slug: string | null;
  start_date: string;
  end_date: string;
};

/** 会期別の議案一覧へのリンク。一覧ページは slug で開くので、slug の無い会期は除く。 */
export function buildSessionLinks(
  sessions: readonly SessionLike[]
): HeaderNavLink[] {
  return sessions.flatMap((session) =>
    session.slug
      ? [
          {
            label: session.name,
            href: routes.kokkaiSessionBills(session.slug) as Route,
          },
        ]
      : []
  );
}

/** ヘッダーのピル。幅に応じて言い方を短くする。 */
export type SessionPillLink = HeaderNavLink & {
  /** 中くらいの幅で出す言い方（例：「閉会まであと12日」）。 */
  daysLeftLabel: string;
  /** スマホで出す最も短い言い方（例：「あと12日」）。 */
  shortLabel: string;
};

/**
 * ヘッダー右端のピル（今の会期と閉会までの日数）。
 *
 * 会期中でなければ出さない（null）。会期の一覧ページへ送るが、slug が無い会期は
 * 審議中の議案の一覧に送る。label は読み上げにも使う完全な言い方。
 */
export function buildSessionPill(
  session: SessionLike | null,
  now: Date
): SessionPillLink | null {
  if (!session) return null;

  const { daysLeft } = calculateSessionProgress(session, now);
  const daysLeftLabel = formatDaysLeft(daysLeft);
  return {
    label: `${session.name}・${daysLeftLabel}`,
    daysLeftLabel,
    shortLabel: daysLeft > 0 ? `あと${Math.floor(daysLeft)}日` : "本日閉会",
    href: session.slug
      ? (routes.kokkaiSessionBills(session.slug) as Route)
      : billsListHref(DEFAULT_BILLS_LIST_PARAMS, { status: "deliberating" }),
  };
}
