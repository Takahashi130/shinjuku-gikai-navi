import type { ParticipantEligibility } from "@/lib/participation/resolve-eligibility";
import {
  type CitizenVoteSummary,
  isVoteChoice,
  VOTE_VERDICT_THRESHOLDS,
  type VoteTally,
  type VoteVerdict,
  type VoteVerdictThresholds,
} from "../types";

/** count_poll_responses_by_bill_ids が返す1行 */
export type PollResponseCountRow = {
  bill_id: string;
  choice: string | null;
  eligibility: ParticipantEligibility;
  cast_before_close: boolean;
  cnt: number | string;
};

export function emptyTally(): VoteTally {
  return { for: 0, against: 0, total: 0 };
}

export function emptySummary(): CitizenVoteSummary {
  return {
    beforeClose: emptyTally(),
    afterClose: emptyTally(),
    verifiedBeforeClose: emptyTally(),
  };
}

function addTo(tally: VoteTally, choice: "for" | "against", count: number) {
  tally[choice] += count;
  tally.total += count;
}

/**
 * 1議案ぶんの集計行を、締切の前・後と区民確認済みに分けてまとめる。
 * 選択肢にない値（将来の選択肢や壊れたデータ）は数えない。
 */
export function summarizeCitizenVotes(
  rows: readonly Omit<PollResponseCountRow, "bill_id">[]
): CitizenVoteSummary {
  const summary = emptySummary();
  for (const row of rows) {
    if (!isVoteChoice(row.choice)) continue;
    const count = Number(row.cnt);
    if (!Number.isFinite(count) || count <= 0) continue;
    if (row.cast_before_close) {
      addTo(summary.beforeClose, row.choice, count);
      if (row.eligibility === "verified_resident") {
        addTo(summary.verifiedBeforeClose, row.choice, count);
      }
    } else {
      addTo(summary.afterClose, row.choice, count);
    }
  }
  return summary;
}

/** 複数議案の集計行を、議案ごとにまとめる */
export function summarizeCitizenVotesByBill(
  rows: readonly PollResponseCountRow[]
): Map<string, CitizenVoteSummary> {
  const grouped = new Map<string, PollResponseCountRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.bill_id) ?? [];
    list.push(row);
    grouped.set(row.bill_id, list);
  }
  const result = new Map<string, CitizenVoteSummary>();
  for (const [billId, list] of grouped) {
    result.set(billId, summarizeCitizenVotes(list));
  }
  return result;
}

/**
 * 多数かどうかを決める。
 * - 票が minVotes 未満なら insufficient（少ない票で言い切らない）
 * - 賛成と反対の割合の差が tieMarginPoints ポイント以内なら close（拮抗）
 */
export function judgeVoteVerdict(
  tally: VoteTally,
  thresholds: VoteVerdictThresholds = VOTE_VERDICT_THRESHOLDS
): VoteVerdict {
  const total = tally.for + tally.against;
  if (total < thresholds.minVotes || total === 0) return "insufficient";
  // 割合の差（ポイント）を整数で比べる：|賛成-反対| / 合計 × 100 <= 差の上限
  if (
    Math.abs(tally.for - tally.against) * 100 <=
    thresholds.tieMarginPoints * total
  ) {
    return "close";
  }
  return tally.for > tally.against ? "for_majority" : "against_majority";
}

export const VOTE_VERDICT_LABELS: Record<VoteVerdict, string> = {
  for_majority: "賛成多数",
  against_majority: "反対多数",
  close: "拮抗",
  insufficient: "判定なし",
};

/**
 * 賛成・反対の割合（整数の%）。合計が100になるよう、賛成を四捨五入して反対を残りにする。
 * 票が無ければ両方 0。
 */
export function toVotePercentages(tally: VoteTally): {
  for: number;
  against: number;
} {
  const total = tally.for + tally.against;
  if (total === 0) return { for: 0, against: 0 };
  const forPercent = Math.round((tally.for / total) * 100);
  return { for: forPercent, against: 100 - forPercent };
}
