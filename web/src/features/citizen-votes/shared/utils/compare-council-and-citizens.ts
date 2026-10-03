import type { BillStatusEnum } from "@/features/bills/shared/types";
import {
  VOTE_VERDICT_THRESHOLDS,
  type VoteTally,
  type VoteVerdict,
  type VoteVerdictThresholds,
} from "../types";
import {
  judgeVoteVerdict,
  VOTE_VERDICT_LABELS,
} from "./summarize-citizen-votes";

export type CouncilDecision =
  | { decided: false }
  | { decided: true; outcome: "passed" | "rejected"; label: string };

/**
 * 議会の議決を、議案の種類に合わせた言葉にする（bills.status だけで判定）。
 * - 認定（決算）：認定／不認定
 * - 承認（専決処分など）：承認／不承認
 * - それ以外：可決／否決
 */
const DECISION_LABELS = {
  nintei: { passed: "認定", rejected: "不認定" },
  shonin: { passed: "承認", rejected: "不承認" },
  default: { passed: "可決", rejected: "否決" },
} as const;

export function resolveCouncilDecision(
  status: BillStatusEnum,
  billSlug: string | null
): CouncilDecision {
  if (status !== "enacted" && status !== "rejected") return { decided: false };
  const outcome = status === "enacted" ? "passed" : "rejected";
  const kind = /-(nintei|shonin)-\d+$/.exec(billSlug ?? "")?.[1];
  const labels =
    kind === "nintei" || kind === "shonin"
      ? DECISION_LABELS[kind]
      : DECISION_LABELS.default;
  return { decided: true, outcome, label: labels[outcome] };
}

/**
 * 議会と区民（締切前の票）の判断の関係
 * - match：同じ向き
 * - diverge：反対の向き（「ズレ」）
 * - close：区民の票が拮抗
 * - insufficient：区民の票が少なく判定しない
 * - undecided：議会がまだ議決していない
 */
export type CouncilCitizenRelation =
  | "match"
  | "diverge"
  | "close"
  | "insufficient"
  | "undecided";

export type CouncilCitizenComparison = {
  council: CouncilDecision;
  citizens: {
    verdict: VoteVerdict;
    label: string;
    total: number;
  };
  relation: CouncilCitizenRelation;
};

/**
 * 議会の議決と、締切（採決）前の区民の票を比べる。
 * 採決後の票は、議会が判断した時点の区民の意見ではないので比べない。
 */
export function compareCouncilAndCitizens(input: {
  councilStatus: BillStatusEnum;
  billSlug: string | null;
  beforeClose: VoteTally;
  thresholds?: VoteVerdictThresholds;
}): CouncilCitizenComparison {
  const council = resolveCouncilDecision(input.councilStatus, input.billSlug);
  const verdict = judgeVoteVerdict(
    input.beforeClose,
    input.thresholds ?? VOTE_VERDICT_THRESHOLDS
  );
  const citizens = {
    verdict,
    label: VOTE_VERDICT_LABELS[verdict],
    total: input.beforeClose.for + input.beforeClose.against,
  };

  let relation: CouncilCitizenRelation;
  if (!council.decided) relation = "undecided";
  else if (verdict === "insufficient") relation = "insufficient";
  else if (verdict === "close") relation = "close";
  else {
    const citizensPassed = verdict === "for_majority";
    relation =
      citizensPassed === (council.outcome === "passed") ? "match" : "diverge";
  }
  return { council, citizens, relation };
}
