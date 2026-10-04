import { describe, expect, it } from "vitest";
import type { CitizenVoteSummary, PollState, VoteTally } from "../types";
import { describeCitizenVoteResult } from "./describe-citizen-vote-result";

const CLOSES_AT = "2026-10-15T05:00:00.000Z";
const OPEN: PollState = { state: "open", closesAt: CLOSES_AT };
const AFTER: PollState = {
  state: "open_after_close",
  closesAt: CLOSES_AT,
  openedAfterClose: false,
};
const CLOSED: PollState = {
  state: "closed",
  closesAt: CLOSES_AT,
  openedAfterClose: false,
};

function tally(forCount: number, against: number): VoteTally {
  return { for: forCount, against, total: forCount + against };
}

function summary(
  beforeClose: VoteTally,
  afterClose: VoteTally = tally(0, 0)
): CitizenVoteSummary {
  return { beforeClose, afterClose, verifiedBeforeClose: tally(0, 0) };
}

const LATE_OPENED_AFTER: PollState = {
  state: "open_after_close",
  closesAt: CLOSES_AT,
  openedAfterClose: true,
};

function describe_(
  pollState: PollState,
  s: CitizenVoteSummary | null,
  councilStatus: "in_originating_house" | "enacted" | "rejected" = "enacted",
  billSlug = "r8-teirei-3-gian-63",
  options: { votingEnabled?: boolean; billPublished?: boolean } = {}
) {
  return describeCitizenVoteResult({
    pollState,
    summary: s,
    councilStatus,
    billSlug,
    votingEnabled: options.votingEnabled ?? true,
    billPublished: options.billPublished ?? true,
  });
}

describe("describeCitizenVoteResult", () => {
  it("人事案件は対象外とし、理由を添える", () => {
    const result = describe_(
      { state: "not_applicable", reason: "personnel" },
      null
    );
    expect(result).toMatchObject({
      kind: "not_applicable",
      reason: "personnel",
    });
    expect(result.kind === "not_applicable" && result.message).toContain(
      "人事案件"
    );
  });

  it("受付前は結果を出さない", () => {
    expect(
      describe_({ state: "upcoming", opensAt: CLOSES_AT }, null).kind
    ).toBe("upcoming");
  });

  // 先に結果を見て流されないよう、締切前で本人が投票していなければ見せない。
  it("結果を渡されなければ（締切前・未投票）、投票を促すだけにする", () => {
    expect(describe_(OPEN, null)).toEqual({
      kind: "hidden_until_vote",
      accepting: true,
      blocked: null,
    });
  });

  // 緊急停止（秘密鍵を外す）中に「投票受付中」と出すと、押した先の帯で投票できない
  it("受付を止めているときは、受付期間の中でも受付中にしない", () => {
    expect(
      describe_(OPEN, null, "enacted", "r8-teirei-3-gian-63", {
        votingEnabled: false,
      })
    ).toEqual({
      kind: "hidden_until_vote",
      accepting: false,
      blocked: "suspended",
    });
    expect(
      describe_(AFTER, summary(tally(0, 0)), "enacted", "r8-teirei-3-gian-63", {
        votingEnabled: false,
      })
    ).toMatchObject({
      kind: "no_votes",
      accepting: false,
      blocked: "suspended",
    });
  });

  it("公開前の議案（プレビュー）は受付中にしない", () => {
    expect(
      describe_(OPEN, null, "enacted", "r8-teirei-3-gian-63", {
        billPublished: false,
      })
    ).toMatchObject({ accepting: false, blocked: "unpublished" });
  });

  it("受付期間の外なら、止めていても理由は付けない（受付終了）", () => {
    expect(
      describe_(
        CLOSED,
        summary(tally(0, 0)),
        "enacted",
        "r8-teirei-3-gian-63",
        {
          votingEnabled: false,
        }
      )
    ).toMatchObject({ accepting: false, blocked: null });
  });

  it("結果を見せてよいが1票も無いときは、票が無いと分かるようにする", () => {
    expect(describe_(AFTER, summary(tally(0, 0)))).toEqual({
      kind: "no_votes",
      accepting: true,
      blocked: null,
      pastClose: true,
      openedAfterClose: false,
    });
    expect(describe_(CLOSED, summary(tally(0, 0)))).toMatchObject({
      kind: "no_votes",
      accepting: false,
    });
  });

  it("締切前は「これまでの票」とし、採決後の票の欄は出さない", () => {
    const result = describe_(
      OPEN,
      summary(tally(2, 1)),
      "in_originating_house"
    );
    expect(result.kind).toBe("results");
    if (result.kind !== "results") return;
    expect(result.primary?.label).toBe("これまでの票");
    expect(result.primary?.percent).toEqual({ for: 67, against: 33 });
    expect(result.afterClose).toBeNull();
    // 議会がまだ議決していなければ比べない
    expect(result.gap).toBeNull();
  });

  it("締切後は採決前と採決後の票を分けて出す", () => {
    const result = describe_(AFTER, summary(tally(10, 30), tally(1, 2)));
    if (result.kind !== "results") throw new Error("results expected");
    expect(result.primary).toMatchObject({
      label: "採決前の票",
      tally: tally(10, 30),
    });
    expect(result.afterClose).toMatchObject({
      label: "採決後の票",
      tally: tally(1, 2),
    });
  });

  it("締切後は、採決後の票が0でも採決後の欄を出す", () => {
    const result = describe_(CLOSED, summary(tally(3, 1)));
    if (result.kind !== "results") throw new Error("results expected");
    expect(result.afterClose?.tally.total).toBe(0);
  });

  describe("多数の判定（30票以上・差5ポイント以内は拮抗）", () => {
    it("30票未満は判定せず、理由を添える", () => {
      const result = describe_(
        OPEN,
        summary(tally(20, 9)),
        "in_originating_house"
      );
      if (result.kind !== "results") throw new Error("results expected");
      expect(result.verdict?.verdict).toBe("insufficient");
      expect(result.verdict?.note).toBe(
        "30票に届くまでは、多数かどうかを示しません（いま29票）。"
      );
    });

    // 1票でも「賛成 100%」と大きく出すと、判定なしでも結果のように読める
    it("30票未満は割合を大きく出さない", () => {
      const result = describe_(
        OPEN,
        summary(tally(1, 0)),
        "in_originating_house"
      );
      if (result.kind !== "results") throw new Error("results expected");
      expect(result.headline).toBeNull();
      expect(result.primary?.tally.total).toBe(1);
    });

    it("30票以上なら、採決前（これまで）の票の割合を大きく出す", () => {
      const result = describe_(AFTER, summary(tally(10, 30)));
      if (result.kind !== "results") throw new Error("results expected");
      expect(result.headline).toEqual(result.primary);
      expect(result.headline?.percent).toEqual({ for: 25, against: 75 });
    });

    it("差が5ポイント以内なら拮抗", () => {
      const result = describe_(AFTER, summary(tally(21, 19)));
      if (result.kind !== "results") throw new Error("results expected");
      expect(result.verdict?.label).toBe("拮抗");
      expect(result.verdict?.note).toContain("5ポイント以内");
    });

    it("30票以上で差が開いていれば多数を言い切る", () => {
      const result = describe_(AFTER, summary(tally(10, 30)));
      if (result.kind !== "results") throw new Error("results expected");
      expect(result.verdict).toEqual({
        verdict: "against_majority",
        label: "反対多数",
        note: null,
      });
    });

    // 採決後の票は議会が判断した時点の意見ではないので、判定に混ぜない
    it("採決後の票は判定に使わない", () => {
      const result = describe_(AFTER, summary(tally(1, 1), tally(0, 100)));
      if (result.kind !== "results") throw new Error("results expected");
      expect(result.verdict?.verdict).toBe("insufficient");
    });
  });

  // 過去の議案にあとから作った回。「採決前の票 0票」「判定なし」を出すと、
  // 採決の前にも投票できたように読めてしまう
  describe("採決のあとに受付を始めた回", () => {
    it("採決前の欄・判定・議会との比較を出さず、採決後の票だけにする", () => {
      const result = describe_(
        LATE_OPENED_AFTER,
        summary(tally(0, 0), tally(4, 1))
      );
      if (result.kind !== "results") throw new Error("results expected");
      expect(result).toMatchObject({
        openedAfterClose: true,
        primary: null,
        verdict: null,
        headline: null,
        gap: null,
        accepting: true,
      });
      expect(result.afterClose).toMatchObject({
        label: "採決後の票",
        tally: tally(4, 1),
      });
    });

    it("票が無いときも、採決のあとに受付を始めた回だと分かるようにする", () => {
      expect(describe_(LATE_OPENED_AFTER, summary(tally(0, 0)))).toMatchObject({
        kind: "no_votes",
        openedAfterClose: true,
      });
    });
  });

  describe("議会とのズレ", () => {
    it("議会が可決し区民が反対多数なら「分かれた」", () => {
      const result = describe_(AFTER, summary(tally(10, 30)), "enacted");
      if (result.kind !== "results") throw new Error("results expected");
      expect(result.gap).toMatchObject({
        relation: "diverge",
        councilLabel: "可決",
        citizensLabel: "反対多数",
        citizensTotal: 40,
        headline: "議会と区民の判断が分かれた",
      });
    });

    it("同じ向きなら「同じ向き」", () => {
      const result = describe_(AFTER, summary(tally(30, 10)), "enacted");
      if (result.kind !== "results") throw new Error("results expected");
      expect(result.gap?.relation).toBe("match");
    });

    it("決算は認定・不認定の語で比べる", () => {
      const result = describe_(
        AFTER,
        summary(tally(10, 30)),
        "rejected",
        "r8-teirei-3-nintei-1"
      );
      if (result.kind !== "results") throw new Error("results expected");
      expect(result.gap).toMatchObject({
        relation: "match",
        councilLabel: "不認定",
      });
    });

    it("採決前の票が足りなければ、ズレを言い切らない", () => {
      const result = describe_(AFTER, summary(tally(3, 1)), "enacted");
      if (result.kind !== "results") throw new Error("results expected");
      expect(result.gap?.relation).toBe("insufficient");
      expect(result.gap?.message).toContain("30票に届かなかった");
    });

    it("採決前の票が無ければ比べない", () => {
      const result = describe_(AFTER, summary(tally(0, 0), tally(5, 0)));
      if (result.kind !== "results") throw new Error("results expected");
      expect(result.gap).toBeNull();
    });
  });
});
