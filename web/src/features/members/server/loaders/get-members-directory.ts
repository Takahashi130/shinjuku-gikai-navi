import "server-only";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type {
  FactionSummary,
  MemberListItem,
  MemberPosition,
} from "../../shared/types";
import {
  buildProfileSources,
  type ProfileSource,
} from "../../shared/utils/profile-sources";
import {
  emptyQuestionStats,
  tallyQuestionsByMember,
} from "../../shared/utils/question-stats";
import {
  findAllMemberPositions,
  findCurrentFactions,
  findCurrentMembers,
  findLatestTerm,
  findPlenaryQuestionStatsRows,
} from "../repositories/member-repository";

export type MembersDirectory = {
  members: MemberListItem[];
  factions: FactionSummary[];
  /** 今の任期（第20期など）。名簿に任期が無ければ null */
  term: {
    termNumber: number;
    termStart: string;
    termEnd: string;
  } | null;
  /** 質問の回数を数え始めた会期（いちばん古い質問の会期）。質問が無ければ null */
  questionsSince: { sessionTitle: string; askedOn: string } | null;
  /** 一覧の出典（区の HTML ページ） */
  sources: ProfileSource[];
};

/**
 * 議員の一覧（/members）とサイトマップ用に、今の議員と会派をまとめて返す。
 * 区のデータは取り込みのときにしか変わらないので、1時間キャッシュする
 * （取り込み処理が /api/revalidate でタグごと消す）。
 */
export async function getMembersDirectory(): Promise<MembersDirectory> {
  return _getCachedMembersDirectory();
}

const _getCachedMembersDirectory = unstable_cache(
  async (): Promise<MembersDirectory> => {
    const [members, factions, positions, questionRows, term] =
      await Promise.all([
        findCurrentMembers(),
        findCurrentFactions(),
        findAllMemberPositions(),
        findPlenaryQuestionStatsRows(),
        findLatestTerm(),
      ]);

    const questionStats = tallyQuestionsByMember(questionRows);
    const positionsByMember = new Map<string, MemberPosition[]>();
    for (const {
      member_id,
      body_kind,
      body_name,
      role,
      sort_order,
    } of positions) {
      const list = positionsByMember.get(member_id) ?? [];
      list.push({ body_kind, body_name, role, sort_order });
      positionsByMember.set(member_id, list);
    }

    // 行は質問した日の古い順に並んでいる
    const [oldest] = questionRows;

    return {
      members: members.map((member) => ({
        id: member.id,
        name: member.name,
        nameKana: member.name_kana,
        seatNumber: member.seat_number,
        electedCount: member.elected_count,
        factionId: member.faction_id,
        positions: positionsByMember.get(member.id) ?? [],
        questions: questionStats.get(member.id) ?? emptyQuestionStats(),
      })),
      factions,
      term: term
        ? {
            termNumber: term.term_number,
            termStart: term.term_start,
            termEnd: term.term_end,
          }
        : null,
      questionsSince: oldest
        ? { sessionTitle: oldest.session_title, askedOn: oldest.asked_on }
        : null,
      sources: members[0]
        ? buildProfileSources({
            memberSourceUrl: members[0].source_url,
            factionSourceUrl:
              factions.find((faction) => faction.source_url)?.source_url ??
              null,
            positions: positions.filter((p) => p.body_kind !== "faction"),
            expenses: [],
          })
        : [],
    };
  },
  ["members-directory-v1"],
  {
    revalidate: 3600,
    tags: [CACHE_TAGS.MEMBERS],
  }
);
