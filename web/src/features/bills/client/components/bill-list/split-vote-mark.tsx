import { Split } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 「会派の賛否が分かれた」議案の目印。全会一致ではなかった議案は、区民の
 * 意見も分かれやすいので、一覧やタイルで見つけやすくする。
 *
 * 色は賛成（緑）・反対（赤）のどちらでもない中立の色（vote-split）。赤にすると
 * 可決のバッジの隣で否決や反対のように読めてしまう。
 */
export function SplitVoteMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-bold text-vote-split",
        className
      )}
    >
      <Split className="size-3.5" aria-hidden />
      賛否が分かれた
    </span>
  );
}
