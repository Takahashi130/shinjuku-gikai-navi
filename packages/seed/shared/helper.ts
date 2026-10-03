import { createClient } from "@supabase/supabase-js";
import type { Database } from "@mirai-gikai/supabase";
import { isLocalSupabaseUrl } from "./admin-user";

export type AdminClient = ReturnType<typeof createAdminClient>;

export function createAdminClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

const TABLES_TO_CLEAR = [
  // 区民の票（poll_responses）は回（polls）を on delete restrict で参照し、票のある議案は消せないため、先に消す
  "poll_responses",
  "polls",
  "bill_explainers",
  "interview_report",
  "interview_messages",
  "interview_sessions",
  "interview_questions",
  "interview_configs",
  "mirai_stances",
  "chats",
  "bill_contents",
  "bills_tags",
  "bills",
  "tags",
  "diet_sessions",
] as const;

/**
 * 全テーブルを空にする（ローカルの Supabase 専用）。
 *
 * ルートの pnpm seed / seed:csv は .env を読み、.env は開発用のクラウド DB を指していることがある。
 * 区民の票（poll_responses）・投票の回（polls）・公開済みの解説（bill_explainers）まで消えるので、
 * SUPABASE_URL がローカル（localhost / 127.0.0.1 / ::1）でなければ何も消さずに止める。
 */
export async function clearAllData(supabase: AdminClient) {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!isLocalSupabaseUrl(supabaseUrl)) {
    throw new Error(
      `clearAllData はローカルの Supabase でだけ実行できます（SUPABASE_URL のホストがローカルではありません）。区民の票や公開済みの解説を消さないよう、何も消さずに止めました`
    );
  }

  console.log("🧹 Clearing existing data...");

  for (const table of TABLES_TO_CLEAR) {
    await supabase
      .from(table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
  }

  console.log("✅ Cleared existing data");
}
