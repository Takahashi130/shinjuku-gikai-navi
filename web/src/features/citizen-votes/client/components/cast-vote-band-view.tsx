import {
  Ban,
  Check,
  CircleCheck,
  CircleX,
  Clock,
  Loader2,
  type LucideIcon,
  TriangleAlert,
  Vote,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabelPill } from "@/components/ui/label-pill";
import { RoundCard } from "@/components/ui/round-card";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  type MyVote,
  type PollState,
  VOTE_CHOICE_LABELS,
  VOTE_CHOICES,
  type VoteChoice,
} from "../../shared/types";
import type { PollStatusDescription } from "../../shared/utils/describe-poll-status";
import {
  isAcceptingVotes,
  isPastClose,
} from "../../shared/utils/resolve-poll-state";

export interface CastVoteBandViewProps {
  pollState: PollState;
  /** 受付の状態の説明（サーバーで現在時刻から作ったもの） */
  status: PollStatusDescription;
  /** 議案が公開済みか（プレビュー中の議案には投票できない） */
  billPublished: boolean;
  /** 新しい票を受け付けられる設定か（false でも取り消しはできる） */
  votingEnabled: boolean;
  myVote: MyVote | null;
  pending: VoteChoice | "withdraw" | null;
  error: string | null;
  onCast: (choice: VoteChoice) => void;
  onWithdraw: () => void;
  /** 投票したあとに出す、結果の面へのページ内リンク（例：#bill-votes） */
  resultsHref?: string;
  className?: string;
}

const CHOICE_ICONS: Record<VoteChoice, LucideIcon> = {
  for: CircleCheck,
  against: CircleX,
};

/** 締切の前に入れた票を、締切のあとに動かすときの注意 */
const LEAVES_BEFORE_CLOSE =
  "この票は採決前の票から外れ、元に戻せません（議会の議決との比較にも使わなくなります）。";

/** 確かめてから行う操作（取り消し、または締切のあとの選び直し） */
type Confirming = VoteChoice | "withdraw";

/** 押せる範囲を 44px にした、帯の中の文字のリンク・ボタン */
const BAND_TEXT_ACTION =
  "inline-flex min-h-11 items-center gap-1 px-2 text-sm font-bold text-brand-on-header underline underline-offset-4";

/**
 * 「あなたの意思を投じる」の濃色の帯。賛成・反対、締切までの日数、
 * 「参考値・区民確認なし」の注記、本人の票と取り消しを出す。
 *
 * 投票できないとき（受付前・受付終了・人事案件・受付停止中・公開前）は、
 * 押せないボタンを並べず、理由を文で書く。本人の票があれば、受付を止めて
 * いるときや対象外になったときも「投票を取り消す」を出す（いつでも取り消せる）。
 *
 * 取り消しは、確かめてから行う。締切の前に入れた票を締切のあとに選び直す・
 * 取り消すと、その票は採決前の票から外れて戻せないので、そのことを帯に書き、
 * 選び直しも確かめてから行う。
 *
 * ふりがな表示（Rubyful）が ON だと、span・p などの中身が差し替えられて
 * React の持つ文字が画面から外れる（lib/rubyful/initializer.tsx）。投票で
 * 変わる文字は、key を変えて要素ごと作り直す。
 *
 * 状態（確かめ中）を持つので、Client Component（CastVoteBand など）からだけ使う。
 */
export function CastVoteBandView({
  pollState,
  status,
  billPublished,
  votingEnabled,
  myVote,
  pending,
  error,
  onCast,
  onWithdraw,
  resultsHref,
  className,
}: CastVoteBandViewProps) {
  // 確かめている操作と、そのときの本人の票（票が変わったら確かめ直す）
  const [confirming, setConfirming] = useState<{
    action: Confirming;
    voteKey: string;
  } | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const applicable = pollState.state !== "not_applicable";
  const accepting = isAcceptingVotes(pollState);
  const canVote = accepting && votingEnabled && billPublished;
  const blockedMessage = !accepting
    ? null
    : !votingEnabled
      ? "現在、投票の受付を停止しています。"
      : !billPublished
        ? "公開前の議案のため、投票できません。"
        : null;
  const StatusIcon = applicable ? Clock : Ban;
  // 締切の前に入れた票を、締切のあとに動かすと採決前の票から外れる
  const lockedBeforeClose =
    myVote?.castBeforeClose === true && isPastClose(pollState);
  const voteKey = myVote ? `${myVote.choice}:${myVote.castBeforeClose}` : null;
  // 票が変わったら（ほかのタブでの操作など）、確かめている途中の操作はやめる
  const activeConfirm =
    confirming !== null && confirming.voteKey === voteKey && pending === null
      ? confirming.action
      : null;

  // 確かめる欄を出したら、その「はい」のボタンに移る（キーボード・読み上げ）
  useEffect(() => {
    if (activeConfirm !== null) confirmButtonRef.current?.focus();
  }, [activeConfirm]);

  const askToConfirm = (action: Confirming) => {
    if (voteKey !== null) setConfirming({ action, voteKey });
  };

  const choose = (choice: VoteChoice) => {
    if (myVote !== null && myVote.choice !== choice && lockedBeforeClose) {
      askToConfirm(choice);
      return;
    }
    setConfirming(null);
    onCast(choice);
  };

  const confirm = () => {
    if (activeConfirm === null) return;
    setConfirming(null);
    if (activeConfirm === "withdraw") onWithdraw();
    else onCast(activeConfirm);
  };

  return (
    <RoundCard
      asChild
      tone="dark"
      radius="md"
      className={cn("flex flex-col gap-4", className)}
    >
      <section aria-labelledby="cast-vote-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-accent text-brand-on-accent">
              <Vote className="size-5" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2
                id="cast-vote-title"
                className="text-lg font-extrabold leading-snug md:text-xl"
              >
                あなたの意思を投じる
              </h2>
              {applicable && (
                <p className="text-sm text-brand-on-header-muted">
                  この議案に賛成ですか、反対ですか？
                </p>
              )}
            </div>
          </div>
          {applicable && (
            <LabelPill tone="on-dark">参考値・区民確認なし</LabelPill>
          )}
        </div>

        <div className="flex items-start gap-2 text-sm">
          <StatusIcon
            className="mt-0.5 size-4 shrink-0 text-brand-on-header-muted"
            aria-hidden
          />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-bold">{status.headline}</span>
              {status.remaining && (
                <LabelPill tone="solid">{status.remaining}</LabelPill>
              )}
            </p>
            {status.detail && (
              <p className="text-xs leading-relaxed text-brand-on-header-muted">
                {status.detail}
              </p>
            )}
          </div>
        </div>

        {canVote && (
          <fieldset className="min-w-0">
            <legend className="sr-only">賛成か反対かを選ぶ</legend>
            <div className="grid grid-cols-2 gap-3">
              {VOTE_CHOICES.map((choice) => {
                const selected = myVote?.choice === choice;
                const Icon = selected ? Check : CHOICE_ICONS[choice];
                return (
                  <Button
                    key={choice}
                    type="button"
                    variant="outline"
                    aria-pressed={selected}
                    disabled={pending !== null}
                    onClick={() => choose(choice)}
                    className={cn(
                      // 選んでいないボタンも、枠が帯の地から見分けられるようにする（約3:1以上）
                      "h-14 rounded-2xl border-brand-on-header-muted/60 bg-brand-header-sub text-base text-brand-on-header shadow-none hover:bg-brand-header-hover",
                      selected &&
                        "border-brand-accent bg-brand-accent text-brand-on-accent hover:bg-brand-accent-hover"
                    )}
                  >
                    {pending === choice ? (
                      <Loader2 className="size-5 animate-spin" aria-hidden />
                    ) : (
                      <Icon className="size-5" aria-hidden />
                    )}
                    {VOTE_CHOICE_LABELS[choice]}
                  </Button>
                );
              })}
            </div>
          </fieldset>
        )}

        {blockedMessage && (
          <p className="rounded-xl bg-brand-header-sub px-3 py-2.5 text-sm">
            {blockedMessage}
          </p>
        )}

        {myVote && (
          <div className="flex flex-col gap-1.5 rounded-xl bg-brand-header-sub px-3 py-1.5 text-sm">
            <div className="flex flex-wrap items-center gap-x-1 gap-y-0">
              {/* 選び直すと文字が変わるので、key を変えて作り直す（Rubyful 対策） */}
              <span
                key={`${myVote.choice}:${myVote.castBeforeClose}`}
                className="mr-auto py-1.5"
              >
                あなたの票：
                <strong>{VOTE_CHOICE_LABELS[myVote.choice]}</strong>
                {myVote.castBeforeClose ? "" : "（採決後の票）"}
              </span>
              {applicable && resultsHref && (
                <a href={resultsHref} className={BAND_TEXT_ACTION}>
                  結果を見る
                </a>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  BAND_TEXT_ACTION,
                  "h-auto rounded-lg hover:bg-brand-header-hover hover:text-brand-on-header"
                )}
                disabled={pending !== null}
                aria-expanded={activeConfirm === "withdraw"}
                onClick={() => askToConfirm("withdraw")}
              >
                {pending === "withdraw" && (
                  <Loader2 className="animate-spin" aria-hidden />
                )}
                投票を取り消す
              </Button>
            </div>
            {lockedBeforeClose && (
              <p className="flex items-start gap-1.5 pb-1.5 text-xs leading-relaxed text-brand-on-header-muted">
                <TriangleAlert
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden
                />
                {`あなたの票は採決前の票として数えています。選び直す・取り消すと、${LEAVES_BEFORE_CLOSE}`}
              </p>
            )}
            {!applicable && (
              <p className="pb-1.5 text-xs leading-relaxed text-brand-on-header-muted">
                この議案の投票は、いまは受け付けていません。あなたの票は集計に入れていません。取り消すと、票を削除します。
              </p>
            )}
          </div>
        )}

        {activeConfirm !== null && (
          <div
            role="group"
            aria-labelledby="cast-vote-confirm"
            className="flex flex-col gap-3 rounded-xl border border-brand-on-header-muted/60 bg-brand-header-sub px-3 py-3 text-sm"
          >
            <p
              key={activeConfirm}
              id="cast-vote-confirm"
              className="leading-relaxed"
            >
              {describeConfirm(activeConfirm, {
                lockedBeforeClose,
                canVote,
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                ref={confirmButtonRef}
                type="button"
                size="sm"
                className="h-11 px-4"
                onClick={confirm}
              >
                {activeConfirm === "withdraw"
                  ? "取り消す"
                  : `${VOTE_CHOICE_LABELS[activeConfirm]}に選び直す`}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 border-brand-on-header-muted/60 bg-brand-header-sub px-4 text-brand-on-header shadow-none hover:bg-brand-header-hover hover:text-brand-on-header"
                onClick={() => setConfirming(null)}
              >
                やめる
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-white px-3 py-2.5 text-sm font-bold text-stance-against"
          >
            {error}
          </p>
        )}

        {applicable && (
          <p className="border-brand-header-hover border-t pt-3 text-xs leading-relaxed text-brand-on-header-muted">
            <strong className="text-brand-on-header">
              参考値・区民確認なし：
            </strong>
            誰でも、1つのブラウザから議案ごとに1票投票できます（選び直し・取り消しもできます）。新宿区民かどうかは確かめていないため、区民全体の意見を表すものではありません。新宿区・新宿区議会の公式の投票ではなく、議会の議決には影響しません。投票すると、このブラウザに匿名のIDが保存されます。
            <Link
              href={routes.privacy()}
              className="ml-1 text-brand-on-header underline"
            >
              投票の情報の扱い
            </Link>
          </p>
        )}
      </section>
    </RoundCard>
  );
}

/** 確かめる欄の文。1つの文字列にする（Rubyful 対策） */
function describeConfirm(
  action: Confirming,
  context: { lockedBeforeClose: boolean; canVote: boolean }
): string {
  if (action !== "withdraw") {
    return `「${VOTE_CHOICE_LABELS[action]}」に選び直すと、${LEAVES_BEFORE_CLOSE}選び直しますか？`;
  }
  if (context.lockedBeforeClose) {
    return `取り消すと、${LEAVES_BEFORE_CLOSE}取り消しますか？`;
  }
  if (!context.canVote) {
    return "いまは投票を受け付けていないため、取り消すと投票し直せません。取り消しますか？";
  }
  return "あなたの票を取り消しますか？（取り消したあとも、もう一度投票できます）";
}
