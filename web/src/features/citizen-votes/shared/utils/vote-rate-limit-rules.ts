/** 投票の回数制限の窓（秒）：同じ人・同じ接続元の連打を止める */
export const VOTE_RATE_LIMIT_WINDOW_SECONDS = 60;

/**
 * 同じ接続元から同じ議案への新しい票を数える窓（秒）。
 * 既存の increment_api_rate_limit は 1 時間より古い窓の行を消すので、窓は 1 時間までにする。
 */
export const VOTE_IP_BILL_WINDOW_SECONDS = 60 * 60;

/** 既定の上限（環境変数で上書きできる） */
export const DEFAULT_VOTE_RATE_LIMITS = {
  /** 同じ人（匿名 ID）：1 分あたり */
  perUser: 10,
  /** 同じ接続元：1 分あたり */
  perIp: 20,
  /** 同じ接続元から同じ議案への新しい票：1 時間あたり（選び直し・取り消しは数えない） */
  perIpBillHour: 10,
} as const;

export type VoteRateLimits = {
  perUser: number;
  perIp: number;
  perIpBillHour: number;
};

export type VoteRateLimitRule = {
  /** api_rate_limits.key。生の IP は入れず、ハッシュした値だけを使う */
  key: string;
  limit: number;
  windowSeconds: number;
};

/**
 * 投票・取り消し1回ごとに消費する回数制限の一覧。
 * 同じ人の連打を先に止め、通過したものだけが接続元の枠を使う。
 * 携帯回線などで多くの人が同じ接続元を使うため、接続元の上限は緩めにする。
 *
 * ipHash が null（秘密鍵が無く接続元をハッシュできない）のときは、同じ人の制限だけにする。
 * 取り消しは秘密鍵が無くてもできるようにするため。
 */
export function buildVoteRateLimitRules(input: {
  userId: string;
  ipHash: string | null;
  limits: Pick<VoteRateLimits, "perUser" | "perIp">;
}): VoteRateLimitRule[] {
  const rules: VoteRateLimitRule[] = [
    {
      key: `vote:user:${input.userId}`,
      limit: input.limits.perUser,
      windowSeconds: VOTE_RATE_LIMIT_WINDOW_SECONDS,
    },
  ];
  if (input.ipHash !== null) {
    rules.push({
      key: `vote:ip:${input.ipHash}`,
      limit: input.limits.perIp,
      windowSeconds: VOTE_RATE_LIMIT_WINDOW_SECONDS,
    });
  }
  return rules;
}

/**
 * 新しい票（その人がまだ票を入れていない議案への票）のときだけ消費する、
 * 接続元と議案の組ごとの制限。匿名 ID を作り直して同じ議案に票を重ねるのを抑える。
 * ipBillHash は HMAC(「接続元（IPv6 は /64）|議案 ID」)。
 */
export function buildNewVoteRateLimitRule(input: {
  ipBillHash: string;
  limits: Pick<VoteRateLimits, "perIpBillHour">;
}): VoteRateLimitRule {
  return {
    key: `vote:ipbill:${input.ipBillHash}`,
    limit: input.limits.perIpBillHour,
    windowSeconds: VOTE_IP_BILL_WINDOW_SECONDS,
  };
}

/** ip_bill のハッシュに入れる値（接続元と議案の組） */
export function ipBillHashInput(normalizedIp: string, billId: string): string {
  return `${normalizedIp}|${billId}`;
}
