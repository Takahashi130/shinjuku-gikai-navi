import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { BillStatusEnum } from "@/features/bills/shared/types";
import type { ParticipantEligibility } from "@/lib/participation/resolve-eligibility";
import { chunk, IN_QUERY_CHUNK_SIZE } from "@/lib/utils/chunk";
import type { DecisionPoll, VoteChoice } from "../../shared/types";
import type { PollResponseCountRow } from "../../shared/utils/summarize-citizen-votes";
import { toDecisionPoll } from "../../shared/utils/to-decision-poll";

/** 議決への賛否の回（polls.kind = 'decision', round = 0） */
const DECISION_KIND = "decision";
const DECISION_ROUND = 0;

const POLL_COLUMNS =
  "id, bill_id, opens_at, closes_at, accepts_after_close, is_hidden, audience, options";

export type BillForVote = {
  id: string;
  slug: string | null;
  name: string;
  status: BillStatusEnum;
  publishStatus: string;
};

/**
 * 議案と、その「議決」の投票の回をまとめて取る。議案が無ければ null。
 * 公開前の議案も返す（投票できるかは呼び出し側で publish_status を見て決める）。
 */
export async function findDecisionPollContext(
  billId: string
): Promise<{ bill: BillForVote; poll: DecisionPoll | null } | null> {
  const supabase = createAdminClient();
  const [billResult, pollResult] = await Promise.all([
    supabase
      .from("bills")
      .select("id, slug, name, status, publish_status")
      .eq("id", billId)
      .maybeSingle(),
    supabase
      .from("polls")
      .select(POLL_COLUMNS)
      .eq("bill_id", billId)
      .eq("kind", DECISION_KIND)
      .eq("round", DECISION_ROUND)
      .maybeSingle(),
  ]);

  if (billResult.error) {
    throw new Error(`Failed to fetch bill: ${billResult.error.message}`);
  }
  if (pollResult.error) {
    throw new Error(`Failed to fetch poll: ${pollResult.error.message}`);
  }
  if (!billResult.data) return null;

  return {
    bill: {
      id: billResult.data.id,
      slug: billResult.data.slug,
      name: billResult.data.name,
      status: billResult.data.status,
      publishStatus: billResult.data.publish_status,
    },
    poll: pollResult.data ? toDecisionPoll(pollResult.data) : null,
  };
}

/** 一覧のバッジ用に、複数議案の slug と議決の状態を取る */
export async function findBillsForVoteByIds(
  billIds: string[]
): Promise<BillForVote[]> {
  if (billIds.length === 0) return [];
  const supabase = createAdminClient();
  const bills: BillForVote[] = [];
  for (const ids of chunk(billIds, IN_QUERY_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("bills")
      .select("id, slug, name, status, publish_status")
      .in("id", ids);
    if (error) {
      throw new Error(`Failed to fetch bills: ${error.message}`);
    }
    for (const row of data) {
      bills.push({
        id: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status,
        publishStatus: row.publish_status,
      });
    }
  }
  return bills;
}

/** 複数議案の「議決」の回を、議案 ID ごとに返す */
export async function findDecisionPollsByBillIds(
  billIds: string[]
): Promise<Map<string, DecisionPoll>> {
  const polls = new Map<string, DecisionPoll>();
  if (billIds.length === 0) return polls;

  const supabase = createAdminClient();
  for (const ids of chunk(billIds, IN_QUERY_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("polls")
      .select(POLL_COLUMNS)
      .in("bill_id", ids)
      .eq("kind", DECISION_KIND)
      .eq("round", DECISION_ROUND);
    if (error) {
      throw new Error(`Failed to fetch polls: ${error.message}`);
    }
    for (const row of data) {
      if (row.bill_id) polls.set(row.bill_id, toDecisionPoll(row));
    }
  }
  return polls;
}

/**
 * 議案ごとの票数（選択肢・資格・締切の前後別）を DB で集計して返す。
 * 非表示の回は数えない（RPC 側で除く）。
 */
export async function countDecisionResponsesByBillIds(
  billIds: string[]
): Promise<PollResponseCountRow[]> {
  if (billIds.length === 0) return [];
  const supabase = createAdminClient();
  const rows: PollResponseCountRow[] = [];
  for (const ids of chunk(billIds, IN_QUERY_CHUNK_SIZE)) {
    const { data, error } = await supabase.rpc(
      "count_poll_responses_by_bill_ids",
      { p_bill_ids: ids, p_kind: DECISION_KIND }
    );
    if (error) {
      throw new Error(`Failed to count poll responses: ${error.message}`);
    }
    rows.push(...data);
  }
  return rows;
}

export type UserPollResponse = {
  choice: string | null;
  respondedAt: string;
  readExplainer: boolean;
};

/** 本人の票（無ければ null） */
export async function findUserPollResponse(
  pollId: string,
  userId: string
): Promise<UserPollResponse | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("poll_responses")
    .select("choice, responded_at, read_explainer")
    .eq("poll_id", pollId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch poll response: ${error.message}`);
  }
  if (!data) return null;
  return {
    choice: data.choice,
    respondedAt: data.responded_at,
    readExplainer: data.read_explainer,
  };
}

/**
 * 票を入れる（1人1回。すでにあれば選び直しとして上書きし、responded_at を更新する）。
 * eligibility は投票した時点の値をそのまま記録する。
 */
export async function upsertPollChoice(input: {
  pollId: string;
  userId: string;
  choice: VoteChoice;
  eligibility: ParticipantEligibility;
  readExplainer: boolean;
  respondedAt: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("poll_responses").upsert(
    {
      poll_id: input.pollId,
      user_id: input.userId,
      choice: input.choice,
      eligibility: input.eligibility,
      read_explainer: input.readExplainer,
      responded_at: input.respondedAt,
    },
    { onConflict: "poll_id,user_id" }
  );
  if (error) {
    throw new Error(`Failed to save poll response: ${error.message}`);
  }
}

/** 本人の票を消す（取り消し） */
export async function deletePollResponse(
  pollId: string,
  userId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("poll_responses")
    .delete()
    .eq("poll_id", pollId)
    .eq("user_id", userId);
  if (error) {
    throw new Error(`Failed to delete poll response: ${error.message}`);
  }
}
