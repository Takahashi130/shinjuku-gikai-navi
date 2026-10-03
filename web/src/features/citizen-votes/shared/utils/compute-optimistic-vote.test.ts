import { describe, expect, it } from "vitest";
import type { CitizenVoteSummary } from "../types";
import { computeOptimisticVote } from "./compute-optimistic-vote";

function summary(
  before: [number, number],
  after: [number, number] = [0, 0]
): CitizenVoteSummary {
  return {
    beforeClose: {
      for: before[0],
      against: before[1],
      total: before[0] + before[1],
    },
    afterClose: {
      for: after[0],
      against: after[1],
      total: after[0] + after[1],
    },
    verifiedBeforeClose: { for: 0, against: 0, total: 0 },
  };
}

describe("computeOptimisticVote", () => {
  it("はじめての投票で、本人の票を入れる（結果を見せていなければ票数は出さない）", () => {
    expect(
      computeOptimisticVote(
        { myVote: null, summary: null },
        { type: "cast", choice: "for", castBeforeClose: true }
      )
    ).toEqual({
      myVote: { choice: "for", castBeforeClose: true },
      summary: null,
    });
  });

  it("結果を見せているときは、該当する区分に1票足す", () => {
    const next = computeOptimisticVote(
      { myVote: null, summary: summary([3, 2]) },
      { type: "cast", choice: "against", castBeforeClose: false }
    );
    expect(next.summary?.beforeClose).toEqual({ for: 3, against: 2, total: 5 });
    expect(next.summary?.afterClose).toEqual({ for: 0, against: 1, total: 1 });
  });

  it("選び直しでは、前の票を元の区分から引いて新しい区分に足す", () => {
    const next = computeOptimisticVote(
      {
        myVote: { choice: "for", castBeforeClose: true },
        summary: summary([3, 2]),
      },
      { type: "cast", choice: "against", castBeforeClose: false }
    );
    expect(next.myVote).toEqual({ choice: "against", castBeforeClose: false });
    expect(next.summary?.beforeClose).toEqual({ for: 2, against: 2, total: 4 });
    expect(next.summary?.afterClose).toEqual({ for: 0, against: 1, total: 1 });
  });

  it("同じ選択肢を押し直しても変えない", () => {
    const state = {
      myVote: { choice: "for" as const, castBeforeClose: true },
      summary: summary([3, 2]),
    };
    expect(
      computeOptimisticVote(state, {
        type: "cast",
        choice: "for",
        castBeforeClose: false,
      })
    ).toBe(state);
  });

  it("取り消しで本人の票を消し、元の区分から1票引く", () => {
    expect(
      computeOptimisticVote(
        {
          myVote: { choice: "against", castBeforeClose: true },
          summary: summary([3, 2]),
        },
        { type: "withdraw" }
      )
    ).toEqual({ myVote: null, summary: summary([3, 1]) });
  });

  it("投票していないときの取り消しは何もしない", () => {
    const state = { myVote: null, summary: summary([1, 1]) };
    expect(computeOptimisticVote(state, { type: "withdraw" })).toBe(state);
  });

  it("票数は0より小さくしない", () => {
    const next = computeOptimisticVote(
      {
        myVote: { choice: "for", castBeforeClose: true },
        summary: summary([0, 0]),
      },
      { type: "withdraw" }
    );
    expect(next.summary?.beforeClose).toEqual({ for: 0, against: 0, total: 0 });
  });
});
