import type { Route } from "next";
import {
  billsListHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "@/features/bills/shared/utils/parse-bills-list-params";
import { routes } from "@/lib/routes";
import type { DietSession } from "../types";
import { calculateSessionProgress, formatDaysLeft } from "./session-progress";

/** ヘッダーの下の全幅のお知らせ帯に出すもの。 */
export type SessionNotice = {
  /** 開会中か、閉会中（直近の会期を出す）か。 */
  status: "open" | "closed";
  /** 帯の文。 */
  text: string;
  /** 帯の末尾のリンク。 */
  link: { label: string; href: Route };
};

type SessionLike = Pick<
  DietSession,
  "name" | "slug" | "start_date" | "end_date"
>;

/**
 * お知らせ帯の中身を、いまの会期（開会中）と直近に閉会した会期から決める。
 *
 * - 開会中：「令和8年第3回定例会が開会中です（10月15日閉会予定・あと11日）」
 * - 閉会中：「新宿区議会は閉会中です。直近の会期は令和8年第2回定例会（6月19日閉会）」
 * - どちらも無い：帯を出さない（null）
 *
 * now は日本時刻の壁時計を持つ Date を渡す（getJapanTime）。
 */
export function buildSessionNotice(
  current: SessionLike | null,
  latestClosed: SessionLike | null,
  now: Date
): SessionNotice | null {
  if (current) {
    const { daysLeft } = calculateSessionProgress(current, now);
    const remaining =
      daysLeft > 0 ? `あと${Math.floor(daysLeft)}日` : "本日閉会予定";
    const closing = formatMonthDay(current.end_date);
    return {
      status: "open",
      text: `${current.name}が開会中です（${closing ? `${closing}閉会予定・` : ""}${remaining}）`,
      link: {
        label: "この会期の議案を見る",
        href: current.slug
          ? (routes.kokkaiSessionBills(current.slug) as Route)
          : billsListHref(DEFAULT_BILLS_LIST_PARAMS, {
              status: "deliberating",
            }),
      },
    };
  }

  if (latestClosed?.slug) {
    const closed = formatMonthDay(latestClosed.end_date);
    return {
      status: "closed",
      text: `新宿区議会は閉会中です。直近の会期は${latestClosed.name}${closed ? `（${closed}閉会）` : ""}`,
      link: {
        label: "この会期の議案を見る",
        href: routes.kokkaiSessionBills(latestClosed.slug) as Route,
      },
    };
  }

  return null;
}

/** `2026-10-15` → `10月15日`。形が違えば空文字。 */
export function formatMonthDay(date: string): string {
  const matched = /^\d{4}-(\d{2})-(\d{2})$/.exec(date);
  if (!matched) return "";
  return `${Number(matched[1])}月${Number(matched[2])}日`;
}

/**
 * 開会中の会期の短い一言（例：「令和8年第3回定例会・閉会まであと11日」）。
 * トップの数字のカードの補足に使う。
 */
export function formatOpenSessionNote(
  session: Pick<DietSession, "name" | "start_date" | "end_date">,
  now: Date
): string {
  const { daysLeft } = calculateSessionProgress(session, now);
  return `${session.name}・${formatDaysLeft(daysLeft)}`;
}

/**
 * 審議中の議案の会期が、まだ開いているときの一言
 * （例：「令和8年第3回定例会は10月15日に閉会予定です。」）。
 *
 * 会期が終わっている（継続審査で残っている）ときは、閉会予定と書くと誤りに
 * なるので null を返す。now は日本時刻の壁時計を持つ Date を渡す。
 */
export function formatPendingSessionNote(
  session: Pick<DietSession, "name" | "end_date">,
  now: Date
): string | null {
  const closing = formatMonthDay(session.end_date);
  if (!closing) return null;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (session.end_date < today) return null;
  return `${session.name}は${closing}に閉会予定です。`;
}
