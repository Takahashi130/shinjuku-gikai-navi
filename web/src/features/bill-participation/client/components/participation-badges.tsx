import { BookOpenCheck, Scale, Users, Vote } from "lucide-react";
import { LabelPill } from "@/components/ui/label-pill";
import { cn } from "@/lib/utils";
import type { ParticipationBadge } from "../../shared/types";

interface ParticipationBadgesProps {
  badges: ParticipationBadge[] | undefined;
  className?: string;
}

/**
 * 一覧のカードに置く、解説と区民投票の小さな印（LabelPill）。
 * - 投票受付中・あと n 日：アクセントの塗り（いちばん目立たせる）
 * - 解説あり：白地に枠
 * - 区民 ○○多数：締切の後だけ。議会と分かれたときは濃色
 *
 * 印が無ければ何も出さない。Server / Client どちらのコンポーネントからも使える。
 */
export function ParticipationBadges({
  badges,
  className,
}: ParticipationBadgesProps) {
  if (!badges || badges.length === 0) return null;
  return (
    <ul
      aria-label="解説と区民投票"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {badges.map((badge) => (
        <li key={badge.kind} className="flex">
          {badge.kind === "vote_open" && (
            <LabelPill tone="solid">
              <Vote aria-hidden />
              {badge.detail ? `${badge.label}・${badge.detail}` : badge.label}
            </LabelPill>
          )}
          {badge.kind === "explainer" && (
            <LabelPill tone="outline">
              <BookOpenCheck aria-hidden />
              {badge.label}
            </LabelPill>
          )}
          {badge.kind === "citizens_result" && (
            <LabelPill tone={badge.diverges ? "dark" : "neutral"}>
              {badge.diverges ? <Scale aria-hidden /> : <Users aria-hidden />}
              {badge.diverges ? `${badge.label}・議会と分かれた` : badge.label}
            </LabelPill>
          )}
        </li>
      ))}
    </ul>
  );
}
