import { Check, Clock, EyeOff, Info, Loader2, Vote } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { BillStatusEnum } from "@/features/bills/shared/types";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  type PollState,
  VOTE_CHOICE_LABELS,
  VOTE_CHOICES,
  VOTE_VERDICT_THRESHOLDS,
  type VoteChoice,
  type VoteTally,
} from "../../shared/types";
import type { VoteViewState } from "../../shared/utils/compute-optimistic-vote";
import type { PollStatusDescription } from "../../shared/utils/describe-poll-status";
import { isPastClose } from "../../shared/utils/resolve-poll-state";
import {
  judgeVoteVerdict,
  VOTE_VERDICT_LABELS,
} from "../../shared/utils/summarize-citizen-votes";
import { CouncilVsCitizensCard } from "./council-vs-citizens-card";
import { VoteResultBar } from "./vote-result-bar";

export interface VoteCardViewProps {
  pollState: PollState;
  status: PollStatusDescription;
  billPublished: boolean;
  votingEnabled: boolean;
  councilStatus: BillStatusEnum;
  billSlug: string | null;
  state: VoteViewState;
  pending: VoteChoice | "withdraw" | null;
  error: string | null;
  onCast: (choice: VoteChoice) => void;
  onWithdraw: () => void;
  className?: string;
}

function verdictMessage(tally: VoteTally): string {
  const verdict = judgeVoteVerdict(tally);
  switch (verdict) {
    case "insufficient":
      return `${VOTE_VERDICT_THRESHOLDS.minVotes}票に届くまでは、多数かどうかを示しません。`;
    case "close":
      return `区民（参考値）：拮抗（賛成と反対の差が${VOTE_VERDICT_THRESHOLDS.tieMarginPoints}ポイント以内）`;
    default:
      return `区民（参考値）：${VOTE_VERDICT_LABELS[verdict]}`;
  }
}

/**
 * 投票カードの見た目（状態は親から受け取る）。
 * 賛成・反対、締切までの日数、「参考値・区民確認なし」の注記、取り消し、結果を出す。
 * 本人の票があれば、受付を止めているときや回が対象外のときも「取り消す」を出す。
 */
export function VoteCardView({
  pollState,
  status,
  billPublished,
  votingEnabled,
  councilStatus,
  billSlug,
  state,
  pending,
  error,
  onCast,
  onWithdraw,
  className,
}: VoteCardViewProps) {
  const isApplicable = pollState.state !== "not_applicable";
  const accepting =
    pollState.state === "open" || pollState.state === "open_after_close";
  const canInteract = accepting && votingEnabled && billPublished;
  const { myVote, summary } = state;
  const pastClose = isPastClose(pollState);

  // 本人の票と取り消し。受付を止めているときや、回が対象外になったときも出す（いつでも取り消せる）
  const myVoteRow = myVote && (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span>
        あなたの票：
        <strong>{VOTE_CHOICE_LABELS[myVote.choice]}</strong>
        {!myVote.castBeforeClose && "（採決後の票）"}
      </span>
      <Button
        type="button"
        variant="link"
        className="text-xs"
        disabled={pending !== null}
        onClick={onWithdraw}
      >
        {pending === "withdraw" && (
          <Loader2 className="animate-spin" aria-hidden="true" />
        )}
        投票を取り消す
      </Button>
    </div>
  );
  const errorMessage = error && (
    <p role="alert" className="text-sm font-bold text-destructive">
      {error}
    </p>
  );

  return (
    <section
      aria-labelledby="citizen-vote-heading"
      className={cn("rounded-xl border bg-card p-5 space-y-4", className)}
    >
      <header className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h3
            id="citizen-vote-heading"
            className="flex items-center gap-2 text-lg font-bold"
          >
            <Vote className="size-5 text-primary" aria-hidden="true" />
            区民投票
          </h3>
          {isApplicable && (
            <span className="rounded-full border border-muted-foreground/50 px-2 py-0.5 text-xs text-muted-foreground">
              参考値・区民確認なし
            </span>
          )}
        </div>
        {isApplicable && (
          <p className="text-sm">この議案に賛成ですか、反対ですか？</p>
        )}
      </header>

      <div className="flex gap-2 text-sm">
        <Clock
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="space-y-0.5">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-bold">{status.headline}</span>
            {status.remaining && (
              <span className="whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                {status.remaining}
              </span>
            )}
          </p>
          {status.detail && (
            <p className="text-xs text-muted-foreground">{status.detail}</p>
          )}
        </div>
      </div>

      {isApplicable && (
        <>
          <fieldset className="space-y-2" disabled={!canInteract}>
            <legend className="sr-only">賛成か反対かを選ぶ</legend>
            <div className="grid grid-cols-2 gap-3">
              {VOTE_CHOICES.map((choice) => {
                const selected = myVote?.choice === choice;
                return (
                  <Button
                    key={choice}
                    type="button"
                    variant="outline"
                    aria-pressed={selected}
                    disabled={!canInteract || pending !== null}
                    onClick={() => onCast(choice)}
                    className={cn(
                      "h-12 text-base",
                      selected &&
                        "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {pending === choice ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                      selected && <Check aria-hidden="true" />
                    )}
                    {VOTE_CHOICE_LABELS[choice]}
                  </Button>
                );
              })}
            </div>
          </fieldset>

          {!votingEnabled && (
            <p className="text-sm text-muted-foreground">
              現在、投票の受付を停止しています。
            </p>
          )}
          {votingEnabled && !billPublished && (
            <p className="text-sm text-muted-foreground">
              公開前の議案のため、投票できません。
            </p>
          )}

          {myVoteRow}
          {errorMessage}

          <div aria-live="polite" className="space-y-4">
            {summary ? (
              <>
                <VoteResultBar
                  label={pastClose ? "採決前の票" : "これまでの票"}
                  tally={summary.beforeClose}
                />
                <p className="text-sm font-bold">
                  {verdictMessage(summary.beforeClose)}
                </p>
                {(pastClose || summary.afterClose.total > 0) && (
                  <VoteResultBar
                    label="採決後の票"
                    tally={summary.afterClose}
                  />
                )}
                {summary.beforeClose.total > 0 && (
                  <CouncilVsCitizensCard
                    councilStatus={councilStatus}
                    billSlug={billSlug}
                    beforeClose={summary.beforeClose}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  集計は1分ごとに更新されます。
                </p>
              </>
            ) : (
              accepting && (
                <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  <EyeOff
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  ほかの人の結果は、投票したあとに表示します。締切（採決の予定）のあとは、投票しなくても見られます。
                </p>
              )
            )}
          </div>

          <div className="flex items-start gap-2 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <p>
              <strong>参考値・区民確認なし：</strong>
              誰でも、1つのブラウザから議案ごとに1票投票できます（選び直し・取り消しもできます）。新宿区民かどうかは確かめていないため、区民全体の意見を表すものではありません。新宿区・新宿区議会の公式の投票ではなく、議会の議決には影響しません。投票すると、このブラウザに匿名のIDが保存されます。
              <Link href={routes.privacy()} className="ml-1 underline">
                投票の情報の扱い
              </Link>
            </p>
          </div>
        </>
      )}

      {!isApplicable && myVote && (
        <div className="space-y-2 border-t pt-3">
          {myVoteRow}
          <p className="text-xs text-muted-foreground">
            この議案の投票は、いまは受け付けていません。あなたの票は集計に入れていません。取り消すと、票を削除します。
          </p>
          {errorMessage}
        </div>
      )}
    </section>
  );
}
