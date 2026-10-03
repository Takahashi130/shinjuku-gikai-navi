import { describe, expect, it } from "vitest";
import {
  buildNewVoteRateLimitRule,
  buildVoteRateLimitRules,
  ipBillHashInput,
  VOTE_IP_BILL_WINDOW_SECONDS,
  VOTE_RATE_LIMIT_WINDOW_SECONDS,
} from "./vote-rate-limit-rules";

describe("buildVoteRateLimitRules", () => {
  it("同じ人 → 接続元の順に、それぞれの上限で並べる（どちらも1分の窓）", () => {
    expect(
      buildVoteRateLimitRules({
        userId: "user-1",
        ipHash: "abc123",
        limits: { perUser: 10, perIp: 20 },
      })
    ).toEqual([
      {
        key: "vote:user:user-1",
        limit: 10,
        windowSeconds: VOTE_RATE_LIMIT_WINDOW_SECONDS,
      },
      {
        key: "vote:ip:abc123",
        limit: 20,
        windowSeconds: VOTE_RATE_LIMIT_WINDOW_SECONDS,
      },
    ]);
  });

  it("キーには渡されたハッシュだけが入る（生の IP は受け取らない）", () => {
    const rules = buildVoteRateLimitRules({
      userId: "u",
      ipHash: "0f".repeat(16),
      limits: { perUser: 1, perIp: 1 },
    });
    expect(rules[1]?.key).toBe(`vote:ip:${"0f".repeat(16)}`);
  });

  it("接続元のハッシュが無い（秘密鍵が無い）ときは、同じ人の制限だけにする", () => {
    expect(
      buildVoteRateLimitRules({
        userId: "u",
        ipHash: null,
        limits: { perUser: 10, perIp: 20 },
      }).map((r) => r.key)
    ).toEqual(["vote:user:u"]);
  });
});

describe("buildNewVoteRateLimitRule", () => {
  it("接続元と議案の組ごとに、1時間の窓で数える", () => {
    expect(
      buildNewVoteRateLimitRule({
        ipBillHash: "ff".repeat(16),
        limits: { perIpBillHour: 10 },
      })
    ).toEqual({
      key: `vote:ipbill:${"ff".repeat(16)}`,
      limit: 10,
      windowSeconds: VOTE_IP_BILL_WINDOW_SECONDS,
    });
  });

  it("1時間の窓は、increment_api_rate_limit の掃除（1時間より古い窓を消す）に収まる", () => {
    expect(VOTE_IP_BILL_WINDOW_SECONDS).toBeLessThanOrEqual(60 * 60);
  });
});

describe("ipBillHashInput", () => {
  it("接続元と議案 ID を区切って並べる（議案が違えば別の値）", () => {
    expect(ipBillHashInput("203.0.113.7", "bill-1")).toBe("203.0.113.7|bill-1");
    expect(ipBillHashInput("203.0.113.7", "bill-1")).not.toBe(
      ipBillHashInput("203.0.113.7", "bill-2")
    );
  });
});
