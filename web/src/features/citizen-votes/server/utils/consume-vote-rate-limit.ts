import "server-only";

import { consumeRateLimit } from "@/features/open-data/server/repositories/open-data-repository";
import { getClientIp } from "@/features/open-data/shared/utils/client-ip";
import { toPositiveInt } from "@/features/open-data/shared/utils/parse-pagination-query";
import {
  getRetryAfterSeconds,
  getWindowStart,
} from "@/features/open-data/shared/utils/rate-limit-window";
import { hashForPurpose } from "@/lib/participation/hash-for-purpose";
import { normalizeIpForRateLimit } from "@/lib/participation/normalize-ip-for-rate-limit";
import {
  buildNewVoteRateLimitRule,
  buildVoteRateLimitRules,
  DEFAULT_VOTE_RATE_LIMITS,
  ipBillHashInput,
  type VoteRateLimitRule,
  type VoteRateLimits,
} from "../../shared/utils/vote-rate-limit-rules";

export type VoteRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * 回数制限の上限（環境変数で上書きできる。リクエストごとに読む）
 *   PARTICIPATION_VOTE_RATE_LIMIT_PER_USER（既定 10/分）
 *   PARTICIPATION_VOTE_RATE_LIMIT_PER_IP（既定 20/分）
 *   PARTICIPATION_VOTE_RATE_LIMIT_PER_IP_BILL_HOUR（既定 10/時。同じ接続元から同じ議案への新しい票）
 */
function readLimits(): VoteRateLimits {
  return {
    perUser: toPositiveInt(
      process.env.PARTICIPATION_VOTE_RATE_LIMIT_PER_USER,
      DEFAULT_VOTE_RATE_LIMITS.perUser
    ),
    perIp: toPositiveInt(
      process.env.PARTICIPATION_VOTE_RATE_LIMIT_PER_IP,
      DEFAULT_VOTE_RATE_LIMITS.perIp
    ),
    perIpBillHour: toPositiveInt(
      process.env.PARTICIPATION_VOTE_RATE_LIMIT_PER_IP_BILL_HOUR,
      DEFAULT_VOTE_RATE_LIMITS.perIpBillHour
    ),
  };
}

/** 接続元（IPv6 は /64 に丸めた値）。取れなければ "unknown" */
function clientIpForRateLimit(headers: Headers): string {
  return normalizeIpForRateLimit(getClientIp(headers) ?? "unknown");
}

async function consumeRules(
  rules: VoteRateLimitRule[],
  now: Date
): Promise<VoteRateLimitResult> {
  for (const rule of rules) {
    const allowed = await consumeRateLimit({
      key: rule.key,
      windowStart: getWindowStart(now, rule.windowSeconds).toISOString(),
      limit: rule.limit,
    });
    if (!allowed) {
      return {
        allowed: false,
        retryAfterSeconds: getRetryAfterSeconds(now, rule.windowSeconds),
      };
    }
  }
  return { allowed: true };
}

/**
 * 投票・取り消し1回ごとの回数制限を消費する（既存の increment_api_rate_limit を使う）。
 *
 * - 接続元は HMAC（PARTICIPATION_HASH_SECRET）を通した値だけをキーにし、生の IP は保存しない
 * - secret が null（秘密鍵が無い）のときは同じ人の制限だけをかける（取り消しを止めないため）
 * - 将来ロボット確認（Turnstile）を足すときは、この関数の前に検証を挟む
 */
export async function consumeVoteRateLimit(input: {
  userId: string;
  headers: Headers;
  secret: string | null;
  now?: Date;
}): Promise<VoteRateLimitResult> {
  const now = input.now ?? new Date();
  const ipHash =
    input.secret === null
      ? null
      : hashForPurpose(input.secret, "ip", clientIpForRateLimit(input.headers));
  return consumeRules(
    buildVoteRateLimitRules({
      userId: input.userId,
      ipHash,
      limits: readLimits(),
    }),
    now
  );
}

/**
 * 新しい票（その人がまだ票を入れていない議案への票）のときだけ消費する、
 * 同じ接続元から同じ議案への票の制限（1時間あたり）。選び直し・取り消しでは呼ばない。
 * 匿名 ID を作り直して同じ議案に票を重ねる水増しを抑える。
 */
export async function consumeNewVoteRateLimit(input: {
  billId: string;
  headers: Headers;
  secret: string;
  now?: Date;
}): Promise<VoteRateLimitResult> {
  const now = input.now ?? new Date();
  const ipBillHash = hashForPurpose(
    input.secret,
    "ip_bill",
    ipBillHashInput(clientIpForRateLimit(input.headers), input.billId)
  );
  return consumeRules(
    [buildNewVoteRateLimitRule({ ipBillHash, limits: readLimits() })],
    now
  );
}
