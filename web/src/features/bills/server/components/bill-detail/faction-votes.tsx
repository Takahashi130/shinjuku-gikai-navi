import { CircleCheck, CircleX, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoteSplitBar } from "../../../client/components/bill-detail/vote-split-bar";
import {
  type BillVotes,
  type FactionVote,
  tallyFactionVotes,
} from "../../../shared/utils/parse-bill-votes";

/** 議案詳細の「会派ごとの賛否」。賛成=緑系・反対=赤系で2列に並べる。 */
export function FactionVotes({ votes }: { votes: BillVotes }) {
  const tally = tallyFactionVotes(votes);

  return (
    <section
      aria-labelledby="faction-votes-title"
      className="flex flex-col gap-3"
    >
      <h2
        id="faction-votes-title"
        className="border-mirai-border border-b pb-2 text-xl font-bold text-mirai-text"
      >
        会派ごとの賛否
      </h2>

      <div className="flex items-center gap-3 text-sm font-bold">
        <span className="whitespace-nowrap text-stance-for-strong">
          賛成 {tally.forCount}会派
        </span>
        <VoteSplitBar tally={tally} decorative className="flex-1" />
        <span className="whitespace-nowrap text-stance-against">
          反対 {tally.againstCount}会派
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <FactionList tone="for" factions={votes.for} />
        <FactionList tone="against" factions={votes.against} />
      </div>

      <p className="text-xs leading-relaxed text-mirai-text-muted">
        {
          "※ 会派の数で数えています（議員の人数ではありません）。（）内は、会派の中で賛否が分かれたときの補足です。"
        }
      </p>
    </section>
  );
}

const TONES: Record<
  "for" | "against",
  { label: string; icon: LucideIcon; header: string; iconClass: string }
> = {
  for: {
    label: "賛成",
    icon: CircleCheck,
    header: "bg-stance-for-bg text-stance-for-strong",
    iconClass: "text-stance-for",
  },
  against: {
    label: "反対",
    icon: CircleX,
    header: "bg-stance-against-bg text-stance-against",
    iconClass: "text-stance-against",
  },
};

function FactionList({
  tone,
  factions,
}: {
  tone: "for" | "against";
  factions: FactionVote[];
}) {
  const { label, icon: Icon, header, iconClass } = TONES[tone];

  return (
    <div className="overflow-hidden rounded-md border border-mirai-border">
      <h3
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 text-sm font-bold",
          header
        )}
      >
        <Icon className="size-4" aria-hidden />
        {label}（{factions.length}会派）
      </h3>
      {factions.length === 0 ? (
        <p className="px-3 py-2.5 text-sm text-mirai-text-muted">なし</p>
      ) : (
        <ul className="divide-y divide-mirai-border">
          {factions.map((faction) => (
            <li
              key={faction.name}
              className="flex items-start gap-2 px-3 py-2 text-sm text-mirai-text"
            >
              <Icon
                className={cn("mt-0.5 size-4 shrink-0", iconClass)}
                aria-hidden
              />
              <span>
                {faction.name}
                {faction.note && (
                  <span className="ml-1 text-xs text-mirai-text-muted">
                    （{faction.note}）
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
