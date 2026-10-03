"use client";

import { useMemo } from "react";
import type { BillCitizenVotesView } from "../../shared/types";
import type { PollStatusDescription } from "../../shared/utils/describe-poll-status";
import { useCastVote } from "../hooks/use-cast-vote";
import { VoteCardView } from "./vote-card-view";

interface VoteCardProps {
  view: BillCitizenVotesView;
  /** サーバーで現在時刻から作った受付状態の説明（表示のずれを防ぐ） */
  status: PollStatusDescription;
  className?: string;
}

/** 投票カード（賛成・反対・取り消し）。押したときにだけ匿名ログインする */
export function VoteCard({ view, status, className }: VoteCardProps) {
  const closesAt =
    view.pollState.state === "open" ||
    view.pollState.state === "open_after_close" ||
    view.pollState.state === "closed"
      ? view.pollState.closesAt
      : null;

  // サーバーから新しい値が届いたときだけ初期値を差し替える
  const initial = useMemo(
    () => ({ myVote: view.myVote, summary: view.summary }),
    [view.myVote, view.summary]
  );

  const { state, pending, error, cast, withdraw } = useCastVote({
    billId: view.billId,
    closesAt,
    initial,
  });

  return (
    <VoteCardView
      pollState={view.pollState}
      status={status}
      billPublished={view.billPublished}
      votingEnabled={view.votingEnabled}
      councilStatus={view.councilStatus}
      billSlug={view.billSlug}
      state={state}
      pending={pending}
      error={error}
      onCast={(choice) => void cast(choice)}
      onWithdraw={() => void withdraw()}
      className={className}
    />
  );
}
