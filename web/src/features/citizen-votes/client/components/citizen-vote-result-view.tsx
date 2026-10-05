import { ArrowDown, ArrowRight, EyeOff, Scale, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { LabelPill, type LabelPillTone } from "@/components/ui/label-pill";
import { cn } from "@/lib/utils";
import type { VoteVerdict } from "../../shared/types";
import {
  type CitizenVoteResultModel,
  type CouncilGapView,
  OPENED_AFTER_CLOSE_NOTE,
  type VoteBlockReason,
} from "../../shared/utils/describe-citizen-vote-result";
import type { PollStatusDescription } from "../../shared/utils/describe-poll-status";
import { VoteResultBar } from "./vote-result-bar";

interface CitizenVoteResultViewProps {
  model: CitizenVoteResultModel;
  /** 受付の状態の説明（サーバーで現在時刻から作ったもの） */
  status: PollStatusDescription;
  /**
   * 投票へ送るリンク。出したいときだけ渡す。同じページの帯なら "#cast-vote"、
   * ほかのページからなら billVoteHref(billId)。
   */
  voteHref?: string;
  /** 「集計は1分ごとに更新されます」を添えるか */
  showUpdateNote?: boolean;
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
}

const VERDICT_TONES: Record<VoteVerdict, LabelPillTone> = {
  for_majority: "for",
  against_majority: "against",
  close: "split",
  insufficient: "neutral",
};

const BLOCKED_PILLS: Record<VoteBlockReason, string> = {
  suspended: "受付停止中",
  unpublished: "公開前",
};

/** 受付を止めている・公開前のときに、結果を隠している面に出す説明 */
const BLOCKED_MESSAGES: Record<VoteBlockReason, string> = {
  suspended:
    "現在、投票の受付を停止しています。ほかの人の結果は、締切（本会議の採決の予定）のあとに表示します。",
  unpublished: "公開前の議案のため、投票できません。",
};

/** 注記の本文。出し入れする部分も含めて1つの文字列にする（Rubyful 対策） */
const REFERENCE_NOTE =
  "※ 参考値です。誰でも1つのブラウザから議案ごとに1票投票でき、新宿区民かどうかは確かめていません。";
const UPDATE_NOTE = "集計は1分ごとに更新されます。";

function acceptancePill(model: {
  accepting: boolean;
  blocked: VoteBlockReason | null;
  pastClose?: boolean;
}): { label: string; tone: LabelPillTone } {
  if (model.blocked) {
    return { label: BLOCKED_PILLS[model.blocked], tone: "neutral" };
  }
  if (!model.accepting) return { label: "受付終了", tone: "neutral" };
  return model.pastClose
    ? { label: "採決後も受付中", tone: "solid" }
    : { label: "投票受付中", tone: "solid" };
}

function headerPill(model: CitizenVoteResultModel): {
  label: string;
  tone: LabelPillTone;
} {
  switch (model.kind) {
    case "not_applicable":
      return { label: "対象外", tone: "neutral" };
    case "upcoming":
      return { label: "受付前", tone: "neutral" };
    case "hidden_until_vote":
    case "no_votes":
      return acceptancePill(model);
    case "results":
      // 採決のあとに受付を始めた回は、多数を判定しない（採決後の票だけ）
      return model.verdict
        ? {
            label: model.verdict.label,
            tone: VERDICT_TONES[model.verdict.verdict],
          }
        : { label: "採決後の票", tone: "neutral" };
  }
}

/**
 * 「区民の意思（区民投票）」の面。議会の議決の面（CouncilDecisionPanel）と
 * VersusLayout で並べる。見た目は議会の面とそろえる（白地・淡い枠・角丸）。
 *
 * 出すのは model（describeCitizenVoteResult）が決めたものだけ。ほかの人の結果は、
 * 本人が投票した後か締切の後にしか model に入らない。数字はすべて実際の票数。
 *
 * ふりがな表示（Rubyful）が ON だと、main の中の p・span・a などの中身が
 * 差し替えられ、React が持つ子ノードが画面から外れる
 * （lib/rubyful/initializer.tsx）。そのため、投票・取り消しで変わる部分は
 * key を変えて要素ごと作り直し（Rubyful が改めて処理する）、要素の中で子を
 * 出し入れしない。
 */
export function CitizenVoteResultView({
  model,
  status,
  voteHref,
  showUpdateNote = false,
  headingLevel: Heading = "h3",
  className,
}: CitizenVoteResultViewProps) {
  const pill = headerPill(model);
  const voteLabel =
    model.kind === "results" || model.kind === "no_votes"
      ? "賛成・反対を投じる"
      : "投票して結果を見る";
  const note =
    showUpdateNote && model.kind === "results"
      ? `${REFERENCE_NOTE}${UPDATE_NOTE}`
      : REFERENCE_NOTE;

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-3 rounded-2xl border border-line-soft bg-white p-5",
        className
      )}
    >
      {/* 狭い画面では、見出しを折り返さずにピルを次の行へ送る */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <Heading className="flex w-fit items-center gap-1.5 rounded-full border border-brand-accent-light bg-white px-3 py-1 text-sm font-bold text-mirai-text">
          <Users className="size-4 text-mirai-text-muted" aria-hidden />
          区民の意思（区民投票）
        </Heading>
        <LabelPill key={`${pill.tone}:${pill.label}`} tone={pill.tone}>
          {pill.label}
        </LabelPill>
      </div>

      {/*
        投票したあとに結果が出たことを、読み上げでも伝える。読み上げの領域は
        そのままにして、中身だけを model が変わるたびに作り直す
      */}
      <div aria-live="polite" className="flex flex-col gap-3">
        <ResultBody
          key={JSON.stringify([model, status])}
          model={model}
          status={status}
        />
      </div>

      {voteHref && (
        <VoteLink key={`${voteHref}:${voteLabel}`} href={voteHref}>
          {voteLabel}
        </VoteLink>
      )}

      {model.kind !== "not_applicable" && (
        <p
          key={note}
          className="mt-auto text-xs leading-relaxed text-mirai-text-muted"
        >
          {note}
        </p>
      )}
    </div>
  );
}

function ResultBody({
  model,
  status,
}: {
  model: CitizenVoteResultModel;
  status: PollStatusDescription;
}) {
  switch (model.kind) {
    case "not_applicable":
      return <Note>{model.message}</Note>;
    case "upcoming":
      return <Note>{`${status.headline}。`}</Note>;
    case "hidden_until_vote":
      if (model.blocked) {
        return <Note>{BLOCKED_MESSAGES[model.blocked]}</Note>;
      }
      return (
        <>
          {model.accepting && <Deadline status={status} />}
          <p className="flex items-start gap-2 rounded-xl bg-mirai-surface px-3 py-2.5 text-sm leading-relaxed text-mirai-text-secondary">
            <EyeOff className="mt-1 size-4 shrink-0" aria-hidden />
            ほかの人の結果は、投票したあとに表示します。締切（本会議の採決の予定）のあとは、投票しなくても見られます。
          </p>
        </>
      );
    case "no_votes":
      return (
        <>
          {model.accepting && !model.pastClose && <Deadline status={status} />}
          <Note>{describeNoVotes(model)}</Note>
        </>
      );
    case "results": {
      const { primary, afterClose, verdict, headline, gap } = model;
      return (
        <>
          {model.openedAfterClose && <Note>{OPENED_AFTER_CLOSE_NOTE}</Note>}
          {headline && (
            <p className="flex items-baseline justify-between gap-2 text-sm font-bold">
              <span className="text-stance-for-strong">
                賛成{" "}
                <span className="font-lexend text-2xl">
                  {headline.percent.for}
                </span>
                %
              </span>
              <span className="text-stance-against">
                反対{" "}
                <span className="font-lexend text-2xl">
                  {headline.percent.against}
                </span>
                %
              </span>
            </p>
          )}
          {primary && (
            <VoteResultBar label={primary.label} tally={primary.tally} />
          )}
          {verdict?.note && (
            <p className="text-xs leading-relaxed text-mirai-text-secondary">
              {verdict.note}
            </p>
          )}
          {afterClose && (
            <div
              className={cn(
                "flex flex-col gap-1.5",
                primary && "border-line-soft border-t pt-3"
              )}
            >
              <VoteResultBar
                label={afterClose.label}
                tally={afterClose.tally}
              />
              <p className="text-xs leading-relaxed text-mirai-text-muted">
                採決後の票は、議会の議決との比較と多数の判定には使いません。
              </p>
            </div>
          )}
          {gap && <CouncilGap gap={gap} />}
        </>
      );
    }
  }
}

function describeNoVotes(
  model: Extract<CitizenVoteResultModel, { kind: "no_votes" }>
): string {
  if (!model.pastClose) return "まだ票がありません。";
  if (model.openedAfterClose) {
    return model.accepting
      ? "この議案は採決のあとに受付を始めたため、票はすべて「採決後の票」として数えます（議会の議決とは比べません）。まだ票がありません。"
      : "この議案には、区民投票の票がありません。";
  }
  return model.accepting
    ? "この議案には、まだ区民投票の票がありません。採決のあとも「採決後の票」として受け付けています（採決前の票とは分けて数えます）。"
    : "この議案には、区民投票の票がありません。";
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-mirai-text-secondary">
      {children}
    </p>
  );
}

function Deadline({ status }: { status: PollStatusDescription }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-mirai-text">
      {status.headline}
      {status.remaining && (
        <LabelPill tone="solid">{status.remaining}</LabelPill>
      )}
    </p>
  );
}

/** 議会の議決と、採決前の区民の多数のズレ。分かれたときは濃色で目立たせる */
function CouncilGap({ gap }: { gap: CouncilGapView }) {
  const diverges = gap.relation === "diverge";
  return (
    <div
      data-surface={diverges ? "dark" : undefined}
      className={cn(
        "flex flex-col gap-1.5 rounded-xl px-3 py-2.5",
        diverges
          ? "bg-brand-header text-brand-on-header"
          : "bg-mirai-surface text-mirai-text"
      )}
    >
      <p className="flex items-center gap-1.5 text-sm font-bold">
        <Scale className="size-4 shrink-0" aria-hidden />
        {gap.headline}
      </p>
      <p className="text-sm">
        議会：<strong>{gap.councilLabel}</strong>
        {" ／ "}
        区民（採決前 {gap.citizensTotal}票）：
        <strong>{gap.citizensLabel}</strong>
      </p>
      <p
        className={cn(
          "text-xs leading-relaxed",
          diverges ? "text-brand-on-header-muted" : "text-mirai-text-secondary"
        )}
      >
        {gap.message}
      </p>
    </div>
  );
}

function VoteLink({ href, children }: { href: string; children: ReactNode }) {
  const className =
    "-my-2 inline-flex min-h-11 items-center gap-1 self-start py-2 text-sm font-bold text-brand-link hover:text-brand-link-hover hover:underline";
  // 同じページの帯へはページ内リンク、ほかのページからは議案ページへ
  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {children}
        <ArrowDown className="size-4" aria-hidden />
      </a>
    );
  }
  return (
    <Link href={href as Route} className={className}>
      {children}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}
