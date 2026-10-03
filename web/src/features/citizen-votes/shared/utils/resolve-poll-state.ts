import { isPersonnelBill } from "@mirai-gikai/shared/bill-explainer/explainer-readiness";
import type { DecisionPoll, PollState } from "../types";

function toTime(iso: string | null): number | null {
  if (iso === null) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * 投票の回が今どの状態かを決める。
 *
 * - 人事案件（同意・諮問・候補者の推薦）は投票の対象外（回があっても受け付けない）
 * - 回が無い・運営が非表示にした回も対象外
 * - 締切（本会議の採決予定）より前は open。後は accepts_after_close に従う
 *
 * キャッシュの外で、現在時刻と比べて決める。
 */
export function resolvePollState(input: {
  poll: DecisionPoll | null;
  billSlug: string | null;
  /** 議案名（人事案件を見分ける。isPersonnelBill） */
  billName: string | null;
  now: Date;
}): PollState {
  const { poll, billSlug, billName, now } = input;
  if (isPersonnelBill({ slug: billSlug, name: billName })) {
    return { state: "not_applicable", reason: "personnel" };
  }
  if (!poll) return { state: "not_applicable", reason: "no_poll" };
  if (poll.isHidden) return { state: "not_applicable", reason: "hidden" };

  const nowTime = now.getTime();
  const opensAt = toTime(poll.opensAt);
  if (opensAt !== null && nowTime < opensAt) {
    return { state: "upcoming", opensAt: poll.opensAt };
  }

  const closesAt = toTime(poll.closesAt);
  if (closesAt === null || poll.closesAt === null) {
    return { state: "open", closesAt: null };
  }
  if (nowTime < closesAt) return { state: "open", closesAt: poll.closesAt };
  if (poll.acceptsAfterClose) {
    return { state: "open_after_close", closesAt: poll.closesAt };
  }
  return { state: "closed", closesAt: poll.closesAt };
}

/**
 * 今投票すると「締切前の票」になるか。
 * DB の集計（count_poll_responses_by_bill_ids）と同じく、
 * 締切が無いか、投票時刻が締切より前なら締切前とする。
 */
export function isBeforeClose(closesAt: string | null, at: Date): boolean {
  const closes = toTime(closesAt);
  return closes === null || at.getTime() < closes;
}

/** 締切を過ぎたか（受け付けているかどうかは問わない） */
export function isPastClose(state: PollState): boolean {
  return state.state === "open_after_close" || state.state === "closed";
}

/**
 * ほかの人の結果を見せてよいか。
 * 本人が投票した後か、締切の後だけ見せる（先に結果を見て流されないように）。
 */
export function shouldRevealResults(input: {
  pollState: PollState;
  hasVoted: boolean;
}): boolean {
  if (input.pollState.state === "not_applicable") return false;
  if (input.pollState.state === "upcoming") return false;
  return input.hasVoted || isPastClose(input.pollState);
}
