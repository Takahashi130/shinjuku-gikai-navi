import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { citizenVoteSummaryTag } from "../../shared/utils/citizen-vote-cache-tags";
import { summarizeCitizenVotes } from "../../shared/utils/summarize-citizen-votes";
import {
  countDecisionResponsesByBillIds,
  findDecisionPollContext,
} from "../repositories/citizen-vote-repository";

/** 回の設定（締切など）は変わることが少ないので5分。取り込み・同期で消える */
export const getCachedPollContext = unstable_cache(
  async (billId: string) => findDecisionPollContext(billId),
  ["citizen-votes-poll-context"],
  { revalidate: 300, tags: [CACHE_TAGS.CITIZEN_VOTES, CACHE_TAGS.BILLS] }
);

/**
 * 票の集計は60秒だけ持つ（本人の票はキャッシュしない）。
 *
 * 議案ごとのタグ（citizenVoteSummaryTag）を付け、投票・取り消しが成功したら
 * その議案の分だけ消す（server/actions）。投票の直後に再読み込みしても、
 * 前の数や「まだ票がありません」が出ないようにする。
 */
export function getCachedSummary(billId: string) {
  return unstable_cache(
    async () =>
      summarizeCitizenVotes(await countDecisionResponsesByBillIds([billId])),
    ["citizen-votes-summary", billId],
    {
      revalidate: 60,
      tags: [CACHE_TAGS.CITIZEN_VOTES, citizenVoteSummaryTag(billId)],
    }
  )();
}
