import { Split } from "lucide-react";
import { LabelPill } from "@/components/ui/label-pill";

/**
 * 「会派の賛否が分かれた」議案の目印。全会一致ではなかった議案は、区民の
 * 意見も分かれやすいので、一覧やカードで見つけやすくする。
 *
 * 色は賛成（緑）・反対（赤）のどちらでもない中立の色（vote-split）。赤にすると
 * 可決のピルの隣で否決や反対のように読めてしまう。
 */
export function SplitVoteMark({
  size = "sm",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <LabelPill tone="split" size={size} className={className}>
      <Split aria-hidden />
      賛否が分かれた
    </LabelPill>
  );
}
