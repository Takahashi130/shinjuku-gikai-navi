"use client";

import { useState } from "react";
import type { BillStatusEnum } from "@/features/bills/shared/types";
import { VoteCardView } from "@/features/citizen-votes/client/components/vote-card-view";
import type { PollState } from "@/features/citizen-votes/shared/types";
import {
  computeOptimisticVote,
  type VoteViewState,
} from "@/features/citizen-votes/shared/utils/compute-optimistic-vote";
import type { PollStatusDescription } from "@/features/citizen-votes/shared/utils/describe-poll-status";

interface VoteCardPreviewProps {
  pollState: PollState;
  status: PollStatusDescription;
  initial: VoteViewState;
  councilStatus?: BillStatusEnum;
  billPublished?: boolean;
  votingEnabled?: boolean;
  error?: string | null;
}

/**
 * 開発用プレビュー：サーバーに送らず、押した結果をその場で反映するだけの投票カード。
 * 結果を隠している状態で押したら、見本の集計を出す。
 */
export function VoteCardPreview({
  pollState,
  status,
  initial,
  councilStatus = "in_originating_house",
  billPublished = true,
  votingEnabled = true,
  error = null,
}: VoteCardPreviewProps) {
  const [state, setState] = useState(initial);
  const castBeforeClose = pollState.state === "open";

  return (
    <VoteCardView
      pollState={pollState}
      status={status}
      billPublished={billPublished}
      votingEnabled={votingEnabled}
      councilStatus={councilStatus}
      billSlug="r8-teirei-3-gian-90"
      state={state}
      pending={null}
      error={error}
      onCast={(choice) =>
        setState((current) => {
          const next = computeOptimisticVote(current, {
            type: "cast",
            choice,
            castBeforeClose,
          });
          return next.summary
            ? next
            : {
                ...next,
                summary: {
                  beforeClose: { for: 18, against: 13, total: 31 },
                  afterClose: { for: 0, against: 0, total: 0 },
                  verifiedBeforeClose: { for: 0, against: 0, total: 0 },
                },
              };
        })
      }
      onWithdraw={() =>
        setState((current) =>
          computeOptimisticVote(current, { type: "withdraw" })
        )
      }
    />
  );
}
