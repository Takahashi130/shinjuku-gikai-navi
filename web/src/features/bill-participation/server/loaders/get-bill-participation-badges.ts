import "server-only";

import { isExplainerPublic } from "@mirai-gikai/shared/bill-explainer/explainer-readiness";
import { unstable_cache } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { findExplainerPublicationsByBillIds } from "@/features/bill-explainers/server/repositories/bill-explainer-repository";
import { toExplainerPublication } from "@/features/bill-explainers/shared/utils/resolve-explainer-view";
import {
  countDecisionResponsesByBillIds,
  findBillsForVoteByIds,
  findDecisionPollsByBillIds,
} from "@/features/citizen-votes/server/repositories/citizen-vote-repository";
import { resolvePollState } from "@/features/citizen-votes/shared/utils/resolve-poll-state";
import { summarizeCitizenVotesByBill } from "@/features/citizen-votes/shared/utils/summarize-citizen-votes";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { ParticipationBadgesByBillId } from "../../shared/types";
import { buildParticipationBadges } from "../../shared/utils/build-participation-badges";

/**
 * 印に要るデータをまとめて取る（議案 ID の並びをキーに60秒キャッシュ）。
 * 時刻で変わる判断（受付中か・解説を公開してよいか）はキャッシュの外でする。
 */
const getCachedBadgeSources = unstable_cache(
  async (sortedBillIds: string[]) => {
    const [bills, polls, explainers, counts] = await Promise.all([
      findBillsForVoteByIds(sortedBillIds),
      findDecisionPollsByBillIds(sortedBillIds),
      findExplainerPublicationsByBillIds(sortedBillIds),
      countDecisionResponsesByBillIds(sortedBillIds),
    ]);
    // unstable_cache は JSON で保存するので Map は配列にしておく
    return { bills, polls: [...polls.entries()], explainers, counts };
  },
  ["bill-participation-badges"],
  {
    revalidate: 60,
    tags: [
      CACHE_TAGS.BILL_EXPLAINERS,
      CACHE_TAGS.CITIZEN_VOTES,
      CACHE_TAGS.BILLS,
    ],
  }
);

/**
 * 一覧のカード用に、議案ごとの「解説あり」「投票受付中」「区民 ○○多数」の印を返す。
 * N+1 にならないよう、一覧に出す議案の ID をまとめて渡す。
 * 失敗しても一覧は止めず、印なし（空）にする。
 */
export async function getBillParticipationBadges(
  billIds: string[]
): Promise<ParticipationBadgesByBillId> {
  const result: ParticipationBadgesByBillId = {};
  const sortedIds = [...new Set(billIds)].sort();
  if (sortedIds.length === 0) return result;

  try {
    const sources = await getCachedBadgeSources(sortedIds);
    const polls = new Map(sources.polls);
    const explainers = new Map(
      sources.explainers.map((row) => [row.bill_id, row])
    );
    const summaries = summarizeCitizenVotesByBill(sources.counts);
    const now = new Date();

    for (const bill of sources.bills) {
      const explainerRow = explainers.get(bill.id);
      result[bill.id] = buildParticipationBadges({
        explainerPublic: isExplainerPublic(
          explainerRow ? toExplainerPublication(explainerRow) : null,
          now
        ),
        pollState: resolvePollState({
          poll: polls.get(bill.id) ?? null,
          billSlug: bill.slug,
          billName: bill.name,
          now,
        }),
        councilStatus: bill.status,
        billSlug: bill.slug,
        beforeClose: summaries.get(bill.id)?.beforeClose ?? null,
        now,
      });
    }
  } catch (error) {
    unstable_rethrow(error);
    console.error(
      "Failed to load participation badges:",
      error instanceof Error ? error.message : error
    );
  }
  return result;
}
