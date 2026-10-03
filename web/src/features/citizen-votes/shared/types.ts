import type { BillStatusEnum } from "@/features/bills/shared/types";
import type { PollAudience } from "@/lib/participation/resolve-eligibility";

/** 議決への賛否の選択肢（polls.options の decision は {for,against}） */
export const VOTE_CHOICES = ["for", "against"] as const;
export type VoteChoice = (typeof VOTE_CHOICES)[number];

export const VOTE_CHOICE_LABELS: Record<VoteChoice, string> = {
  for: "賛成",
  against: "反対",
};

export function isVoteChoice(value: unknown): value is VoteChoice {
  return value === "for" || value === "against";
}

/** 「区民は反対多数」と言い切る条件 */
export const VOTE_VERDICT_THRESHOLDS = {
  /** これより少ない票では多数かどうかを示さない */
  minVotes: 30,
  /** 賛成と反対の割合の差がこのポイント以内なら「拮抗」 */
  tieMarginPoints: 5,
} as const;
export type VoteVerdictThresholds = {
  minVotes: number;
  tieMarginPoints: number;
};

export type VoteTally = {
  for: number;
  against: number;
  total: number;
};

/**
 * 1議案の票の集計。
 * - beforeClose / afterClose：締切（本会議の採決予定）の前か後か。資格を問わずすべての票
 * - verifiedBeforeClose：区民確認済みの票だけ（区民認証ができるまでは常に 0）
 */
export type CitizenVoteSummary = {
  beforeClose: VoteTally;
  afterClose: VoteTally;
  verifiedBeforeClose: VoteTally;
};

export type VoteVerdict =
  | "for_majority"
  | "against_majority"
  | "close"
  | "insufficient";

/** 本人の票（画面に出すのは本人にだけ） */
export type MyVote = {
  choice: VoteChoice;
  /** 締切より前に投票（最後に選び直した時刻で判定）したか */
  castBeforeClose: boolean;
};

/** 「議決」の投票の回 */
export type DecisionPoll = {
  id: string;
  opensAt: string;
  closesAt: string | null;
  acceptsAfterClose: boolean;
  isHidden: boolean;
  audience: PollAudience;
  /** 選択肢（decision は ["for","against"]） */
  options: string[];
};

export type PollState =
  | {
      state: "not_applicable";
      reason: "personnel" | "no_poll" | "hidden";
    }
  | { state: "upcoming"; opensAt: string }
  /** 締切前（closesAt が null なら締切なし） */
  | { state: "open"; closesAt: string | null }
  /** 締切（採決）後だが、採決後の票として受け付けている */
  | { state: "open_after_close"; closesAt: string }
  | { state: "closed"; closesAt: string };

/** 投票カードに渡す、1議案ぶんの表示用データ */
export type BillCitizenVotesView = {
  billId: string;
  billSlug: string | null;
  councilStatus: BillStatusEnum;
  pollState: PollState;
  /** 議案が公開済みか（プレビュー中の議案には投票できない） */
  billPublished: boolean;
  /** 本人の票。投票していなければ null */
  myVote: MyVote | null;
  /** ほかの人の結果。本人が投票する前で締切前なら null（見せない） */
  summary: CitizenVoteSummary | null;
  /**
   * 新しい票を受け付けられる設定か（本番で秘密鍵が未設定なら false）。
   * false でも、本人の票の取り消しはできる。
   */
  votingEnabled: boolean;
};

export type VoteActionErrorCode =
  | "invalid_input"
  | "unavailable"
  | "unauthenticated"
  | "rate_limited"
  /** 同じ接続元から同じ議案への新しい票が、1時間の上限を超えた */
  | "rate_limited_bill"
  | "not_found"
  | "not_allowed"
  | "server_error";

export type VoteActionResult =
  | {
      ok: true;
      myVote: MyVote | null;
      summary: CitizenVoteSummary | null;
    }
  | { ok: false; code: VoteActionErrorCode; error: string };
