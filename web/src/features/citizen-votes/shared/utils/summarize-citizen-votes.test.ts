import { describe, expect, it } from "vitest";
import {
  judgeVoteVerdict,
  summarizeCitizenVotes,
  summarizeCitizenVotesByBill,
  toVotePercentages,
} from "./summarize-citizen-votes";

describe("summarizeCitizenVotes", () => {
  it("締切の前と後に分けて数える", () => {
    const summary = summarizeCitizenVotes([
      {
        choice: "for",
        eligibility: "unverified",
        cast_before_close: true,
        cnt: 3,
      },
      {
        choice: "against",
        eligibility: "unverified",
        cast_before_close: true,
        cnt: 2,
      },
      {
        choice: "against",
        eligibility: "unverified",
        cast_before_close: false,
        cnt: 4,
      },
    ]);
    expect(summary.beforeClose).toEqual({ for: 3, against: 2, total: 5 });
    expect(summary.afterClose).toEqual({ for: 0, against: 4, total: 4 });
    expect(summary.verifiedBeforeClose).toEqual({
      for: 0,
      against: 0,
      total: 0,
    });
  });

  it("区民確認済みの締切前の票は別にも数える", () => {
    const summary = summarizeCitizenVotes([
      {
        choice: "for",
        eligibility: "verified_resident",
        cast_before_close: true,
        cnt: 2,
      },
      {
        choice: "for",
        eligibility: "unverified",
        cast_before_close: true,
        cnt: 1,
      },
      {
        choice: "for",
        eligibility: "verified_resident",
        cast_before_close: false,
        cnt: 5,
      },
    ]);
    expect(summary.beforeClose).toEqual({ for: 3, against: 0, total: 3 });
    expect(summary.verifiedBeforeClose).toEqual({
      for: 2,
      against: 0,
      total: 2,
    });
  });

  it("RPC が bigint を文字列で返しても数として扱う", () => {
    const summary = summarizeCitizenVotes([
      {
        choice: "for",
        eligibility: "unverified",
        cast_before_close: true,
        cnt: "12",
      },
    ]);
    expect(summary.beforeClose.for).toBe(12);
  });

  it("選択肢にない値・null・不正な件数は数えない", () => {
    const summary = summarizeCitizenVotes([
      {
        choice: "abstain",
        eligibility: "unverified",
        cast_before_close: true,
        cnt: 3,
      },
      {
        choice: null,
        eligibility: "unverified",
        cast_before_close: true,
        cnt: 3,
      },
      {
        choice: "for",
        eligibility: "unverified",
        cast_before_close: true,
        cnt: "x",
      },
    ]);
    expect(summary.beforeClose.total).toBe(0);
  });
});

describe("summarizeCitizenVotesByBill", () => {
  it("議案ごとにまとめる", () => {
    const map = summarizeCitizenVotesByBill([
      {
        bill_id: "a",
        choice: "for",
        eligibility: "unverified",
        cast_before_close: true,
        cnt: 1,
      },
      {
        bill_id: "b",
        choice: "against",
        eligibility: "unverified",
        cast_before_close: true,
        cnt: 2,
      },
      {
        bill_id: "a",
        choice: "against",
        eligibility: "unverified",
        cast_before_close: true,
        cnt: 3,
      },
    ]);
    expect(map.get("a")?.beforeClose).toEqual({ for: 1, against: 3, total: 4 });
    expect(map.get("b")?.beforeClose).toEqual({ for: 0, against: 2, total: 2 });
    expect(map.has("c")).toBe(false);
  });
});

describe("judgeVoteVerdict", () => {
  it("30票未満なら判定しない", () => {
    expect(judgeVoteVerdict({ for: 29, against: 0, total: 29 })).toBe(
      "insufficient"
    );
    expect(judgeVoteVerdict({ for: 0, against: 0, total: 0 })).toBe(
      "insufficient"
    );
  });

  it("30票ちょうどから判定する", () => {
    expect(judgeVoteVerdict({ for: 20, against: 10, total: 30 })).toBe(
      "for_majority"
    );
    expect(judgeVoteVerdict({ for: 10, against: 20, total: 30 })).toBe(
      "against_majority"
    );
  });

  it("差が5ポイントちょうどなら拮抗", () => {
    // 21:19 → 52.5% と 47.5%（差 5.0 ポイント）
    expect(judgeVoteVerdict({ for: 21, against: 19, total: 40 })).toBe("close");
  });

  it("差が5ポイントを超えれば多数", () => {
    // 22:18 → 55% と 45%（差 10 ポイント）
    expect(judgeVoteVerdict({ for: 22, against: 18, total: 40 })).toBe(
      "for_majority"
    );
    // 101:99 は差 1 ポイントで拮抗、94:106 は差 6 ポイントで多数
    expect(judgeVoteVerdict({ for: 101, against: 99, total: 200 })).toBe(
      "close"
    );
    expect(judgeVoteVerdict({ for: 94, against: 106, total: 200 })).toBe(
      "against_majority"
    );
  });

  it("しきい値を変えられる", () => {
    expect(
      judgeVoteVerdict(
        { for: 8, against: 2, total: 10 },
        { minVotes: 10, tieMarginPoints: 5 }
      )
    ).toBe("for_majority");
  });
});

describe("toVotePercentages", () => {
  it("合計が100になる整数の%を返す", () => {
    expect(toVotePercentages({ for: 1, against: 2, total: 3 })).toEqual({
      for: 33,
      against: 67,
    });
    expect(toVotePercentages({ for: 2, against: 1, total: 3 })).toEqual({
      for: 67,
      against: 33,
    });
  });

  it("票が無ければ 0 と 0", () => {
    expect(toVotePercentages({ for: 0, against: 0, total: 0 })).toEqual({
      for: 0,
      against: 0,
    });
  });
});
