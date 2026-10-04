import type { ExpenseEstimate, MembershipPeriod } from "../types";
import {
  type ExpenseEstimateSource,
  latestExpenseEstimate,
} from "./faction-expenses";
import {
  type FactionHistory,
  resolveMembershipWindowWithHistory,
} from "./membership-window";

type MembershipRow = Pick<
  MembershipPeriod,
  "faction_id" | "first_seen_on" | "last_seen_on"
> & { member_id: string };

type ExpenseRow = ExpenseEstimateSource & { faction_id: string | null };

/**
 * 議員の一覧のカードに出す「所属会派の政務活動費・1人あたりの目安」を、
 * 議員ごとにまとめて出す。
 *
 * 議員のページ（getMemberProfile）と同じく、今の会派にいた期間
 * （resolveMembershipWindowWithHistory）にかかる、いちばん新しい期間を使う。
 * 会派に属していない議員・期間にかかる収支一覧の無い議員は null。
 *
 * termStart は今の任期の始まり（議員全員で同じ）。
 */
export function buildMemberExpenseEstimates({
  members,
  memberships,
  expenses,
  termStart,
  history = EMPTY_HISTORY,
}: {
  members: readonly { id: string; factionId: string | null }[];
  memberships: readonly MembershipRow[];
  expenses: readonly ExpenseRow[];
  termStart: string | null;
  /** 会派の結成・消滅・名前の変更の日（会派を移った議員の入った日に使う） */
  history?: FactionHistory;
}): Map<string, ExpenseEstimate | null> {
  const membershipsByMember = groupBy(memberships, (row) => row.member_id);
  const expensesByFaction = groupBy(expenses, (row) => row.faction_id);

  return new Map(
    members.map((member) => {
      if (!member.factionId) return [member.id, null];
      const window = resolveMembershipWindowWithHistory({
        memberships: membershipsByMember.get(member.id) ?? [],
        currentFactionId: member.factionId,
        termStart,
        history,
      });
      return [
        member.id,
        latestExpenseEstimate(
          expensesByFaction.get(member.factionId) ?? [],
          window.start
        ),
      ];
    })
  );
}

const EMPTY_HISTORY: FactionHistory = { factions: [], names: [] };

function groupBy<T, K>(rows: readonly T[], keyOf: (row: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return groups;
}
