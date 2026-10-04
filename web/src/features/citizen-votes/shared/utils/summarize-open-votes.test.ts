import { describe, expect, it } from "vitest";
import type { DecisionPoll } from "../types";
import {
  type OpenVoteCandidate,
  summarizeOpenVotes,
} from "./summarize-open-votes";

const NOW = new Date("2026-10-04T01:00:00Z");
const CLOSES_AT = "2026-10-15T05:00:00.000Z";

function candidate(
  id: string,
  overrides: {
    poll?: Partial<DecisionPoll>;
    bill?: Partial<OpenVoteCandidate["bill"]>;
  } = {}
): OpenVoteCandidate {
  return {
    poll: {
      id: `poll-${id}`,
      opensAt: "2026-10-01T00:00:00.000Z",
      closesAt: CLOSES_AT,
      acceptsAfterClose: true,
      isHidden: false,
      audience: "anyone",
      options: ["for", "against"],
      ...overrides.poll,
    },
    bill: {
      id,
      slug: `r8-teirei-3-gian-${id}`,
      name: "補正予算",
      publishStatus: "published",
      dietSessionId: "session-1",
      ...overrides.bill,
    },
  };
}

describe("summarizeOpenVotes", () => {
  it("締切前で受け付けている公開中の議案だけを数える", () => {
    const stats = summarizeOpenVotes(
      [
        candidate("1"),
        candidate("2"),
        // 採決後の票として受け付けている回は数えない
        candidate("3", { poll: { closesAt: "2026-10-01T05:00:00.000Z" } }),
        // 公開前の議案
        candidate("4", { bill: { publishStatus: "draft" } }),
        // 人事案件
        candidate("5", { bill: { slug: "r8-teirei-3-doi-1" } }),
        // 非表示の回
        candidate("6", { poll: { isHidden: true } }),
        // 受付前
        candidate("7", { poll: { opensAt: "2026-10-10T00:00:00.000Z" } }),
      ],
      NOW
    );
    expect(stats.count).toBe(2);
    expect(stats.dietSessionIds).toEqual(["session-1"]);
  });

  it("いちばん早い締切を返す", () => {
    const stats = summarizeOpenVotes(
      [
        candidate("1"),
        candidate("2", {
          poll: { closesAt: "2026-10-08T05:00:00.000Z" },
          bill: { dietSessionId: "session-2" },
        }),
      ],
      NOW
    );
    expect(stats.earliestClosesAt).toBe("2026-10-08T05:00:00.000Z");
    expect(stats.dietSessionIds).toEqual(["session-1", "session-2"]);
  });

  it("締切未定の回は数えるが、締切には使わない", () => {
    const stats = summarizeOpenVotes(
      [candidate("1", { poll: { closesAt: null } })],
      NOW
    );
    expect(stats).toEqual({
      count: 1,
      earliestClosesAt: null,
      dietSessionIds: ["session-1"],
    });
  });

  it("同じ議案が2回出てきても1件と数える", () => {
    expect(
      summarizeOpenVotes([candidate("1"), candidate("1")], NOW).count
    ).toBe(1);
  });

  it("受付中が無ければ0件", () => {
    expect(summarizeOpenVotes([], NOW)).toEqual({
      count: 0,
      earliestClosesAt: null,
      dietSessionIds: [],
    });
  });
});
