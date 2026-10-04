import "server-only";

import type { BillStatusEnum } from "@/features/bills/shared/types";
import type { CitizenVoteSummary, PollState } from "../../shared/types";
import {
  resolvePollState,
  shouldRevealResults,
} from "../../shared/utils/resolve-poll-state";
import { isCitizenVotingEnabled } from "../utils/is-citizen-voting-enabled";
import { getCachedPollContext, getCachedSummary } from "./citizen-vote-cache";

/** 本人の票を見ずに作る、議案の区民投票の様子（トップの比較カードなど） */
export type CitizenVoteSnapshot = {
  billId: string;
  billSlug: string | null;
  councilStatus: BillStatusEnum;
  pollState: PollState;
  /** 議案が公開済みか */
  billPublished: boolean;
  /** 新しい票を受け付けられる設定か（false は受付を止めている） */
  votingEnabled: boolean;
  /** 投票していない人にも見せてよい結果（締切の後だけ）。締切前は null */
  summary: CitizenVoteSummary | null;
};

/**
 * 議案の区民投票の受付状態と、だれにでも見せてよい結果を返す。議案が無ければ null。
 *
 * 本人の票は読まない（Cookie を読まないので、ページを見ただけでログインの確認は
 * 走らない）。そのため、ほかの人の結果は締切（採決予定）の後だけ返す。締切前の
 * 結果は、議案ページで本人が投票したあとにだけ見せる。
 */
export async function getCitizenVoteSnapshot(
  billId: string
): Promise<CitizenVoteSnapshot | null> {
  const context = await getCachedPollContext(billId);
  if (!context) return null;
  const { bill, poll } = context;

  const pollState = resolvePollState({
    poll,
    billSlug: bill.slug,
    billName: bill.name,
    now: new Date(),
  });
  const reveal = shouldRevealResults({ pollState, hasVoted: false });

  return {
    billId: bill.id,
    billSlug: bill.slug,
    councilStatus: bill.status,
    pollState,
    billPublished: bill.publishStatus === "published",
    votingEnabled: isCitizenVotingEnabled(),
    summary: reveal ? await getCachedSummary(bill.id) : null,
  };
}
