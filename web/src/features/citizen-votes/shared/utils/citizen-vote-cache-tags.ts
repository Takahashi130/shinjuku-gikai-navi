import { CACHE_TAGS } from "@/lib/cache-tags";

/**
 * 1つの議案の票の集計のキャッシュのタグ。投票・取り消しのあとに、その議案の
 * 集計だけを消すのに使う（ほかの議案のキャッシュは残す）。
 */
export function citizenVoteSummaryTag(billId: string): string {
  return `${CACHE_TAGS.CITIZEN_VOTES}:summary:${billId}`;
}
