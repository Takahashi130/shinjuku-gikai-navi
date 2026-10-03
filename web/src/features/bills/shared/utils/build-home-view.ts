import type { BillListItem, BillTag } from "../types";
import {
  type BillStatusGroup,
  countByStatusGroup,
  toBillStatusGroup,
} from "./bill-status-group";
import { sortBills } from "./sort-bills";

/** トップに並べる議案の最小限の形。 */
type HomeBill = Pick<
  BillListItem,
  | "id"
  | "status"
  | "submitted_date"
  | "updated_at"
  | "tags"
  | "is_featured"
  | "hasPublicInterview"
>;

/** 「テーマで探す」のチップ1つ分。 */
export type HomeThemeChip = BillTag & {
  /** そのテーマの議案の数。 */
  count: number;
};

/** トップページに出すもの一式。 */
export type HomeView<T> = {
  /** 掲載している議案の数。 */
  totalCount: number;
  /** ステータスごとの件数（全議案）。 */
  statusCounts: Record<BillStatusGroup, number>;
  /** 会派の賛否が分かれた議案（is_featured）の件数。 */
  splitCount: number;
  /** AIインタビューを受け付けている議案の件数。 */
  interviewOpenCount: number;
  /** データの最終更新日時（議案の updated_at のうち最も新しいもの）。 */
  lastUpdatedAt: string | null;
  /** 掲載している議案のうち、最も古い提出日の年（西暦）。 */
  earliestYear: number | null;
  /**
   * 大きめのカードで並べる議案。審議中の議案があればそれ（閉会中などで
   * 無ければ、最近議決された議案）を、提出日が新しい順に最大 featuredLimit 件。
   */
  featured: { kind: "deliberating" | "recent"; bills: T[] };
  /**
   * 「区民の意思 vs 議会の議決」の例にする議案の候補。会派の賛否が分かれ、
   * 議決まで済んだ議案を新しい順に。解説から会派の賛否が読めないものも
   * あるので、呼び出し側が先頭から順に確かめる。
   */
  comparisonCandidates: T[];
  /** テーマのチップ。テーマの並び順のまま、議案の無いテーマは除く。 */
  themeChips: HomeThemeChip[];
};

export const HOME_FEATURED_LIMIT = 6;
export const HOME_COMPARISON_CANDIDATES = 3;

/**
 * トップページに何を載せるかを決める純粋関数。
 *
 * 議案一覧（/bills）と同じ全件の軽い議案から作るので、トップの件数と一覧の
 * 件数が食い違わない。並びは提出日が新しい順（一覧の既定と同じ）。
 */
export function buildHomeView<T extends HomeBill>(
  bills: readonly T[],
  themes: readonly BillTag[],
  {
    featuredLimit = HOME_FEATURED_LIMIT,
    comparisonCandidates = HOME_COMPARISON_CANDIDATES,
  }: { featuredLimit?: number; comparisonCandidates?: number } = {}
): HomeView<T> {
  const newest = sortBills(bills, "new");
  const isDecided = (bill: T) => {
    const group = toBillStatusGroup(bill.status);
    return group === "enacted" || group === "rejected";
  };

  const deliberating = newest.filter(
    (bill) => toBillStatusGroup(bill.status) === "deliberating"
  );
  const featured =
    deliberating.length > 0
      ? {
          kind: "deliberating" as const,
          bills: deliberating.slice(0, featuredLimit),
        }
      : {
          kind: "recent" as const,
          bills: newest.filter(isDecided).slice(0, featuredLimit),
        };

  const themeChips = themes.flatMap((theme) => {
    const count = bills.filter((bill) =>
      bill.tags.some((tag) => tag.id === theme.id)
    ).length;
    return count > 0 ? [{ id: theme.id, label: theme.label, count }] : [];
  });

  return {
    totalCount: bills.length,
    statusCounts: countByStatusGroup(bills),
    splitCount: bills.filter((bill) => bill.is_featured === true).length,
    interviewOpenCount: bills.filter((bill) => bill.hasPublicInterview).length,
    lastUpdatedAt: latestTimestamp(bills.map((bill) => bill.updated_at)),
    earliestYear: earliestYear(bills.map((bill) => bill.submitted_date)),
    featured,
    comparisonCandidates: newest
      .filter((bill) => bill.is_featured === true && isDecided(bill))
      .slice(0, comparisonCandidates),
    themeChips,
  };
}

/** トップの「審議中の議案」（無ければ「最近議決された議案」）の見出しと説明。 */
export type FeaturedSectionCopy = {
  title: string;
  description: string;
};

/**
 * 大きめのカードの並びの見出しと説明を決める純粋関数。
 *
 * 審議中の議案が無いときに「閉会中」と書くかどうかは、会期が開いているか
 * （sessionOpen。getCurrentDietSession の結果）で決める。開会直後で議案を
 * まだ取り込んでいないときなどは、会期が開いていても審議中の議案が0件になる。
 * そこで「閉会中」と書くと、お知らせ帯（「開会中です」）と食い違う。
 */
export function describeFeaturedSection(
  kind: HomeView<unknown>["featured"]["kind"],
  deliberatingCount: number,
  sessionOpen: boolean
): FeaturedSectionCopy {
  if (kind === "deliberating") {
    return {
      title: "審議中の議案",
      description: `いま${deliberatingCount}件が審議中です。議決の前に中身を確かめておきましょう。`,
    };
  }
  return {
    title: "最近議決された議案",
    description: sessionOpen
      ? "審議中の議案はまだ掲載していません。最近議決された議案です。"
      : "新宿区議会はいま閉会中です。最近議決された議案です。",
  };
}

/** 日時の文字列のうち最も新しいもの。読めない値は無視し、無ければ null。 */
function latestTimestamp(values: readonly string[]): string | null {
  let latest: { value: string; time: number } | null = null;
  for (const value of values) {
    const time = Date.parse(value);
    if (Number.isNaN(time)) continue;
    if (!latest || time > latest.time) latest = { value, time };
  }
  return latest?.value ?? null;
}

/** `YYYY-MM-DD…` の年のうち最も古いもの。提出日の無い議案は数えない。 */
function earliestYear(values: readonly (string | null)[]): number | null {
  let earliest: number | null = null;
  for (const value of values) {
    const matched = value ? /^(\d{4})-\d{2}-\d{2}/.exec(value) : null;
    if (!matched) continue;
    const year = Number(matched[1]);
    if (earliest === null || year < earliest) earliest = year;
  }
  return earliest;
}
