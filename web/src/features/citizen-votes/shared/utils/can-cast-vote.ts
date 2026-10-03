import {
  isEligibleForAudience,
  type ParticipantEligibility,
  type PollAudience,
} from "@/lib/participation/resolve-eligibility";
import type { PollState } from "../types";

export type CastVoteDenyReason =
  | "personnel"
  | "not_applicable"
  | "upcoming"
  | "closed"
  | "bill_unpublished"
  | "audience";

export type CanCastVoteResult =
  | { ok: true }
  | { ok: false; reason: CastVoteDenyReason };

/**
 * 今この人が投票（選び直しを含む）できるかを決める。
 * 取り消しはこの判定を通さない（自分の票はいつでも消せる）。
 */
export function canCastVote(input: {
  pollState: PollState;
  billPublished: boolean;
  audience: PollAudience;
  eligibility: ParticipantEligibility;
}): CanCastVoteResult {
  const { pollState } = input;
  if (pollState.state === "not_applicable") {
    return {
      ok: false,
      reason: pollState.reason === "personnel" ? "personnel" : "not_applicable",
    };
  }
  if (!input.billPublished) return { ok: false, reason: "bill_unpublished" };
  if (pollState.state === "upcoming") return { ok: false, reason: "upcoming" };
  if (pollState.state === "closed") return { ok: false, reason: "closed" };
  if (!isEligibleForAudience(input.audience, input.eligibility)) {
    return { ok: false, reason: "audience" };
  }
  return { ok: true };
}

/** 投票できない理由を、画面に出す文にする */
export function castVoteDenyMessage(reason: CastVoteDenyReason): string {
  switch (reason) {
    case "personnel":
      return "人事案件は投票の対象外です。";
    case "not_applicable":
      return "この議案は投票の対象外です。";
    case "upcoming":
      return "まだ投票の受付が始まっていません。";
    case "closed":
      return "投票の受付は終了しました。";
    case "bill_unpublished":
      return "公開前の議案には投票できません。";
    case "audience":
      return "この投票は、区民の確認が済んだ方だけが参加できます。";
  }
}
