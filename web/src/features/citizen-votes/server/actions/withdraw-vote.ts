"use server";

import { revalidateTag } from "next/cache";
import type { VoteActionResult } from "../../shared/types";
import { citizenVoteSummaryTag } from "../../shared/utils/citizen-vote-cache-tags";
import { withdrawDecisionVote } from "../services/vote-service";

/**
 * 本人の票を取り消す（削除する）。成功したら、その議案の集計のキャッシュを
 * 消す（castVote と同じ）。
 */
export async function withdrawVote(billId: string): Promise<VoteActionResult> {
  const result = await withdrawDecisionVote({ billId });
  if (result.ok) revalidateTag(citizenVoteSummaryTag(billId));
  return result;
}
