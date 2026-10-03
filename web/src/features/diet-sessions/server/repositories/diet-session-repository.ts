import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { DietSession } from "../../shared/types";

/**
 * アクティブな国会会期を取得
 */
export async function findActiveDietSession(): Promise<DietSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("diet_sessions")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch active diet session:", error);
    return null;
  }

  return data;
}

/**
 * 指定日時点で開催中の国会会期を取得
 */
export async function findCurrentDietSession(
  targetDate: string
): Promise<DietSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("diet_sessions")
    .select("*")
    .lte("start_date", targetDate)
    .gte("end_date", targetDate)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch current diet session:", error);
    return null;
  }

  return data;
}

/**
 * slugで国会会期を取得
 */
export async function findDietSessionBySlug(
  slug: string
): Promise<DietSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("diet_sessions")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch diet session by slug:", error);
    return null;
  }

  return data;
}

/**
 * 指定日より前の直近の国会会期を取得
 */
export async function findPreviousDietSession(
  beforeStartDate: string
): Promise<DietSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("diet_sessions")
    .select("*")
    .lt("start_date", beforeStartDate)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch previous diet session:", error);
    return null;
  }

  return data;
}

/**
 * 指定日より前に閉会した直近の会期を返す。
 *
 * 閉会中のトップページで「どの会期が終わったか」を出すために使う。
 * `findPreviousDietSession` はアクティブ会期の開始日を基準に「その前」を返すので、
 * 閉会中（アクティブ会期が無い、または日付が範囲外）の用途には合わない。
 */
export async function findLatestClosedDietSession(
  onDate: string
): Promise<DietSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("diet_sessions")
    .select("*")
    .lt("end_date", onDate)
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // 同ファイルの他の取得関数と同じく、失敗はカードを出さないだけに留める。
    // トップページ全体を500にするほどの情報ではない。
    console.error("Failed to fetch latest closed diet session:", error);
    return null;
  }
  return data;
}

/**
 * id で会期を取得する。議案ページで、その議案の会期（会期名と会期別一覧への
 * リンク）を出すために使う。
 */
export async function findDietSessionById(
  id: string
): Promise<DietSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("diet_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    // 議案ページの補助的な情報なので、失敗しても画面全体は落とさない。
    console.error("Failed to fetch diet session by id:", error);
    return null;
  }
  return data;
}

/**
 * 開始日が新しい順に会期を返す。トップの「会期から探す」に使う。
 * 一覧ページ（/kokkai/[slug]/bills）へリンクするので、slug の無い会期は除く。
 */
export async function findRecentDietSessions(
  limit: number
): Promise<DietSession[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("diet_sessions")
    .select("*")
    .not("slug", "is", null)
    .order("start_date", { ascending: false })
    .limit(limit);

  if (error) {
    // トップの補助的な情報なので、失敗しても画面全体は落とさない。
    console.error("Failed to fetch recent diet sessions:", error);
    return [];
  }
  return data;
}
