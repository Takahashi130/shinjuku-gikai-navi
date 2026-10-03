import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import { chunk, IN_QUERY_CHUNK_SIZE } from "@/lib/utils/chunk";
import type { BillExplainerRow } from "../../shared/utils/parse-explainer-row";

const EXPLAINER_COLUMNS =
  "bill_id, status, body, sources, version, reviewed_at, reviewed_by, generated_by, publish_at, first_published_at, updated_at, source_path";

export type BillExplainerContext = {
  billId: string;
  billSlug: string | null;
  billName: string;
  /** 採決の予定：投票の回の締切（先議などで個別に決めたもの）→ 会期の採決予定の順 */
  voteAt: string | null;
  explainer: BillExplainerRow | null;
};

/**
 * 議案の解説と、解説を出せるかの判断に使う情報（slug・議案名・採決予定）をまとめて取る。
 * 議案が無ければ null。status を問わず返すので、公開してよいかは呼び出し側で決める。
 */
export async function findBillExplainerContext(
  billId: string
): Promise<BillExplainerContext | null> {
  const supabase = createAdminClient();
  const [billResult, explainerResult, pollResult] = await Promise.all([
    supabase
      .from("bills")
      .select("id, slug, name, diet_sessions(final_vote_at)")
      .eq("id", billId)
      .maybeSingle(),
    supabase
      .from("bill_explainers")
      .select(EXPLAINER_COLUMNS)
      .eq("bill_id", billId)
      .maybeSingle(),
    supabase
      .from("polls")
      .select("closes_at")
      .eq("bill_id", billId)
      .eq("kind", "decision")
      .eq("round", 0)
      .maybeSingle(),
  ]);

  if (billResult.error) {
    throw new Error(`Failed to fetch bill: ${billResult.error.message}`);
  }
  if (explainerResult.error) {
    throw new Error(
      `Failed to fetch bill explainer: ${explainerResult.error.message}`
    );
  }
  if (pollResult.error) {
    throw new Error(`Failed to fetch poll: ${pollResult.error.message}`);
  }
  if (!billResult.data) return null;

  return {
    billId: billResult.data.id,
    billSlug: billResult.data.slug,
    billName: billResult.data.name,
    voteAt:
      pollResult.data?.closes_at ??
      billResult.data.diet_sessions?.final_vote_at ??
      null,
    explainer: explainerResult.data,
  };
}

export type ExplainerPublicationRow = {
  bill_id: string;
  status: string;
  reviewed_at: string | null;
  publish_at: string | null;
};

/** 一覧のバッジ用に、複数議案の解説の公開状態だけを取る（本文は取らない） */
export async function findExplainerPublicationsByBillIds(
  billIds: string[]
): Promise<ExplainerPublicationRow[]> {
  if (billIds.length === 0) return [];
  const supabase = createAdminClient();
  const rows: ExplainerPublicationRow[] = [];
  for (const ids of chunk(billIds, IN_QUERY_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("bill_explainers")
      .select("bill_id, status, reviewed_at, publish_at")
      .in("bill_id", ids);
    if (error) {
      throw new Error(
        `Failed to fetch bill explainer statuses: ${error.message}`
      );
    }
    rows.push(...data);
  }
  return rows;
}
