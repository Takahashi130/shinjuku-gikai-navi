import { unstable_rethrow } from "next/navigation";
import { VoteCard } from "../../client/components/vote-card";
import { describePollStatus } from "../../shared/utils/describe-poll-status";
import { getBillCitizenVotes } from "../loaders/get-bill-citizen-votes";

interface CitizenVoteSectionProps {
  billId: string;
  className?: string;
}

/**
 * 議案ページの区民投票。投票カード・結果・議会との比較をまとめて出す。
 * データが取れないときは何も出さない（議案ページ全体は止めない）。
 */
export async function CitizenVoteSection({
  billId,
  className,
}: CitizenVoteSectionProps) {
  let view: Awaited<ReturnType<typeof getBillCitizenVotes>>;
  try {
    view = await getBillCitizenVotes(billId);
  } catch (error) {
    // 動的レンダリングの合図など Next.js 内部のエラーは投げ直す
    unstable_rethrow(error);
    console.error(
      "Failed to load citizen votes:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
  if (!view) return null;

  return (
    <VoteCard
      view={view}
      status={describePollStatus(view.pollState, new Date())}
      className={className}
    />
  );
}
