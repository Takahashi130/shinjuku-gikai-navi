"use client";

import { CAST_VOTE_ANCHOR } from "../../shared/utils/bill-vote-href";
import { describeCitizenVoteResult } from "../../shared/utils/describe-citizen-vote-result";
import { useCitizenVote } from "./citizen-vote-provider";
import { CitizenVoteResultView } from "./citizen-vote-result-view";

/**
 * 議案ページの「区民の意思（区民投票）」の面（CitizenVoteProvider の中に置く）。
 * 投票していない人には、同じページの「あなたの意思を投じる」へのリンクを出す。
 */
export function CitizenVoteResultPanel({ className }: { className?: string }) {
  const { view, status, state } = useCitizenVote();
  const model = describeCitizenVoteResult({
    pollState: view.pollState,
    summary: state.summary,
    councilStatus: view.councilStatus,
    billSlug: view.billSlug,
    votingEnabled: view.votingEnabled,
    billPublished: view.billPublished,
  });
  // 受付を止めているとき・公開前は model.accepting が false（帯でも投票できない）
  const canVoteHere =
    state.myVote === null &&
    (model.kind === "hidden_until_vote" ||
      model.kind === "no_votes" ||
      model.kind === "results") &&
    model.accepting;

  return (
    <CitizenVoteResultView
      model={model}
      status={status}
      voteHref={canVoteHere ? CAST_VOTE_ANCHOR : undefined}
      showUpdateNote
      className={className}
    />
  );
}
