import { cn } from "@/lib/utils";
import type { VoteTally } from "../../shared/types";
import { toVotePercentages } from "../../shared/utils/summarize-citizen-votes";

interface VoteResultBarProps {
  /** 例：採決前の票 */
  label: string;
  tally: VoteTally;
  className?: string;
}

/**
 * 区民投票の賛成・反対の横棒。色だけに頼らないよう、割合と票数を文字でも出す。
 *
 * 色は議会の議決の面（会派の賛否）と同じ系統（賛成=緑・反対=赤）にして、
 * 左右に並べたときに見比べやすくする。どちらかを良い／悪いと示す色ではない。
 */
export function VoteResultBar({ label, tally, className }: VoteResultBarProps) {
  const percent = toVotePercentages(tally);
  const total = tally.for + tally.against;
  const description =
    total === 0
      ? `${label}：まだ票がありません`
      : `${label}：賛成 ${percent.for}%（${tally.for}票）、反対 ${percent.against}%（${tally.against}票）`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs font-bold text-mirai-text-secondary">
        <span>{label}</span>
        <span>
          <span className="font-lexend">{total.toLocaleString("ja-JP")}</span>票
        </span>
      </div>
      <div
        role="img"
        aria-label={description}
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-mirai-surface-muted"
      >
        {total > 0 && (
          <>
            <div
              className="h-full bg-stance-for-bar"
              style={{ width: `${percent.for}%` }}
            />
            <div className="h-full flex-1 bg-stance-against-bar" />
          </>
        )}
      </div>
      <div
        aria-hidden="true"
        className="flex items-center justify-between gap-2 text-xs text-mirai-text-muted"
      >
        <span>
          賛成 {total > 0 ? `${percent.for}%` : "-"}（{tally.for}票）
        </span>
        <span>
          反対 {total > 0 ? `${percent.against}%` : "-"}（{tally.against}票）
        </span>
      </div>
    </div>
  );
}
