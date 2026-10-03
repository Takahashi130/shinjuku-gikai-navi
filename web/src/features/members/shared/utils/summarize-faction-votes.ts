import type { VoteTally } from "@/features/bills/shared/utils/parse-bill-votes";
import type { FactionVoteRecord } from "../types";
import { isOnOrAfter } from "./membership-window";

/**
 * 会派の議案への賛否（区の「議案の概要と審議結果」の表）をまとめる。
 *
 * 区は賛否を会派ごとに公表しており、議員1人ひとりの賛否は分からない。
 * 会派の中で分かれたときは「1人反対」のような補足（note）だけが残る。
 */

export type FactionVotesSummary = {
  /** 期間内で、会派の賛否が分かっている議案の数 */
  total: number;
  forCount: number;
  againstCount: number;
  /** 表に記号が無かったなど、賛否が読めなかった議案の数 */
  unknownCount: number;
  /** 会派の中で賛否が分かれた（補足が付いた）議案の数 */
  internalSplitCount: number;
  /** 反対した議案（新しい順） */
  against: FactionVoteRecord[];
  /** 会派の賛否が分かれた議案のうち、この会派が賛成した議案（新しい順） */
  splitFor: FactionVoteRecord[];
  /** 期間内でいちばん古い会期の名前（「〜以降」の表示に使う） */
  oldestSessionName: string | null;
};

/**
 * 会期の終わり（＝採決の日）が新しい順。会期の分からない議案は後ろに回す。
 * 同じ会期の中は提出日の新しい順、最後に名前で順序を固定する。
 */
function compareNewestFirst(a: FactionVoteRecord, b: FactionVoteRecord) {
  const aDate = a.session?.endDate ?? "";
  const bDate = b.session?.endDate ?? "";
  return (
    bDate.localeCompare(aDate) ||
    (b.bill.submittedDate ?? "").localeCompare(a.bill.submittedDate ?? "") ||
    a.bill.name.localeCompare(b.bill.name, "ja")
  );
}

/**
 * windowStart（resolveMembershipWindowStart）以降の会期の賛否だけを数える。
 * windowStart があるとき、会期の分からない議案は、期間内か確かめられないので外す。
 */
export function summarizeFactionVotes(
  records: readonly FactionVoteRecord[],
  windowStart: string | null
): FactionVotesSummary {
  const inWindow = records
    .filter((record) =>
      windowStart === null
        ? true
        : record.session !== null &&
          isOnOrAfter(record.session.endDate, windowStart)
    )
    .sort(compareNewestFirst);

  const oldest = inWindow.at(-1)?.session?.name ?? null;

  return {
    total: inWindow.length,
    forCount: inWindow.filter((r) => r.vote === "for").length,
    againstCount: inWindow.filter((r) => r.vote === "against").length,
    unknownCount: inWindow.filter((r) => r.vote === "unknown").length,
    internalSplitCount: inWindow.filter((r) => r.note).length,
    against: inWindow.filter((r) => r.vote === "against"),
    splitFor: inWindow.filter((r) => r.vote === "for" && r.bill.isSplit),
    oldestSessionName: oldest,
  };
}

/**
 * 賛成・反対の帯（VoteSplitBar）に渡す形にする。賛否の読めなかった議案は数えない。
 * ここでの数は会派の数ではなく議案の件数。
 */
export function toBillVoteTally(
  summary: Pick<FactionVotesSummary, "forCount" | "againstCount">
): VoteTally {
  const total = summary.forCount + summary.againstCount;
  return {
    forCount: summary.forCount,
    againstCount: summary.againstCount,
    forPercent:
      total === 0 ? null : Math.round((summary.forCount / total) * 100),
  };
}
