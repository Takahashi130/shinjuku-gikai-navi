import type { DecisionPoll } from "../types";
import { resolvePollState } from "./resolve-poll-state";

/** 受付中かどうかを確かめる「議決」の回と、その議案 */
export type OpenVoteCandidate = {
  poll: DecisionPoll;
  bill: {
    id: string;
    slug: string | null;
    name: string;
    publishStatus: string;
    dietSessionId: string | null;
  };
};

/** トップに出す、区民投票の受付状況 */
export type OpenVoteStats = {
  /** 締切（採決予定）の前で、投票を受け付けている議案の数 */
  count: number;
  /** そのうち、いちばん早い締切。締切未定の回しか無ければ null */
  earliestClosesAt: string | null;
  /** 受け付けている議案の会期（重複なし・出てきた順） */
  dietSessionIds: string[];
};

/**
 * 「区民投票を受付中の議案」を数える。
 *
 * 数えるのは、公開中の議案で、締切（本会議の採決予定）の前の回だけ。採決後の票
 * として受け付けている回（過去の議案のほとんど）は数えない。人事案件・非表示の
 * 回・受付前の回も数えない（resolvePollState で判定する）。
 */
export function summarizeOpenVotes(
  candidates: readonly OpenVoteCandidate[],
  now: Date
): OpenVoteStats {
  const billIds = new Set<string>();
  const dietSessionIds: string[] = [];
  let earliest: { iso: string; time: number } | null = null;

  for (const { poll, bill } of candidates) {
    if (bill.publishStatus !== "published" || billIds.has(bill.id)) continue;
    const state = resolvePollState({
      poll,
      billSlug: bill.slug,
      billName: bill.name,
      now,
    });
    if (state.state !== "open") continue;

    billIds.add(bill.id);
    if (bill.dietSessionId && !dietSessionIds.includes(bill.dietSessionId)) {
      dietSessionIds.push(bill.dietSessionId);
    }
    if (state.closesAt) {
      const time = new Date(state.closesAt).getTime();
      if (earliest === null || time < earliest.time) {
        earliest = { iso: state.closesAt, time };
      }
    }
  }

  return {
    count: billIds.size,
    earliestClosesAt: earliest?.iso ?? null,
    dietSessionIds,
  };
}
