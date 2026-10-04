import { describe, expect, it } from "vitest";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { citizenVoteSummaryTag } from "./citizen-vote-cache-tags";

describe("citizenVoteSummaryTag", () => {
  it("議案ごとに別のタグにする（ほかの議案の集計は消さない）", () => {
    expect(citizenVoteSummaryTag("bill-1")).toBe(
      `${CACHE_TAGS.CITIZEN_VOTES}:summary:bill-1`
    );
    expect(citizenVoteSummaryTag("bill-1")).not.toBe(
      citizenVoteSummaryTag("bill-2")
    );
  });

  // 全体のタグ（取り込み・同期で消す）とは別にする
  it("区民投票全体のタグとは別のタグにする", () => {
    expect(citizenVoteSummaryTag("bill-1")).not.toBe(CACHE_TAGS.CITIZEN_VOTES);
  });
});
