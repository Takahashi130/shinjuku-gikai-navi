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
 * 賛成・反対の横棒。色だけに頼らないよう、割合と票数を文字でも出す。
 * 賛成・反対のどちらかを良い／悪いと受け取られないよう、警告色は使わない。
 */
export function VoteResultBar({ label, tally, className }: VoteResultBarProps) {
  const percent = toVotePercentages(tally);
  const total = tally.for + tally.against;
  const description =
    total === 0
      ? `${label}：まだ票がありません`
      : `${label}：賛成 ${percent.for}%（${tally.for}票）、反対 ${percent.against}%（${tally.against}票）`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-bold">{label}</span>
        <span className="text-muted-foreground">{total}票</span>
      </div>
      <div
        role="img"
        aria-label={description}
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
      >
        {total > 0 && (
          <>
            <div
              className="h-full bg-primary"
              style={{ width: `${percent.for}%` }}
            />
            <div
              className="h-full bg-muted-foreground"
              style={{ width: `${percent.against}%` }}
            />
          </>
        )}
      </div>
      <div
        aria-hidden="true"
        className="flex items-center justify-between text-xs text-muted-foreground"
      >
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-primary" />
          賛成 {total > 0 ? `${percent.for}%` : "-"}（{tally.for}票）
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-muted-foreground" />
          反対 {total > 0 ? `${percent.against}%` : "-"}（{tally.against}票）
        </span>
      </div>
    </div>
  );
}
