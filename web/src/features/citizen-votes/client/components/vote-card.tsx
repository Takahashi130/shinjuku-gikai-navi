"use client";

import { cn } from "@/lib/utils";
import type { BillCitizenVotesView } from "../../shared/types";
import type { PollStatusDescription } from "../../shared/utils/describe-poll-status";
import { CastVoteAnchor } from "./cast-vote-anchor";
import { CastVoteBand } from "./cast-vote-band";
import { CitizenVoteProvider } from "./citizen-vote-provider";
import { CitizenVoteResultPanel } from "./citizen-vote-result-panel";

interface VoteCardProps {
  view: BillCitizenVotesView;
  /** サーバーで現在時刻から作った受付状態の説明（表示のずれを防ぐ） */
  status: PollStatusDescription;
  className?: string;
}

/**
 * 投票の帯と結果の面を縦に並べた、1か所で完結する区民投票（BillParticipationPanel
 * から使う）。議案ページでは、2つを離れた場所に置くので CitizenVoteProvider で
 * 直接組み立てる。押したときにだけ匿名ログインする。
 */
export function VoteCard({ view, status, className }: VoteCardProps) {
  return (
    <CitizenVoteProvider view={view} status={status}>
      <div className={cn("flex flex-col gap-3", className)}>
        <CastVoteAnchor>
          <CastVoteBand />
        </CastVoteAnchor>
        <CitizenVoteResultPanel />
      </div>
    </CitizenVoteProvider>
  );
}
