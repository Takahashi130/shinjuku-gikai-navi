import { describe, expect, it } from "vitest";
import type { FactionVoteRecord } from "../types";
import {
  summarizeFactionVotes,
  toBillVoteTally,
} from "./summarize-faction-votes";

const record = (
  id: string,
  vote: FactionVoteRecord["vote"],
  session: { name: string; endDate: string } | null,
  options: { isSplit?: boolean; note?: string; submittedDate?: string } = {}
): FactionVoteRecord => ({
  vote,
  note: options.note ?? null,
  faction_name: "会派",
  bill: {
    id,
    name: `議案${id}`,
    isSplit: options.isSplit ?? vote === "against",
    submittedDate: options.submittedDate ?? null,
  },
  session,
});

const R5_2 = { name: "令和5年第2回定例会", endDate: "2023-06-21" };
const R7_2 = { name: "令和7年第2回定例会", endDate: "2025-06-20" };
const R8_2 = { name: "令和8年第2回定例会", endDate: "2026-06-19" };

const records = [
  record("a", "against", R7_2),
  record("b", "for", R8_2, { isSplit: true }),
  record("c", "for", R8_2),
  record("d", "against", R8_2, { note: "1人賛成" }),
  record("e", "for", R5_2, { isSplit: true }),
  record("f", "unknown", R7_2),
  record("g", "against", null),
];

describe("summarizeFactionVotes", () => {
  it("期間を区切らなければすべて数える", () => {
    const summary = summarizeFactionVotes(records, null);
    expect(summary.total).toBe(7);
    expect(summary.forCount).toBe(3);
    expect(summary.againstCount).toBe(3);
    expect(summary.unknownCount).toBe(1);
  });

  it("反対した議案と、分かれた議案で賛成した議案を新しい順に出す", () => {
    const summary = summarizeFactionVotes(records, null);
    expect(summary.against.map((r) => r.bill.id)).toEqual(["d", "a", "g"]);
    expect(summary.splitFor.map((r) => r.bill.id)).toEqual(["b", "e"]);
  });

  // 会派に入る前の会期の賛否は、その議員に結び付けない。
  it("期間の始まりより前の会期は数えず、会期の分からない議案も外す", () => {
    const summary = summarizeFactionVotes(records, "2025-06-11");
    expect(summary.total).toBe(5);
    expect(summary.against.map((r) => r.bill.id)).toEqual(["d", "a"]);
    expect(summary.splitFor.map((r) => r.bill.id)).toEqual(["b"]);
    expect(summary.oldestSessionName).toBe("令和7年第2回定例会");
  });

  it("会派の中で賛否が分かれた議案を数える", () => {
    expect(summarizeFactionVotes(records, null).internalSplitCount).toBe(1);
  });

  it("同じ会期の中は提出日の新しい順にする", () => {
    const summary = summarizeFactionVotes(
      [
        record("old", "against", R8_2, { submittedDate: "2026-06-01" }),
        record("new", "against", R8_2, { submittedDate: "2026-06-10" }),
      ],
      null
    );
    expect(summary.against.map((r) => r.bill.id)).toEqual(["new", "old"]);
  });

  // 新しくできた会派（アップデート新宿など）は、まだ賛否の記録が無い。
  it("記録が無ければ0件", () => {
    expect(summarizeFactionVotes([], "2026-09-17")).toEqual({
      total: 0,
      forCount: 0,
      againstCount: 0,
      unknownCount: 0,
      internalSplitCount: 0,
      against: [],
      splitFor: [],
      oldestSessionName: null,
    });
  });
});

describe("toBillVoteTally", () => {
  it("賛成の割合を整数の百分率で出す", () => {
    expect(toBillVoteTally({ forCount: 2, againstCount: 1 })).toEqual({
      forCount: 2,
      againstCount: 1,
      forPercent: 67,
    });
  });

  it("賛否が1件も無ければ割合は null（帯を出さない）", () => {
    expect(toBillVoteTally({ forCount: 0, againstCount: 0 }).forPercent).toBe(
      null
    );
  });
});
