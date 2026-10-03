import "server-only";
import { unstable_cache } from "next/cache";
import { isUuid } from "@/features/open-data/shared/utils/uuid";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type {
  FactionExpense,
  FactionSummary,
  FactionVoteRecord,
  MemberPosition,
  MemberQuestion,
  MemberSubmittedBill,
  MembershipPeriod,
} from "../../shared/types";
import {
  selectExpensesInWindow,
  sortExpensesNewestFirst,
} from "../../shared/utils/faction-expenses";
import {
  resolveMembershipWindowStart,
  sortMembershipsNewestFirst,
} from "../../shared/utils/membership-window";
import {
  buildProfileSources,
  type ProfileSource,
} from "../../shared/utils/profile-sources";
import {
  parseQuestionTopics,
  sortQuestionsNewestFirst,
} from "../../shared/utils/question-stats";
import {
  type FactionVotesSummary,
  summarizeFactionVotes,
} from "../../shared/utils/summarize-faction-votes";
import {
  findFactionById,
  findFactionExpenses,
  findFactionMemberships,
  findFactionVotesWithBills,
  findMemberById,
  findMemberPositions,
  findMemberSubmittedBills,
  findMemberTerms,
  findPlenaryQuestionsByMemberId,
} from "../repositories/member-repository";

/** 議員のページに出す議員提出議案（区議会全体）の件数。 */
const SUBMITTED_BILLS_LIMIT = 5;

export type MemberProfile = {
  member: {
    id: string;
    name: string;
    nameKana: string | null;
    seatNumber: number | null;
    electedCount: number | null;
  };
  /** 今の会派。会派に属していなければ null */
  faction: FactionSummary | null;
  /** 今の任期 */
  term: {
    termNumber: number;
    termStart: string;
    termEnd: string;
    electionDate: string | null;
  } | null;
  /** 会派の所属の履歴（今の会派が先、続けて新しい順） */
  memberships: MembershipPeriod[];
  positions: MemberPosition[];
  /** 本会議の質問（新しい順） */
  questions: MemberQuestion[];
  /**
   * 今の会派の賛否・政務活動費を、この議員に結び付ける期間の始まり
   * （resolveMembershipWindowStart）。null は区切らない
   */
  windowStart: string | null;
  votes: FactionVotesSummary;
  /** 期間内の政務活動費（新しい順） */
  expenses: FactionExpense[];
  submittedBills: { bills: MemberSubmittedBill[]; totalCount: number };
  sources: ProfileSource[];
};

/**
 * 議員のページ（/members/[id]）のデータ。今の議員名簿に無い id は null。
 * 区のデータは取り込みのときにしか変わらないので1時間キャッシュする。
 */
export async function getMemberProfile(
  id: string
): Promise<MemberProfile | null> {
  // uuid でない id を DB に渡すと型のエラーになるので、先に見つからない扱いにする
  if (!isUuid(id)) return null;
  return _getCachedMemberProfile(id);
}

const _getCachedMemberProfile = unstable_cache(
  async (id: string): Promise<MemberProfile | null> => {
    const member = await findMemberById(id);
    if (!member || !member.is_current) return null;

    const factionId = member.faction_id;
    const [
      faction,
      terms,
      membershipRows,
      positionRows,
      questionRows,
      voteRows,
      expenseRows,
      submittedBills,
    ] = await Promise.all([
      factionId ? findFactionById(factionId) : null,
      findMemberTerms(id),
      findFactionMemberships(id),
      findMemberPositions(id),
      findPlenaryQuestionsByMemberId(id),
      factionId ? findFactionVotesWithBills(factionId) : [],
      factionId ? findFactionExpenses(factionId) : [],
      findMemberSubmittedBills(SUBMITTED_BILLS_LIMIT),
    ]);

    const [latestTerm] = terms;
    const memberships: MembershipPeriod[] = membershipRows.map((row) => ({
      faction_id: row.faction_id,
      first_seen_on: row.first_seen_on,
      last_seen_on: row.last_seen_on,
      is_current: row.is_current,
      factionName: row.factions.name,
      factionSlug: row.factions.slug,
      factionIsCurrent: row.factions.is_current,
    }));
    const windowStart = resolveMembershipWindowStart({
      memberships,
      currentFactionId: factionId,
      termStart: latestTerm?.term_start ?? null,
    });

    const votes: FactionVoteRecord[] = voteRows.map((row) => ({
      vote: row.vote,
      note: row.note,
      faction_name: row.faction_name,
      bill: {
        id: row.bills.id,
        name: row.bills.name,
        isSplit: row.bills.is_featured,
        submittedDate: row.bills.submitted_date,
      },
      session: row.bills.diet_sessions
        ? {
            name: row.bills.diet_sessions.name,
            endDate: row.bills.diet_sessions.end_date,
          }
        : null,
    }));

    const expenses = sortExpensesNewestFirst(
      selectExpensesInWindow(expenseRows, windowStart)
    );

    return {
      member: {
        id: member.id,
        name: member.name,
        nameKana: member.name_kana,
        seatNumber: member.seat_number,
        electedCount: member.elected_count,
      },
      faction: faction
        ? {
            id: faction.id,
            slug: faction.slug,
            name: faction.name,
            short_name: faction.short_name,
            sort_order: faction.sort_order,
            formed_on: faction.formed_on,
            note: faction.note,
            source_url: faction.source_url,
          }
        : null,
      term: latestTerm
        ? {
            termNumber: latestTerm.term_number,
            termStart: latestTerm.term_start,
            termEnd: latestTerm.term_end,
            electionDate: latestTerm.election_date,
          }
        : null,
      memberships: sortMembershipsNewestFirst(memberships),
      positions: positionRows.map(
        ({ body_kind, body_name, role, sort_order }) => ({
          body_kind,
          body_name,
          role,
          sort_order,
        })
      ),
      questions: sortQuestionsNewestFirst(
        questionRows.map(({ topics, ...question }) => ({
          ...question,
          topics: parseQuestionTopics(topics),
        }))
      ),
      windowStart,
      votes: summarizeFactionVotes(votes, windowStart),
      expenses,
      submittedBills: {
        bills: submittedBills.bills.map((bill) => ({
          id: bill.id,
          name: bill.name,
          status: bill.status,
          submittedDate: bill.submitted_date,
        })),
        totalCount: submittedBills.totalCount,
      },
      sources: buildProfileSources({
        memberSourceUrl: member.source_url,
        factionSourceUrl: faction?.source_url ?? null,
        positions: positionRows,
        expenses,
      }),
    };
  },
  ["member-profile-v1"],
  {
    revalidate: 3600,
    // 会派の賛否は議案の公開状態にも左右される
    tags: [CACHE_TAGS.MEMBERS, CACHE_TAGS.BILLS],
  }
);
