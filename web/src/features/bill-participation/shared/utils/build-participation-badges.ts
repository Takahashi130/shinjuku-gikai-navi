import type { BillStatusEnum } from "@/features/bills/shared/types";
import type {
  PollState,
  VoteTally,
} from "@/features/citizen-votes/shared/types";
import { compareCouncilAndCitizens } from "@/features/citizen-votes/shared/utils/compare-council-and-citizens";
import { formatRemaining } from "@/features/citizen-votes/shared/utils/format-vote-deadline";
import { isPastClose } from "@/features/citizen-votes/shared/utils/resolve-poll-state";
import type { ParticipationBadge } from "../types";

/**
 * 一覧のカードに出す印を決める。
 * - 解説あり：公開中の解説がある
 * - 投票受付中：締切（採決予定）の前で受け付けている（残りの日数を添える）
 * - 区民 ○○多数：締切の後だけ（締切前は、投票した人にしか結果を見せないため）
 *   議会が議決していて多数が分かれていれば diverges
 */
export function buildParticipationBadges(input: {
  explainerPublic: boolean;
  pollState: PollState;
  councilStatus: BillStatusEnum;
  billSlug: string | null;
  /** 締切前の票。集計が無ければ null */
  beforeClose: VoteTally | null;
  now: Date;
}): ParticipationBadge[] {
  const badges: ParticipationBadge[] = [];
  if (input.explainerPublic) {
    badges.push({ kind: "explainer", label: "解説あり" });
  }

  const { pollState } = input;
  if (pollState.state === "open") {
    badges.push({
      kind: "vote_open",
      label: "投票受付中",
      detail: pollState.closesAt
        ? formatRemaining(pollState.closesAt, input.now)
        : null,
    });
  }

  if (isPastClose(pollState) && input.beforeClose) {
    const comparison = compareCouncilAndCitizens({
      councilStatus: input.councilStatus,
      billSlug: input.billSlug,
      beforeClose: input.beforeClose,
    });
    const verdict = comparison.citizens.verdict;
    if (verdict !== "insufficient") {
      badges.push({
        kind: "citizens_result",
        label: `区民 ${comparison.citizens.label}`,
        diverges: comparison.relation === "diverge",
      });
    }
  }
  return badges;
}
