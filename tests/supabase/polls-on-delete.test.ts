import { afterAll, describe, expect, it } from "vitest";
import { adminClient, cleanupTestBill, createTestBill } from "./utils";

/**
 * 議案を削除したときの、投票の回（polls）と票（poll_responses）の扱い。
 * - 回は議案と一緒に消える（polls.bill_id は on delete cascade）
 * - 票がある回は消せない（poll_responses.poll_id は on delete restrict）ので、
 *   票のある議案は削除が止まり、票も回も残る
 */
describe("polls / poll_responses の削除の連鎖", () => {
  const billIds: string[] = [];
  const pollIds: string[] = [];

  async function createDecisionPoll(billId: string): Promise<string> {
    const { data, error } = await adminClient
      .from("polls")
      .insert({
        bill_id: billId,
        kind: "decision",
        round: 0,
        response_type: "choice",
        options: ["for", "against"],
      })
      .select("id")
      .single();
    if (error) throw new Error(`poll 作成失敗: ${error.message}`);
    pollIds.push(data.id);
    return data.id;
  }

  afterAll(async () => {
    if (pollIds.length > 0) {
      await adminClient.from("poll_responses").delete().in("poll_id", pollIds);
      await adminClient.from("polls").delete().in("id", pollIds);
    }
    await Promise.allSettled(billIds.map((id) => cleanupTestBill(id)));
  });

  it("票の無い議案は削除でき、回も一緒に消える", async () => {
    const bill = await createTestBill();
    billIds.push(bill.id);
    const pollId = await createDecisionPoll(bill.id);

    const { error } = await adminClient
      .from("bills")
      .delete()
      .eq("id", bill.id);
    expect(error).toBeNull();

    const { data } = await adminClient
      .from("polls")
      .select("id")
      .eq("id", pollId);
    expect(data).toEqual([]);
  });

  it("票のある議案は削除が止まり、票と回は残る", async () => {
    const bill = await createTestBill();
    billIds.push(bill.id);
    const pollId = await createDecisionPoll(bill.id);
    const { error: voteError } = await adminClient
      .from("poll_responses")
      .insert({ poll_id: pollId, user_id: crypto.randomUUID(), choice: "for" });
    expect(voteError).toBeNull();

    const { error } = await adminClient
      .from("bills")
      .delete()
      .eq("id", bill.id);
    // 外部キー違反（foreign_key_violation）
    expect(error?.code).toBe("23503");

    const { data: polls } = await adminClient
      .from("polls")
      .select("id")
      .eq("id", pollId);
    expect(polls).toHaveLength(1);
    const { count } = await adminClient
      .from("poll_responses")
      .select("id", { count: "exact", head: true })
      .eq("poll_id", pollId);
    expect(count).toBe(1);
  });
});
