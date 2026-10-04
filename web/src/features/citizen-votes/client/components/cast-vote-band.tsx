"use client";

import { CastVoteBandView } from "./cast-vote-band-view";
import { useCitizenVote } from "./citizen-vote-provider";

interface CastVoteBandProps {
  /** 投票したあとに出す、結果の面へのページ内リンク（例：#bill-votes） */
  resultsHref?: string;
  className?: string;
}

/** 「あなたの意思を投じる」の帯（CitizenVoteProvider の中に置く） */
export function CastVoteBand({ resultsHref, className }: CastVoteBandProps) {
  const { view, status, state, pending, error, cast, withdraw } =
    useCitizenVote();

  return (
    <CastVoteBandView
      pollState={view.pollState}
      status={status}
      billPublished={view.billPublished}
      votingEnabled={view.votingEnabled}
      myVote={state.myVote}
      pending={pending}
      error={error}
      onCast={(choice) => void cast(choice)}
      onWithdraw={() => void withdraw()}
      resultsHref={resultsHref}
      className={className}
    />
  );
}
