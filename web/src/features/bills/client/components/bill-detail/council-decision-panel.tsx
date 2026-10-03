import { CircleCheck, CircleX, Landmark, type LucideIcon } from "lucide-react";
import { LabelPill } from "@/components/ui/label-pill";
import { cn } from "@/lib/utils";
import type { BillStatusEnum } from "../../../shared/types";
import { getCardStatusLabel } from "../../../shared/utils/bill-status";
import { toBillStatusGroup } from "../../../shared/utils/bill-status-group";
import { isDecidedStatus } from "../../../shared/utils/council-decision";
import {
  type BillVotes,
  type FactionVote,
  formatFactionNames,
  tallyFactionVotes,
} from "../../../shared/utils/parse-bill-votes";
import { VoteSplitBar } from "./vote-split-bar";

interface CouncilDecisionPanelProps {
  status: BillStatusEnum;
  /** 解説から読み取った議決結果と会派ごとの賛否。読めなければ null。 */
  votes: BillVotes | null;
  /** 会派の名前まで並べるか（議案ページ）。トップの比較カードでは数だけにする。 */
  showFactions?: boolean;
  /** 審議中のときに添える一言（例：「令和8年第3回定例会は10月15日に閉会予定です」）。 */
  pendingNote?: string;
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
}

/**
 * 「議会の議決」の面。区民投票の面と左右に並べて見比べる（VersusLayout）。
 *
 * 議決結果と会派ごとの賛否は、新宿区議会の公開資料から取り込んだ実際の
 * データだけを出す。数えているのは会派の数で、議員の人数ではない（画面にも書く）。
 *
 * 議決結果と会派ごとの賛否を出すのは、議決まで済んだ議案だけ。どの節を出す
 * のかは getSectionsShownInDecisionPanel と同じ判定にしている（議案ページは
 * それを見て、解説の本文から同じ節を取り除く）。
 */
export function CouncilDecisionPanel({
  status,
  votes,
  showFactions = false,
  pendingNote,
  headingLevel: Heading = "h3",
  className,
}: CouncilDecisionPanelProps) {
  const group = toBillStatusGroup(status);
  const decided = isDecidedStatus(status);
  // 「承認」「同意」など、議決の語は資料の表記をそのまま出す。
  const resultLabel = votes?.result ?? getCardStatusLabel(status);
  const tally =
    decided && votes?.hasFactionVotes ? tallyFactionVotes(votes) : null;

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-3 rounded-2xl border border-line-soft bg-white p-5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Heading className="flex items-center gap-1.5 text-sm font-bold text-mirai-text">
          <Landmark className="size-4 text-mirai-text-muted" aria-hidden />
          新宿区議会の議決
        </Heading>
        <LabelPill
          tone={
            group === "enacted"
              ? "for"
              : group === "rejected"
                ? "against"
                : "accent"
          }
        >
          {decided ? resultLabel : getCardStatusLabel(status)}
        </LabelPill>
      </div>

      {!decided && (
        <p className="text-sm leading-relaxed text-mirai-text-secondary">
          {group === "waiting"
            ? "議案の提出前です。審議と議決のあと、結果と会派ごとの賛否を掲載します。"
            : `審議中です。議決のあと、結果と会派ごとの賛否を掲載します。${pendingNote ?? ""}`}
        </p>
      )}

      {decided && !tally && (
        <p className="text-sm leading-relaxed text-mirai-text-secondary">
          {resultLabel}されました。会派ごとの賛否は掲載していません。
        </p>
      )}

      {tally && votes && (
        <>
          <p className="flex items-baseline justify-between gap-2 text-sm font-bold">
            <span className="text-stance-for-strong">
              賛成{" "}
              <span className="font-lexend text-2xl">{tally.forCount}</span>
              会派
            </span>
            <span className="text-stance-against">
              反対{" "}
              <span className="font-lexend text-2xl">{tally.againstCount}</span>
              会派
            </span>
          </p>
          <VoteSplitBar tally={tally} decorative className="h-3" />
          {showFactions && (
            <div className="flex flex-col gap-2">
              <FactionLine tone="for" factions={votes.for} />
              <FactionLine tone="against" factions={votes.against} />
            </div>
          )}
          <p className="mt-auto text-xs leading-relaxed text-mirai-text-muted">
            ※ 会派の数で数えています（議員の人数ではありません）。
            {showFactions &&
              "（）内は、会派の中で賛否が分かれたときの補足です。"}
          </p>
        </>
      )}
    </div>
  );
}

const FACTION_TONES: Record<
  "for" | "against",
  { label: string; icon: LucideIcon; className: string }
> = {
  for: {
    label: "賛成",
    icon: CircleCheck,
    className: "text-stance-for-strong",
  },
  against: {
    label: "反対",
    icon: CircleX,
    className: "text-stance-against",
  },
};

function FactionLine({
  tone,
  factions,
}: {
  tone: "for" | "against";
  factions: FactionVote[];
}) {
  const { label, icon: Icon, className } = FACTION_TONES[tone];

  return (
    <div className="rounded-xl bg-mirai-surface px-3 py-2.5">
      <p className={cn("flex items-center gap-1 text-xs font-bold", className)}>
        <Icon className="size-3.5" aria-hidden />
        {`${label}（${factions.length}会派）`}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-mirai-text">
        {formatFactionNames(factions)}
      </p>
    </div>
  );
}
