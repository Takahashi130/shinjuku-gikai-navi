import type { MemberListItem } from "../types";
import {
  describeExpenseEstimate,
  type ExpenseFigure,
} from "./faction-expenses";
import { formatCommitteeSeat, groupMemberPositions } from "./member-positions";
import {
  formatCurrentTermSinceShort,
  formatElectedTerms,
  isPresidingOfficerRole,
} from "./term-label";

/** 議員の一覧（/members）のカード1枚に出す文字と数字。 */
export type MemberCardView = {
  /** 「3期・議席番号1番」。どちらも分からなければ空 */
  meta: string;
  /** 議長・副議長 */
  councilRoles: string[];
  /** 「総務区民委員会（委員長）」など。常任 → 議会運営 → 特別の順 */
  committees: string[];
  /** 今の任期の本会議の質問の回数（全員同じ期間） */
  questionCount: number;
  /** 回数を数えた期間など（例：2023年5月〜（今の任期）） */
  questionNote: string;
  /** 所属会派の政務活動費の1人あたりの目安 */
  expense: ExpenseFigure;
};

/**
 * カードの中身を作る。数は並べるだけで、ほかの議員と比べる言葉（多い・少ない
 * など）は付けない（ランキングにしない）。
 *
 * 本会議の質問の回数は、全員同じ期間（今の任期の始まりから。termStart）で
 * 数えたものを出し、その期間を書く。議長・副議長には、在任中は質問していない
 * ことがあると添える。
 */
export function buildMemberCardView(
  member: MemberListItem,
  termStart: string | null
): MemberCardView {
  const { councilRoles, committees } = groupMemberPositions(member.positions);
  const since = formatCurrentTermSinceShort(termStart) ?? "区の資料にある範囲";
  return {
    meta: formatMemberMeta(member),
    councilRoles,
    committees: committees.map(formatCommitteeSeat),
    questionCount: member.questions.count,
    questionNote: councilRoles.some(isPresidingOfficerRole)
      ? `${since}。議長・副議長は在任中、質問しないことがあります`
      : since,
    expense: describeExpenseEstimate(
      member.expenseEstimate,
      member.factionId !== null
    ),
  };
}

/** 「3期・議席番号1番」。分からないものは書かない。期数は区の名簿と同じ書き方。 */
export function formatMemberMeta({
  electedCount,
  seatNumber,
}: Pick<MemberListItem, "electedCount" | "seatNumber">): string {
  return [
    electedCount !== null ? formatElectedTerms(electedCount) : null,
    seatNumber !== null ? `議席番号${seatNumber}番` : null,
  ]
    .filter((part): part is string => part !== null)
    .join("・");
}
