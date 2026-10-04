import { CitizenVoteResultView } from "@/features/citizen-votes/client/components/citizen-vote-result-view";
import { CitizenVoteUnavailable } from "@/features/citizen-votes/client/components/citizen-vote-unavailable";
import type { CitizenVoteSnapshot } from "@/features/citizen-votes/server/loaders/get-citizen-vote-snapshot";
import { billVoteHref } from "@/features/citizen-votes/shared/utils/bill-vote-href";
import { describeCitizenVoteResult } from "@/features/citizen-votes/shared/utils/describe-citizen-vote-result";
import { describePollStatus } from "@/features/citizen-votes/shared/utils/describe-poll-status";

/**
 * トップの比較カードの「区民の意思」の面。例の議案の区民投票を出す。
 *
 * - 票があり、締切（採決）の後なら、実際の票数・割合と議会とのズレ
 * - 締切前（本人の票は見ないので結果は見せない）や、票が無いときは、受付中で
 *   あることと、その議案の投票の帯へのリンク
 * - 投票の受付を止めているときは「受付停止中」とし、リンクを出さない
 */
export function HomeCitizenVotePanel({
  snapshot,
}: {
  /** 読み込めなかったときは null */
  snapshot: CitizenVoteSnapshot | null;
}) {
  if (!snapshot) return <CitizenVoteUnavailable />;

  const model = describeCitizenVoteResult({
    pollState: snapshot.pollState,
    summary: snapshot.summary,
    councilStatus: snapshot.councilStatus,
    billSlug: snapshot.billSlug,
    votingEnabled: snapshot.votingEnabled,
    billPublished: snapshot.billPublished,
  });
  const accepting =
    (model.kind === "hidden_until_vote" ||
      model.kind === "no_votes" ||
      model.kind === "results") &&
    model.accepting;

  return (
    <CitizenVoteResultView
      model={model}
      status={describePollStatus(snapshot.pollState, new Date())}
      voteHref={accepting ? billVoteHref(snapshot.billId) : undefined}
    />
  );
}
