import { Landmark, Users } from "lucide-react";
import type { BillStatusEnum } from "@/features/bills/shared/types";
import { cn } from "@/lib/utils";
import { VOTE_VERDICT_THRESHOLDS, type VoteTally } from "../../shared/types";
import {
  type CouncilCitizenRelation,
  compareCouncilAndCitizens,
} from "../../shared/utils/compare-council-and-citizens";

interface CouncilVsCitizensCardProps {
  councilStatus: BillStatusEnum;
  billSlug: string | null;
  /** 締切（採決）前の票 */
  beforeClose: VoteTally;
  className?: string;
}

const RELATION_MESSAGES: Record<
  Exclude<CouncilCitizenRelation, "undecided">,
  string
> = {
  match: "議会の議決と、採決前の区民投票（参考値）の多数は同じ向きでした。",
  diverge: "議会の議決と、採決前の区民投票（参考値）の多数が分かれました。",
  close: `採決前の区民投票（参考値）は、賛成と反対の差が${VOTE_VERDICT_THRESHOLDS.tieMarginPoints}ポイント以内の拮抗でした。`,
  insufficient: `採決前の区民投票（参考値）が${VOTE_VERDICT_THRESHOLDS.minVotes}票に届かなかったため、多数かどうかは示していません。`,
};

/**
 * 「議会：可決／区民：反対多数（採決前 n 票）」の比較。
 * 議会が議決した議案（bills.status が可決・否決）にだけ出す。
 */
export function CouncilVsCitizensCard({
  councilStatus,
  billSlug,
  beforeClose,
  className,
}: CouncilVsCitizensCardProps) {
  const comparison = compareCouncilAndCitizens({
    councilStatus,
    billSlug,
    beforeClose,
  });
  if (!comparison.council.decided || comparison.relation === "undecided") {
    return null;
  }
  const diverges = comparison.relation === "diverge";

  return (
    <section
      aria-label="議会と区民投票の比較"
      className={cn(
        "rounded-lg border p-4 space-y-3",
        diverges ? "border-primary" : "border-border",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold">議会と区民投票</h4>
        {diverges && (
          <span className="whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
            判断が分かれた
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-muted p-3">
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <Landmark className="size-3.5 shrink-0" aria-hidden="true" />
            議会
          </dt>
          <dd className="mt-1 text-lg leading-snug font-bold">
            {comparison.council.label}
          </dd>
        </div>
        <div className="rounded-md bg-muted p-3">
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3.5 shrink-0" aria-hidden="true" />
            区民投票
          </dt>
          <dd className="mt-1 text-lg leading-snug font-bold">
            {comparison.citizens.label}
            <span className="block text-xs font-normal text-muted-foreground">
              採決前 {comparison.citizens.total}票・参考値
            </span>
          </dd>
        </div>
      </dl>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {RELATION_MESSAGES[comparison.relation]}
      </p>
    </section>
  );
}
