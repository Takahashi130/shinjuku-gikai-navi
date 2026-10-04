import type { BillStatusEnum } from "@/features/bills/shared/types";
import {
  type CitizenVoteSummary,
  type PollState,
  VOTE_VERDICT_THRESHOLDS,
  type VoteTally,
  type VoteVerdict,
} from "../types";
import {
  type CouncilCitizenRelation,
  compareCouncilAndCitizens,
} from "./compare-council-and-citizens";
import {
  isAcceptingVotes,
  isOpenedAfterClose,
  isPastClose,
} from "./resolve-poll-state";
import {
  judgeVoteVerdict,
  toVotePercentages,
  VOTE_VERDICT_LABELS,
} from "./summarize-citizen-votes";

/** 賛成・反対の横棒1本ぶん */
export type VoteTallyView = {
  /** 例：採決前の票 */
  label: string;
  tally: VoteTally;
  /** 整数の%（合計100）。票が無ければ両方 0 */
  percent: { for: number; against: number };
};

/** 区民の多数の判定（締切前の票だけで決める） */
export type CitizenVerdictView = {
  verdict: VoteVerdict;
  /** 例：反対多数・拮抗・判定なし */
  label: string;
  /** 言い切らない理由など。多数を示すときは null */
  note: string | null;
};

/** 議会の議決と、採決前の区民の多数のズレ */
export type CouncilGapView = {
  relation: Exclude<CouncilCitizenRelation, "undecided">;
  /** 例：可決 */
  councilLabel: string;
  /** 例：反対多数 */
  citizensLabel: string;
  /** 比べた票（採決前の票）の数 */
  citizensTotal: number;
  /** 例：議会と区民の判断が分かれた */
  headline: string;
  message: string;
};

/**
 * 受け付ける状態の回なのに、新しい票を受け付けていない理由。
 * - suspended：受付を止めている（PARTICIPATION_HASH_SECRET が無い。緊急停止）
 * - unpublished：公開前の議案（プレビュー）
 */
export type VoteBlockReason = "suspended" | "unpublished";

/** 受付の状態（結果の面のピル・締切・投票へのリンクに使う） */
type Acceptance = {
  /** いま、この議案に新しい票を投じられるか（受付を止めているとき・公開前は false） */
  accepting: boolean;
  /** 受け付ける状態の回だが、投じられない理由。投じられるか受付期間の外なら null */
  blocked: VoteBlockReason | null;
};

/**
 * 「区民の意思（区民投票）」の面に出すもの。
 * - not_applicable：人事案件・対象外の回
 * - upcoming：受付前
 * - hidden_until_vote：締切前で本人がまだ投票していない（ほかの人の結果は見せない）
 * - no_votes：結果を見せてよいが、まだ1票も無い
 * - results：結果（採決前・採決後の票、多数の判定、議会とのズレ）
 */
export type CitizenVoteResultModel =
  | {
      kind: "not_applicable";
      reason: "personnel" | "no_poll" | "hidden";
      message: string;
    }
  | { kind: "upcoming" }
  | ({ kind: "hidden_until_vote" } & Acceptance)
  | ({
      kind: "no_votes";
      pastClose: boolean;
      /** 締切より後に受付を始めた回（採決前の票が入りようがない） */
      openedAfterClose: boolean;
    } & Acceptance)
  | ({
      kind: "results";
      pastClose: boolean;
      /** 締切より後に受付を始めた回。採決前の票・多数の判定・議会との比較は無い */
      openedAfterClose: boolean;
      /**
       * 締切（採決）前の票。比較と判定に使う。
       * 締切より後に受付を始めた回は null（採決前の票が無いので欄を出さない）
       */
      primary: VoteTallyView | null;
      /** 採決後の票。締切の後か、採決後の票があるときだけ */
      afterClose: VoteTallyView | null;
      /** 多数の判定。締切より後に受付を始めた回は null */
      verdict: CitizenVerdictView | null;
      /**
       * 大きな数字で出す割合。多数を示せるだけ票がある（30票以上）ときだけ。
       * 票が少ないうちに大きく出すと、判定なしでも結果のように見えるため
       */
      headline: VoteTallyView | null;
      /** 議会が議決していて、採決前の票が1票以上あるときだけ */
      gap: CouncilGapView | null;
    } & Acceptance);

const NOT_APPLICABLE_MESSAGES = {
  personnel:
    "人事案件（特定の人の任命などへの同意・意見を求める議案）のため、区民投票の対象にしていません。",
  no_poll: "この議案は区民投票の対象になっていません。",
  hidden: "この議案の区民投票は、受付と結果の表示を止めています。",
} as const;

const GAP_TEXTS: Record<
  CouncilGapView["relation"],
  { headline: string; message: string }
> = {
  diverge: {
    headline: "議会と区民の判断が分かれた",
    message: "議会の議決と、採決前の区民投票（参考値）の多数が分かれました。",
  },
  match: {
    headline: "議会と区民の判断は同じ向き",
    message: "議会の議決と、採決前の区民投票（参考値）の多数は同じ向きでした。",
  },
  close: {
    headline: "区民の票は拮抗",
    message: `採決前の区民投票（参考値）は、賛成と反対の差が${VOTE_VERDICT_THRESHOLDS.tieMarginPoints}ポイント以内の拮抗でした。`,
  },
  insufficient: {
    headline: "比べるには票が足りません",
    message: `採決前の区民投票（参考値）が${VOTE_VERDICT_THRESHOLDS.minVotes}票に届かなかったため、議会と同じ向きかどうかは示していません。`,
  },
};

function toTallyView(label: string, tally: VoteTally): VoteTallyView {
  return { label, tally, percent: toVotePercentages(tally) };
}

function describeVerdict(
  tally: VoteTally,
  pastClose: boolean
): CitizenVerdictView {
  const verdict = judgeVoteVerdict(tally);
  const total = tally.for + tally.against;
  const { minVotes, tieMarginPoints } = VOTE_VERDICT_THRESHOLDS;
  let note: string | null = null;
  if (verdict === "insufficient") {
    note = pastClose
      ? `採決前の票が${minVotes}票に届かなかったため、多数かどうかは示しません。`
      : `${minVotes}票に届くまでは、多数かどうかを示しません（いま${total}票）。`;
  } else if (verdict === "close") {
    note = `賛成と反対の差が${tieMarginPoints}ポイント以内のため、「拮抗」としています。`;
  }
  return { verdict, label: VOTE_VERDICT_LABELS[verdict], note };
}

/** 締切より後に受付を始めた回の説明（結果の面に出す） */
export const OPENED_AFTER_CLOSE_NOTE =
  "この議案は採決のあとに受付を始めたため、採決前の票はありません（議会の議決とは比べません）。";

/**
 * 区民投票の面に何を出すかを決める。
 *
 * summary は、見せてよい結果だけを渡す（本人が投票する前で締切前なら null。
 * shouldRevealResults で決めたもの）。多数の判定と議会との比較は、採決前の票
 * だけで行う（採決後の票は、議会が判断した時点の区民の意見ではないので比べない）。
 *
 * votingEnabled（受付を止めていないか）と billPublished（公開済みか）が false
 * なら、受付期間の中でも「受付中」とは言わない（投票の帯と食い違わないように）。
 */
export function describeCitizenVoteResult(input: {
  pollState: PollState;
  summary: CitizenVoteSummary | null;
  councilStatus: BillStatusEnum;
  billSlug: string | null;
  /** 新しい票を受け付けられる設定か（PARTICIPATION_HASH_SECRET がある） */
  votingEnabled: boolean;
  /** 議案が公開済みか（プレビュー中の議案には投票できない） */
  billPublished: boolean;
}): CitizenVoteResultModel {
  const { pollState, summary } = input;
  if (pollState.state === "not_applicable") {
    return {
      kind: "not_applicable",
      reason: pollState.reason,
      message: NOT_APPLICABLE_MESSAGES[pollState.reason],
    };
  }
  if (pollState.state === "upcoming") return { kind: "upcoming" };

  const acceptance = resolveAcceptance(
    isAcceptingVotes(pollState),
    input.votingEnabled,
    input.billPublished
  );
  if (!summary) return { kind: "hidden_until_vote", ...acceptance };

  const pastClose = isPastClose(pollState);
  const openedAfterClose = isOpenedAfterClose(pollState);
  const { beforeClose, afterClose } = summary;
  if (beforeClose.total === 0 && afterClose.total === 0) {
    return { kind: "no_votes", ...acceptance, pastClose, openedAfterClose };
  }

  if (openedAfterClose) {
    return {
      kind: "results",
      ...acceptance,
      pastClose,
      openedAfterClose,
      primary: null,
      afterClose: toTallyView("採決後の票", afterClose),
      verdict: null,
      headline: null,
      gap: null,
    };
  }

  let gap: CouncilGapView | null = null;
  if (beforeClose.total > 0) {
    const comparison = compareCouncilAndCitizens({
      councilStatus: input.councilStatus,
      billSlug: input.billSlug,
      beforeClose,
    });
    if (comparison.council.decided && comparison.relation !== "undecided") {
      gap = {
        relation: comparison.relation,
        councilLabel: comparison.council.label,
        citizensLabel: comparison.citizens.label,
        citizensTotal: comparison.citizens.total,
        ...GAP_TEXTS[comparison.relation],
      };
    }
  }

  const primary = toTallyView(
    pastClose ? "採決前の票" : "これまでの票",
    beforeClose
  );
  const verdict = describeVerdict(beforeClose, pastClose);
  return {
    kind: "results",
    ...acceptance,
    pastClose,
    openedAfterClose,
    primary,
    afterClose:
      pastClose || afterClose.total > 0
        ? toTallyView("採決後の票", afterClose)
        : null,
    verdict,
    headline: verdict.verdict === "insufficient" ? null : primary,
    gap,
  };
}

function resolveAcceptance(
  open: boolean,
  votingEnabled: boolean,
  billPublished: boolean
): Acceptance {
  if (!open) return { accepting: false, blocked: null };
  // 投票の帯（CastVoteBandView）と同じ順で理由を選ぶ
  if (!votingEnabled) return { accepting: false, blocked: "suspended" };
  if (!billPublished) return { accepting: false, blocked: "unpublished" };
  return { accepting: true, blocked: null };
}
