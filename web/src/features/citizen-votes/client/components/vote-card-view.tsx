import type { BillStatusEnum } from "@/features/bills/shared/types";
import { cn } from "@/lib/utils";
import type { PollState, VoteChoice } from "../../shared/types";
import { CAST_VOTE_ANCHOR } from "../../shared/utils/bill-vote-href";
import type { VoteViewState } from "../../shared/utils/compute-optimistic-vote";
import { describeCitizenVoteResult } from "../../shared/utils/describe-citizen-vote-result";
import type { PollStatusDescription } from "../../shared/utils/describe-poll-status";
import { CastVoteAnchor } from "./cast-vote-anchor";
import { CastVoteBandView } from "./cast-vote-band-view";
import { CitizenVoteResultView } from "./citizen-vote-result-view";

export interface VoteCardViewProps {
  pollState: PollState;
  status: PollStatusDescription;
  billPublished: boolean;
  votingEnabled: boolean;
  councilStatus: BillStatusEnum;
  billSlug: string | null;
  state: VoteViewState;
  pending: VoteChoice | "withdraw" | null;
  error: string | null;
  onCast: (choice: VoteChoice) => void;
  onWithdraw: () => void;
  className?: string;
}

/**
 * 投票カードの見た目（状態は親から受け取る）。「あなたの意思を投じる」の帯と
 * 「区民の意思（区民投票）」の面を縦に並べる。開発用のプレビュー（/dev）でも使う。
 */
export function VoteCardView({
  pollState,
  status,
  billPublished,
  votingEnabled,
  councilStatus,
  billSlug,
  state,
  pending,
  error,
  onCast,
  onWithdraw,
  className,
}: VoteCardViewProps) {
  const model = describeCitizenVoteResult({
    pollState,
    summary: state.summary,
    councilStatus,
    billSlug,
    votingEnabled,
    billPublished,
  });
  const canVote =
    state.myVote === null &&
    (model.kind === "hidden_until_vote" ||
      model.kind === "no_votes" ||
      model.kind === "results") &&
    model.accepting;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <CastVoteAnchor>
        <CastVoteBandView
          pollState={pollState}
          status={status}
          billPublished={billPublished}
          votingEnabled={votingEnabled}
          myVote={state.myVote}
          pending={pending}
          error={error}
          onCast={onCast}
          onWithdraw={onWithdraw}
        />
      </CastVoteAnchor>
      <CitizenVoteResultView
        model={model}
        status={status}
        voteHref={canVote ? CAST_VOTE_ANCHOR : undefined}
        showUpdateNote
      />
    </div>
  );
}
