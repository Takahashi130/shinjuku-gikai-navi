import { describe, expect, it } from "vitest";
import {
  getSectionsShownInDecisionPanel,
  isDecidedStatus,
} from "./council-decision";
import {
  type BillVotes,
  FACTION_VOTES_HEADING,
  RESULT_HEADING,
} from "./parse-bill-votes";

const withFactions: BillVotes = {
  result: "可決",
  resultNote: null,
  hasFactionVotes: true,
  for: [{ name: "会派A", note: null }],
  against: [{ name: "会派B", note: null }],
};
const resultOnly: BillVotes = {
  ...withFactions,
  hasFactionVotes: false,
  for: [],
  against: [],
};

describe("isDecidedStatus", () => {
  it("可決・否決だけを議決済みとする", () => {
    expect(isDecidedStatus("enacted")).toBe(true);
    expect(isDecidedStatus("rejected")).toBe(true);
    expect(isDecidedStatus("in_originating_house")).toBe(false);
    expect(isDecidedStatus("introduced")).toBe(false);
    expect(isDecidedStatus("preparing")).toBe(false);
  });
});

describe("getSectionsShownInDecisionPanel", () => {
  it("議決済みで会派の賛否が読めれば、議決結果と会派ごとの賛否を面に出す", () => {
    expect(getSectionsShownInDecisionPanel("enacted", withFactions)).toEqual([
      RESULT_HEADING,
      FACTION_VOTES_HEADING,
    ]);
  });

  it("会派の賛否が読めなければ、議決結果だけを面に出す", () => {
    expect(getSectionsShownInDecisionPanel("rejected", resultOnly)).toEqual([
      RESULT_HEADING,
    ]);
  });

  // 面は議決前の議案では会派の賛否を出さない。本文から消すと、どこにも出なくなる。
  it("ステータスが議決前なら、会派の賛否があっても何も面に出さない", () => {
    expect(
      getSectionsShownInDecisionPanel("in_originating_house", withFactions)
    ).toEqual([]);
  });

  it("解説から読めなければ何も面に出さない", () => {
    expect(getSectionsShownInDecisionPanel("enacted", null)).toEqual([]);
  });
});
