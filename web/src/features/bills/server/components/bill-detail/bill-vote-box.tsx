import { Landmark, Vote } from "lucide-react";
import { ComingSoonTag } from "@/components/coming-soon-tag";
import { cn } from "@/lib/utils";
import { VoteSplitBar } from "../../../client/components/bill-detail/vote-split-bar";
import type { BillStatusEnum } from "../../../shared/types";
import { getCardStatusLabel } from "../../../shared/utils/bill-status";
import { toBillStatusGroup } from "../../../shared/utils/bill-status-group";
import {
  type BillVotes,
  tallyFactionVotes,
} from "../../../shared/utils/parse-bill-votes";

interface BillVoteBoxProps {
  status: BillStatusEnum;
  votes: BillVotes | null;
  className?: string;
}

/**
 * 議案詳細の右の「投票」ボックス（Amazon のカートボックスの位置）。
 *
 * 区民投票はまだ無いので、何ができるようになるかを「準備中」と書くだけにする。
 * 存在しない機能を押せそうに見せないよう、ボタン（無効表示も含む）は置かない。
 * その下に、議会の議決結果のサマリー（可決/否決と会派の数）を出す。
 */
export function BillVoteBox({ status, votes, className }: BillVoteBoxProps) {
  const decided = status === "enacted" || status === "rejected";

  return (
    <section
      aria-label="区民投票と議会の議決"
      className={cn(
        "flex flex-col gap-4 rounded-md border border-mirai-border bg-white p-4",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-mirai-text">
          <Vote className="size-5 text-brand-link" aria-hidden />
          区民投票
          <ComingSoonTag />
        </h2>
        <p className="text-sm leading-relaxed text-mirai-text-secondary">
          <span className="font-bold text-mirai-text">投票（準備中）：</span>
          この議案に誰でも賛成・反対の意思表示ができるようになります（1台につき1票）
        </p>
      </div>

      <hr className="border-mirai-border" />

      <div className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-mirai-text">
          <Landmark className="size-4 text-mirai-text-muted" aria-hidden />
          議会の議決
        </h2>
        {decided ? (
          <DecidedSummary status={status} votes={votes} />
        ) : (
          <p className="text-sm leading-relaxed text-mirai-text-secondary">
            {toBillStatusGroup(status) === "waiting"
              ? "議案の提出前です。審議と議決のあと、結果と会派ごとの賛否を掲載します。"
              : "審議中です。議決のあと、結果と会派ごとの賛否を掲載します。"}
          </p>
        )}
      </div>
    </section>
  );
}

function DecidedSummary({
  status,
  votes,
}: {
  status: BillStatusEnum;
  votes: BillVotes | null;
}) {
  const enacted = status === "enacted";
  // 「承認」「同意」など、議決の語は資料の表記をそのまま出す。
  const resultLabel = votes?.result ?? getCardStatusLabel(status);
  const tally = votes?.hasFactionVotes ? tallyFactionVotes(votes) : null;

  return (
    <>
      <p
        className={cn(
          "text-2xl font-extrabold leading-tight",
          enacted ? "text-stance-for-strong" : "text-stance-against"
        )}
      >
        {resultLabel}
        {votes?.resultNote && (
          <span className="ml-2 text-xs font-medium text-mirai-text-muted">
            {votes.resultNote}
          </span>
        )}
      </p>
      {tally ? (
        <>
          <p className="text-sm text-mirai-text">
            賛成 <span className="font-bold">{tally.forCount}</span>
            会派・反対 <span className="font-bold">{tally.againstCount}</span>
            会派
          </p>
          <VoteSplitBar tally={tally} decorative />
        </>
      ) : (
        <p className="text-xs text-mirai-text-muted">
          会派ごとの賛否は掲載していません
        </p>
      )}
    </>
  );
}
