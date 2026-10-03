import { BookOpen, Users, Vote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParticipationBadge } from "../../shared/types";

interface ParticipationBadgesProps {
  badges: ParticipationBadge[] | undefined;
  className?: string;
}

const BASE =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold whitespace-nowrap";

/**
 * 一覧のカードに置く、解説と区民投票の小さな印。
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
        <li key={badge.kind}>
          {badge.kind === "explainer" && (
            <span className={cn(BASE, "border-primary text-primary")}>
              <BookOpen className="size-3" aria-hidden="true" />
              {badge.label}
            </span>
          )}
          {badge.kind === "vote_open" && (
            <span
              className={cn(
                BASE,
                "border-primary bg-primary text-primary-foreground"
              )}
            >
              <Vote className="size-3" aria-hidden="true" />
              {badge.label}
              {badge.detail && `・${badge.detail}`}
            </span>
          )}
          {badge.kind === "citizens_result" && (
            <span
              className={cn(
                BASE,
                badge.diverges
                  ? "border-primary text-primary"
                  : "border-muted-foreground/50 text-muted-foreground"
              )}
            >
              <Users className="size-3" aria-hidden="true" />
              {badge.label}
              {badge.diverges && "・議会と分かれた"}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
