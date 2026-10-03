import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import { fetchAllRows } from "@/lib/utils/fetch-all-rows";

/**
 * 議員・会派のデータ（取り込み処理 shinjuku-importer が区の公開ページから書き込む）。
 *
 * どのテーブルにも議員の住所・電話・メール・顔写真は無い。
 */

// ============================================================
// 議員・会派
// ============================================================

/** 今の議員名簿にある議員（議席番号順）。 */
export async function findCurrentMembers() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("members")
    .select(
      "id, name, name_kana, seat_number, elected_count, faction_id, source_url"
    )
    .eq("is_current", true)
    .order("seat_number", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });
  if (error) {
    throw new Error(`Failed to fetch members: ${error.message}`);
  }
  return data;
}

/** 議員1人。今の名簿から外れた議員も返す（呼び出し側で is_current を見る）。 */
export async function findMemberById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("members")
    .select(
      "id, name, name_kana, seat_number, elected_count, faction_id, is_current, source_url"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch member: ${error.message}`);
  }
  return data;
}

/** 今の会派構成ページにある会派（区のページの並び）。 */
export async function findCurrentFactions() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("factions")
    .select(
      "id, slug, name, short_name, sort_order, formed_on, note, source_url"
    )
    .eq("is_current", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) {
    throw new Error(`Failed to fetch factions: ${error.message}`);
  }
  return data;
}

/** 会派1つ（今の会派でなくても返す）。 */
export async function findFactionById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("factions")
    .select(
      "id, slug, name, short_name, sort_order, formed_on, note, source_url, is_current"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch faction: ${error.message}`);
  }
  return data;
}

/** 会派の名前の履歴（今の会派かどうかつき）。議案ページの会派名からリンクを引くのに使う。 */
export async function findFactionNamesWithFaction() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("faction_names")
    .select("name, factions!inner (slug, is_current)");
  if (error) {
    throw new Error(`Failed to fetch faction names: ${error.message}`);
  }
  return data;
}

// ============================================================
// 任期・会派の所属・役職
// ============================================================

/** 今の任期（任期の番号がいちばん大きいもの。議員全員で同じ）。 */
export async function findLatestTerm() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("member_terms")
    .select("term_number, term_start, term_end, election_date")
    .order("term_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch latest term: ${error.message}`);
  }
  return data;
}

export async function findMemberTerms(memberId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("member_terms")
    .select("term_number, term_start, term_end, election_date, source_url")
    .eq("member_id", memberId)
    .order("term_number", { ascending: false });
  if (error) {
    throw new Error(`Failed to fetch member terms: ${error.message}`);
  }
  return data;
}

export async function findFactionMemberships(memberId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("faction_memberships")
    .select(
      "faction_id, first_seen_on, last_seen_on, is_current, factions!inner (name, slug, is_current)"
    )
    .eq("member_id", memberId)
    .order("first_seen_on", { ascending: false });
  if (error) {
    throw new Error(`Failed to fetch faction memberships: ${error.message}`);
  }
  return data;
}

/** 全議員の役職（一覧のカードに委員会を出すため。100件ほど）。 */
export async function findAllMemberPositions() {
  const supabase = createAdminClient();
  return fetchAllRows((from, to) =>
    supabase
      .from("member_positions")
      .select("member_id, body_kind, body_name, role, sort_order, source_url")
      .order("member_id", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)
  ).catch((error: unknown) => {
    throw new Error(
      `Failed to fetch member positions: ${error instanceof Error ? error.message : String(error)}`
    );
  });
}

export async function findMemberPositions(memberId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("member_positions")
    .select("body_kind, body_name, role, sort_order, source_url")
    .eq("member_id", memberId)
    .order("sort_order", { ascending: true });
  if (error) {
    throw new Error(`Failed to fetch member positions: ${error.message}`);
  }
  return data;
}

// ============================================================
// 本会議の質問
// ============================================================

/**
 * 回数を数えるための軽い行（全議員分）。一覧のカードに回数を出すのに使う。
 * いちばん古い会期の名前も、「〜以降」の表示に使う。
 */
export async function findPlenaryQuestionStatsRows() {
  const supabase = createAdminClient();
  return fetchAllRows((from, to) =>
    supabase
      .from("plenary_questions")
      .select("member_id, question_type, topic_count, asked_on, session_title")
      .order("asked_on", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)
  ).catch((error: unknown) => {
    throw new Error(
      `Failed to fetch plenary questions: ${error instanceof Error ? error.message : String(error)}`
    );
  });
}

export async function findPlenaryQuestionsByMemberId(memberId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("plenary_questions")
    .select(
      "id, session_title, question_type, asked_on, faction_name, answer_style, sort_order, source_url, topics"
    )
    .eq("member_id", memberId)
    .order("asked_on", { ascending: false })
    .order("sort_order", { ascending: true });
  if (error) {
    throw new Error(`Failed to fetch plenary questions: ${error.message}`);
  }
  return data;
}

// ============================================================
// 会派の賛否・政務活動費・議員提出議案
// ============================================================

/**
 * 会派の議案への賛否（公開済みの議案だけ）。議案と会期の日付つき。
 * 会派によっては900件近くあるので、range で分けて全件を集める。
 */
export async function findFactionVotesWithBills(factionId: string) {
  const supabase = createAdminClient();
  return fetchAllRows((from, to) =>
    supabase
      .from("bill_faction_votes")
      .select(
        `
        vote,
        note,
        faction_name,
        bills!inner (
          id,
          name,
          is_featured,
          submitted_date,
          publish_status,
          diet_sessions (name, end_date)
        )
      `
      )
      .eq("faction_id", factionId)
      .eq("bills.publish_status", "published")
      .order("bill_id", { ascending: true })
      .order("faction_abbr", { ascending: true })
      .range(from, to)
  ).catch((error: unknown) => {
    throw new Error(
      `Failed to fetch faction votes: ${error instanceof Error ? error.message : String(error)}`
    );
  });
}

export async function findFactionExpenses(factionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("faction_activity_expenses")
    .select(
      `
      id,
      fiscal_year,
      period_label,
      period_start,
      period_end,
      faction_name,
      member_count,
      income,
      research_expense,
      training_expense,
      publicity_expense,
      hearing_expense,
      petition_expense,
      meeting_expense,
      materials_expense,
      personnel_expense,
      office_expense,
      total_expense,
      notes,
      source_title,
      source_url
    `
    )
    .eq("faction_id", factionId)
    .order("period_start", { ascending: false });
  if (error) {
    throw new Error(`Failed to fetch faction expenses: ${error.message}`);
  }
  return data;
}

/**
 * 議員提出議案（slug が「…-giin-N」の議案）。区の資料には提出者が無いので、
 * 区議会全体の件数と新しいものだけを出す。
 */
export async function findMemberSubmittedBills(limit: number) {
  const supabase = createAdminClient();
  const { data, error, count } = await supabase
    .from("bills")
    .select("id, name, status, submitted_date", { count: "exact" })
    .eq("publish_status", "published")
    .like("slug", "%-giin-%")
    .order("submitted_date", { ascending: false, nullsFirst: false })
    .order("slug", { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(`Failed to fetch member-submitted bills: ${error.message}`);
  }
  return { bills: data, totalCount: count ?? data.length };
}
