import "server-only";

import { unstable_rethrow } from "next/navigation";
import { getChatSupabaseUser } from "@/features/chat/server/utils/supabase-server";
import {
  type BillCitizenVotesView,
  isVoteChoice,
  type MyVote,
} from "../../shared/types";
import {
  isBeforeClose,
  resolvePollState,
  shouldRevealResults,
} from "../../shared/utils/resolve-poll-state";
import { findUserPollResponse } from "../repositories/citizen-vote-repository";
import { isCitizenVotingEnabled } from "../utils/is-citizen-voting-enabled";
import { getCachedPollContext, getCachedSummary } from "./citizen-vote-cache";

/** ログイン中（匿名を含む）なら本人の ID。ページを見ただけではサインインしない */
async function getViewerId(): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await getChatSupabaseUser();
    return user?.id ?? null;
  } catch (e) {
    // Next.js の動的レンダリングの合図は投げ直して、ページを動的にする
    unstable_rethrow(e);
    return null;
  }
}

/**
 * 議案ページの投票カードに渡すデータを作る。議案が無ければ null。
 *
 * - 状態（受付中・締切後など）と、結果を見せてよいかは、キャッシュの外で現在時刻と比べて決める
 * - ほかの人の結果は、本人が投票した後か締切後だけ返す（それ以外は null で、ブラウザにも送らない）
 * - 本人の票は、受付を止めていても・回が非表示でも返す（取り消しのボタンを出すため）
 */
export async function getBillCitizenVotes(
  billId: string
): Promise<BillCitizenVotesView | null> {
  const context = await getCachedPollContext(billId);
  if (!context) return null;
  const { bill, poll } = context;

  const now = new Date();
  const pollState = resolvePollState({
    poll,
    billSlug: bill.slug,
    billName: bill.name,
    now,
  });
  const votingEnabled = isCitizenVotingEnabled();

  // 本人の票は、回が非表示・対象外になっていても読む（いつでも取り消せるようにする）
  let myVote: MyVote | null = null;
  if (poll) {
    const viewerId = await getViewerId();
    if (viewerId) {
      const response = await findUserPollResponse(poll.id, viewerId);
      if (response && isVoteChoice(response.choice)) {
        myVote = {
          choice: response.choice,
          castBeforeClose: isBeforeClose(
            poll.closesAt,
            new Date(response.respondedAt)
          ),
        };
      }
    }
  }

  const reveal = shouldRevealResults({ pollState, hasVoted: myVote !== null });
  const summary = reveal ? await getCachedSummary(bill.id) : null;

  return {
    billId: bill.id,
    billSlug: bill.slug,
    councilStatus: bill.status,
    pollState,
    billPublished: bill.publishStatus === "published",
    myVote,
    summary,
    votingEnabled,
  };
}
