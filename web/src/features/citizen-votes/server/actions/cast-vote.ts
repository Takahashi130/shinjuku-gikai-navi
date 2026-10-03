"use server";

import type { VoteActionResult, VoteChoice } from "../../shared/types";
import { castDecisionVote } from "../services/vote-service";

/**
 * 議案に賛成・反対の票を入れる（選び直しを含む）。
 *
 * クライアントは、ボタンを押したときに匿名ログイン（ensureAnonymousSupabaseUser）を
 * 済ませてから呼ぶ。引数はブラウザから来る値なので、サービス側で形を確かめる。
 */
export async function castVote(
  billId: string,
  choice: VoteChoice,
  options?: { readExplainer?: boolean }
): Promise<VoteActionResult> {
  return castDecisionVote({
    billId,
    choice,
    readExplainer: options?.readExplainer,
  });
}
