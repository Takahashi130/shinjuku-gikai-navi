import "server-only";

import { headers } from "next/headers";
import { getChatSupabaseUser } from "@/features/chat/server/utils/supabase-server";
import { isUuid } from "@/features/open-data/shared/utils/uuid";
import { getParticipationHashSecret } from "@/lib/participation/get-participation-hash-secret";
import { resolveEligibility } from "@/lib/participation/resolve-eligibility";
import {
  type CitizenVoteSummary,
  type DecisionPoll,
  isVoteChoice,
  type VoteActionErrorCode,
  type VoteActionResult,
  type VoteChoice,
} from "../../shared/types";
import {
  canCastVote,
  castVoteDenyMessage,
} from "../../shared/utils/can-cast-vote";
import {
  isBeforeClose,
  resolvePollState,
  shouldRevealResults,
} from "../../shared/utils/resolve-poll-state";
import { summarizeCitizenVotes } from "../../shared/utils/summarize-citizen-votes";
import { VOTE_ACTION_ERROR_MESSAGES } from "../../shared/utils/vote-action-messages";
import {
  type BillForVote,
  countDecisionResponsesByBillIds,
  deletePollResponse,
  findDecisionPollContext,
  findUserPollResponse,
  upsertPollChoice,
} from "../repositories/citizen-vote-repository";
import {
  consumeNewVoteRateLimit,
  consumeVoteRateLimit,
} from "../utils/consume-vote-rate-limit";

type Failure = Extract<VoteActionResult, { ok: false }>;

function fail(code: Exclude<VoteActionErrorCode, "not_allowed">): Failure {
  return { ok: false, code, error: VOTE_ACTION_ERROR_MESSAGES[code] };
}

type PreparedRequest = {
  ok: true;
  userId: string;
  bill: BillForVote;
  poll: DecisionPoll | null;
  /** 接続元をハッシュする秘密鍵（取り消しでは null のことがある） */
  secret: string | null;
  requestHeaders: Headers;
};

/**
 * 投票・取り消しに共通する確認（呼び出しの順番は設計 2.2 のとおり）。
 * 1. 入力の形 2. 受付の設定（秘密鍵） 3. ログイン（匿名ユーザー） 4. 回数制限 5. 対象の議案と回
 *
 * 秘密鍵（PARTICIPATION_HASH_SECRET）が無いと新しい票は受け付けない（緊急停止のスイッチ）。
 * 取り消しは、秘密鍵が無くても同じ人の回数制限だけで受け付ける（いつでも取り消せるようにする）。
 */
async function prepareVoteRequest(
  billId: unknown,
  options: { requireSecret: boolean }
): Promise<PreparedRequest | Failure> {
  if (typeof billId !== "string" || !isUuid(billId)) {
    return fail("invalid_input");
  }

  const secret = getParticipationHashSecret()?.value ?? null;
  if (options.requireSecret && secret === null) return fail("unavailable");

  const {
    data: { user },
    error: userError,
  } = await getChatSupabaseUser();
  if (userError || !user) return fail("unauthenticated");

  const requestHeaders = await headers();
  const rateLimit = await consumeVoteRateLimit({
    userId: user.id,
    headers: requestHeaders,
    secret,
  });
  if (!rateLimit.allowed) return fail("rate_limited");

  const context = await findDecisionPollContext(billId);
  if (!context) return fail("not_found");

  return { ok: true, userId: user.id, secret, requestHeaders, ...context };
}

async function fetchSummary(billId: string): Promise<CitizenVoteSummary> {
  return summarizeCitizenVotes(await countDecisionResponsesByBillIds([billId]));
}

/**
 * 賛成・反対の票を入れる（選び直しを含む）。
 * 成功したら、本人の票と最新の集計（キャッシュを通さない）を返す。
 */
export async function castDecisionVote(input: {
  billId: unknown;
  choice: unknown;
  readExplainer: unknown;
}): Promise<VoteActionResult> {
  if (!isVoteChoice(input.choice)) return fail("invalid_input");
  const choice: VoteChoice = input.choice;
  const readExplainer = input.readExplainer === true;

  try {
    const prepared = await prepareVoteRequest(input.billId, {
      requireSecret: true,
    });
    if (!prepared.ok) return prepared;
    const { bill, poll, userId, secret, requestHeaders } = prepared;

    const now = new Date();
    const pollState = resolvePollState({
      poll,
      billSlug: bill.slug,
      billName: bill.name,
      now,
    });
    // 区民かどうかを確かめるしくみが無いので、今は常に unverified（A 案）
    const eligibility = resolveEligibility({});
    const allowed = canCastVote({
      pollState,
      billPublished: bill.publishStatus === "published",
      audience: poll?.audience ?? "resident_verified",
      eligibility,
    });
    if (!allowed.ok) {
      return {
        ok: false,
        code: "not_allowed",
        error: castVoteDenyMessage(allowed.reason),
      };
    }
    // canCastVote が通れば回はある
    if (!poll) return fail("not_found");
    if (poll.options.length > 0 && !poll.options.includes(choice)) {
      return fail("invalid_input");
    }

    const existing = await findUserPollResponse(poll.id, userId);
    if (existing?.choice === choice) {
      // 同じ選択肢を押し直しただけなら、選び直しの時刻を動かさない
      return {
        ok: true,
        myVote: {
          choice,
          castBeforeClose: isBeforeClose(
            poll.closesAt,
            new Date(existing.respondedAt)
          ),
        },
        summary: await fetchSummary(bill.id),
      };
    }

    // 新しい票だけ、同じ接続元から同じ議案への票の数を数える（選び直しは数えない）
    if (!existing && secret !== null) {
      const ipBillLimit = await consumeNewVoteRateLimit({
        billId: bill.id,
        headers: requestHeaders,
        secret,
        now,
      });
      if (!ipBillLimit.allowed) return fail("rate_limited_bill");
    }

    await upsertPollChoice({
      pollId: poll.id,
      userId,
      choice,
      eligibility,
      readExplainer: readExplainer || existing?.readExplainer === true,
      respondedAt: now.toISOString(),
    });

    return {
      ok: true,
      myVote: { choice, castBeforeClose: isBeforeClose(poll.closesAt, now) },
      summary: await fetchSummary(bill.id),
    };
  } catch (error) {
    console.error(
      "Failed to cast vote:",
      error instanceof Error ? error.message : error
    );
    return fail("server_error");
  }
}

/**
 * 本人の票を取り消す（削除する）。締切の前後、回の状態（非表示・対象外を含む）、
 * 受付を止めているか（秘密鍵が無いか）にかかわらず、いつでも消せる。
 * 結果は、締切後なら返し、締切前なら見せない（null）。
 */
export async function withdrawDecisionVote(input: {
  billId: unknown;
}): Promise<VoteActionResult> {
  try {
    const prepared = await prepareVoteRequest(input.billId, {
      requireSecret: false,
    });
    if (!prepared.ok) return prepared;
    const { bill, poll, userId } = prepared;
    if (!poll) return fail("not_found");

    await deletePollResponse(poll.id, userId);

    const pollState = resolvePollState({
      poll,
      billSlug: bill.slug,
      billName: bill.name,
      now: new Date(),
    });
    const reveal = shouldRevealResults({ pollState, hasVoted: false });
    return {
      ok: true,
      myVote: null,
      summary: reveal ? await fetchSummary(bill.id) : null,
    };
  } catch (error) {
    console.error(
      "Failed to withdraw vote:",
      error instanceof Error ? error.message : error
    );
    return fail("server_error");
  }
}
