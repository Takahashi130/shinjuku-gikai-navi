import { describe, expect, it } from "vitest";
import {
  billVoteHref,
  CAST_VOTE_ANCHOR,
  CAST_VOTE_SECTION_ID,
} from "./bill-vote-href";

describe("billVoteHref", () => {
  it("議案ページの投票の帯へ送る", () => {
    expect(billVoteHref("bill-1")).toBe("/bills/bill-1#cast-vote");
  });

  it("ページ内リンクと帯の id がそろっている", () => {
    expect(CAST_VOTE_ANCHOR).toBe(`#${CAST_VOTE_SECTION_ID}`);
  });
});
