import { cn } from "@/lib/utils";
import type { VoteTally } from "../../../shared/utils/parse-bill-votes";

/**
 * 賛成（緑）と反対（赤）の会派数の割合を1本の帯で見せる。
 *
 * 隣に数字を文字で出すときは decorative にして、読み上げから外す（同じ数を
 * 2回読ませない）。帯だけで出すときは、同じ内容を短く読み上げに渡す。
 */
export function VoteSplitBar({
  tally,
  decorative = false,
  className,
}: {
  tally: VoteTally;
  /** 隣に会派の数を文字で出しているとき true。 */
  decorative?: boolean;
  className?: string;
}) {
  if (tally.forPercent === null) return null;

  const a11y = decorative
    ? { "aria-hidden": true as const }
    : {
        role: "img",
        "aria-label": `賛成${tally.forCount}会派、反対${tally.againstCount}会派`,
      };

  return (
    <div
      {...a11y}
      className={cn(
        "flex h-2.5 w-full overflow-hidden rounded-full bg-mirai-surface-muted",
        className
      )}
    >
      <div
        className="h-full bg-stance-for"
        style={{ width: `${tally.forPercent}%` }}
      />
      <div className="h-full flex-1 bg-stance-against" />
    </div>
  );
}
