"use server";

import { revalidateTag } from "next/cache";
import type { VoteActionResult, VoteChoice } from "../../shared/types";
import { citizenVoteSummaryTag } from "../../shared/utils/citizen-vote-cache-tags";
import { castDecisionVote } from "../services/vote-service";

/**
 * 議案に賛成・反対の票を入れる（選び直しを含む）。
 *
 * クライアントは、ボタンを押したときに匿名ログイン（ensureAnonymousSupabaseUser）を
 * 済ませてから呼ぶ。引数はブラウザから来る値なので、サービス側で形を確かめる。
 *
 * 成功したら、その議案の集計のキャッシュを消す。Server Action の中で消すと、
 * ブラウザ側のページのキャッシュ（戻るボタンで出る前の画面）も消える。
 */
export async function castVote(
  billId: string,
  choice: VoteChoice,
  options?: { readExplainer?: boolean }
): Promise<VoteActionResult> {
  const result = await castDecisionVote({
    billId,
    choice,
    readExplainer: options?.readExplainer,
  });
  if (result.ok) revalidateTag(citizenVoteSummaryTag(billId));
  return result;
}
