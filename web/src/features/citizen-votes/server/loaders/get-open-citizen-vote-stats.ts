import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  type OpenVoteStats,
  summarizeOpenVotes,
} from "../../shared/utils/summarize-open-votes";
import { findDecisionPollsClosingAfter } from "../repositories/citizen-vote-repository";
import { isCitizenVotingEnabled } from "../utils/is-citizen-voting-enabled";

const HOUR_MS = 60 * 60 * 1000;

/**
 * 締切が sinceIso より後の回を60秒キャッシュする。sinceIso は1時間ごとに
 * 区切った時刻にして、キャッシュのキーが毎回変わらないようにする。
 */
const getCachedCandidates = unstable_cache(
  async (sinceIso: string) => findDecisionPollsClosingAfter(sinceIso),
  ["citizen-votes-open-candidates"],
  {
    revalidate: 60,
    tags: [CACHE_TAGS.CITIZEN_VOTES, CACHE_TAGS.BILLS],
  }
);

/**
 * トップのヒーローに出す「区民投票を受付中の議案」の数（締切前のものだけ）。
 * 受付中かどうかは、キャッシュの外で現在時刻と比べて決める。
 *
 * 投票の受付を止めている（PARTICIPATION_HASH_SECRET が無い）ときは null を
 * 返し、数のカードを出さない（押した先の議案ページで投票できないため）。
 */
export async function getOpenCitizenVoteStats(): Promise<OpenVoteStats | null> {
  if (!isCitizenVotingEnabled()) return null;
  const now = new Date();
  const sinceIso = new Date(
    Math.floor(now.getTime() / HOUR_MS) * HOUR_MS
  ).toISOString();
  const candidates = await getCachedCandidates(sinceIso);
  return summarizeOpenVotes(candidates, now);
}
