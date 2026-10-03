import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, cleanupTestBill, createTestBill } from "../utils";

/**
 * 区民投票の集計。議案ごとに（選択肢・資格・採決前か後か）で分けて数える。
 * - 採決前 = responded_at < polls.closes_at（締切が無い回は採決前として扱う）
 * - 非表示の回（is_hidden）と、別の種類の回（evaluation など）は数えない
 *
 * decision（choice 型・round 0）専用。round では分けない。
 *
 * 票（poll_responses）は回を on delete restrict で参照するため、
 * 片付けは票 → 回 → 議案の順に消す。
 */
describe("count_poll_responses_by_bill_ids", () => {
  const CLOSES_AT = "2026-10-15T05:00:00.000Z"; // 2026-10-15 14:00 JST
  const BEFORE = "2026-10-14T03:00:00.000Z";
  const AFTER = "2026-10-16T03:00:00.000Z";

  let billA: { id: string };
  let billB: { id: string };
  let billHidden: { id: string };
  let billNoClose: { id: string };
  let billEmpty: { id: string };
  const pollIds: string[] = [];

  async function createPoll(
    billId: string,
    overrides: Partial<{
      kind: "decision" | "evaluation" | "live";
      round: number;
      response_type: "choice" | "score";
      options: string[] | null;
      closes_at: string | null;
      is_hidden: boolean;
    }> = {}
  ): Promise<string> {
    const { data, error } = await adminClient
      .from("polls")
      .insert({
        bill_id: billId,
        kind: "decision",
        round: 0,
        response_type: "choice",
        options: ["for", "against"],
        closes_at: CLOSES_AT,
        ...overrides,
      })
      .select("id")
      .single();
    if (error) throw new Error(`poll 作成失敗: ${error.message}`);
    pollIds.push(data.id);
    return data.id;
  }

  async function insertResponses(
    pollId: string,
    rows: {
      choice?: string;
      score?: number;
      eligibility?:
        | "unverified"
        | "self_declared_resident"
        | "self_declared_nonresident"
        | "verified_resident";
      responded_at: string;
    }[]
  ) {
    const { error } = await adminClient.from("poll_responses").insert(
      rows.map((r) => ({
        poll_id: pollId,
        user_id: crypto.randomUUID(),
        choice: r.choice ?? null,
        score: r.score ?? null,
        eligibility: r.eligibility ?? "unverified",
        responded_at: r.responded_at,
      }))
    );
    if (error) throw new Error(`poll_responses 作成失敗: ${error.message}`);
  }

  function toMap(
    rows: {
      bill_id: string;
      choice: string;
      eligibility: string;
      cast_before_close: boolean;
      cnt: number;
    }[]
  ) {
    return new Map(
      rows.map((r) => [
        `${r.bill_id}:${r.choice}:${r.eligibility}:${r.cast_before_close}`,
        r.cnt,
      ])
    );
  }

  beforeAll(async () => {
    billA = await createTestBill();
    billB = await createTestBill();
    billHidden = await createTestBill();
    billNoClose = await createTestBill();
    billEmpty = await createTestBill();

    const pollA = await createPoll(billA.id);
    await insertResponses(pollA, [
      { choice: "for", responded_at: BEFORE },
      { choice: "for", responded_at: BEFORE },
      { choice: "against", responded_at: BEFORE },
      { choice: "against", responded_at: AFTER },
      // 締切ちょうどは採決後として数える
      { choice: "for", responded_at: CLOSES_AT },
      {
        choice: "for",
        eligibility: "verified_resident",
        responded_at: BEFORE,
      },
    ]);
    // 同じ議案の評価アンケート（score）は decision の集計に入らない
    const evaluationA = await createPoll(billA.id, {
      kind: "evaluation",
      round: 1,
      response_type: "score",
      options: null,
    });
    await insertResponses(evaluationA, [{ score: 4, responded_at: AFTER }]);

    const pollB = await createPoll(billB.id);
    await insertResponses(pollB, [{ choice: "against", responded_at: AFTER }]);

    const pollHidden = await createPoll(billHidden.id, { is_hidden: true });
    await insertResponses(pollHidden, [
      { choice: "for", responded_at: BEFORE },
    ]);

    const pollNoClose = await createPoll(billNoClose.id, { closes_at: null });
    await insertResponses(pollNoClose, [
      { choice: "for", responded_at: AFTER },
    ]);

    await createPoll(billEmpty.id);
  });

  afterAll(async () => {
    if (pollIds.length > 0) {
      await adminClient.from("poll_responses").delete().in("poll_id", pollIds);
      await adminClient.from("polls").delete().in("id", pollIds);
    }
    await Promise.allSettled(
      [billA, billB, billHidden, billNoClose, billEmpty]
        .filter(Boolean)
        .map((b) => cleanupTestBill(b.id))
    );
  });

  it("選択肢・資格・採決前か後かに分けて数える", async () => {
    const { data, error } = await adminClient.rpc(
      "count_poll_responses_by_bill_ids",
      { p_bill_ids: [billA.id, billB.id] }
    );

    expect(error).toBeNull();
    const counts = toMap(data ?? []);
    expect(counts.get(`${billA.id}:for:unverified:true`)).toBe(2);
    expect(counts.get(`${billA.id}:for:unverified:false`)).toBe(1);
    expect(counts.get(`${billA.id}:against:unverified:true`)).toBe(1);
    expect(counts.get(`${billA.id}:against:unverified:false`)).toBe(1);
    expect(counts.get(`${billA.id}:for:verified_resident:true`)).toBe(1);
    expect(counts.get(`${billB.id}:against:unverified:false`)).toBe(1);
    expect(data).toHaveLength(6);
  });

  it("非表示の回は数えない", async () => {
    const { data, error } = await adminClient.rpc(
      "count_poll_responses_by_bill_ids",
      { p_bill_ids: [billHidden.id] }
    );

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("締切が無い回の票は採決前として数える", async () => {
    const { data, error } = await adminClient.rpc(
      "count_poll_responses_by_bill_ids",
      { p_bill_ids: [billNoClose.id] }
    );

    expect(error).toBeNull();
    expect(data).toEqual([
      {
        bill_id: billNoClose.id,
        choice: "for",
        eligibility: "unverified",
        cast_before_close: true,
        cnt: 1,
      },
    ]);
  });

  it("p_kind で別の種類の回を指定すると decision の票は数えない", async () => {
    const { data, error } = await adminClient.rpc(
      "count_poll_responses_by_bill_ids",
      { p_bill_ids: [billA.id], p_kind: "live" }
    );

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("票が0件の議案と、指定していない議案は返さない", async () => {
    const { data, error } = await adminClient.rpc(
      "count_poll_responses_by_bill_ids",
      { p_bill_ids: [billEmpty.id, billB.id] }
    );

    expect(error).toBeNull();
    expect(new Set((data ?? []).map((r) => r.bill_id))).toEqual(
      new Set([billB.id])
    );
  });

  it("空配列を渡しても落ちない", async () => {
    const { data, error } = await adminClient.rpc(
      "count_poll_responses_by_bill_ids",
      { p_bill_ids: [] }
    );

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("同じユーザーは同じ回に2票入れられない", async () => {
    const pollId = await createPoll(billEmpty.id, {
      kind: "live",
      round: 1,
    });
    const userId = crypto.randomUUID();
    const first = await adminClient.from("poll_responses").insert({
      poll_id: pollId,
      user_id: userId,
      choice: "for",
    });
    expect(first.error).toBeNull();
    const second = await adminClient.from("poll_responses").insert({
      poll_id: pollId,
      user_id: userId,
      choice: "against",
    });
    expect(second.error).not.toBeNull();
  });
});
