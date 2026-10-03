/**
 * 会派の所属の履歴（faction_memberships）を作り直す
 *
 * 資料：本会議の質問者一覧に書かれた会派（plenary_questions）と、今の会派（members.faction_id。
 * 会派構成ページ・議員名簿で今日確認したもの）。
 */
import {
  buildMembershipPeriods,
  type MembershipObservation,
} from "./build-membership-periods";
import type { Db } from "./faction-store";

const PAGE_SIZE = 1000;

export async function rebuildFactionMemberships(db: Db, today: string): Promise<number> {
  const { data: members, error } = await db.from("members").select("id, faction_id, is_current");
  if (error) throw error;

  const questions: { member_id: string | null; faction_id: string | null; asked_on: string }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error: qError } = await db
      .from("plenary_questions")
      .select("member_id, faction_id, asked_on")
      .not("member_id", "is", null)
      .not("faction_id", "is", null)
      .order("asked_on")
      .range(from, from + PAGE_SIZE - 1);
    if (qError) throw qError;
    questions.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  const rows = members.flatMap((m) => {
    const observations: MembershipObservation[] = questions
      .filter((q) => q.member_id === m.id && q.faction_id)
      .map((q) => ({ factionId: q.faction_id!, date: q.asked_on, source: "plenary_questions" }));
    if (m.is_current && m.faction_id) observations.push({ factionId: m.faction_id, date: today, source: "faction_page" });
    return buildMembershipPeriods(observations).map((p) => ({
      member_id: m.id,
      faction_id: p.factionId,
      first_seen_on: p.firstSeenOn,
      last_seen_on: p.lastSeenOn,
      is_current: p.isCurrent,
      observation_count: p.observationCount,
      sources: p.sources,
    }));
  });

  const ids = members.map((m) => m.id);
  if (ids.length > 0) {
    const { error: deleteError } = await db.from("faction_memberships").delete().in("member_id", ids);
    if (deleteError) throw deleteError;
  }
  if (rows.length > 0) {
    const { error: insertError } = await db.from("faction_memberships").insert(rows);
    if (insertError) throw insertError;
  }
  return rows.length;
}
