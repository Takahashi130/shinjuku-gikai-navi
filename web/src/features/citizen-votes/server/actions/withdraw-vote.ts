"use server";

import type { VoteActionResult } from "../../shared/types";
import { withdrawDecisionVote } from "../services/vote-service";

/** 本人の票を取り消す（削除する） */
export async function withdrawVote(billId: string): Promise<VoteActionResult> {
  return withdrawDecisionVote({ billId });
}
