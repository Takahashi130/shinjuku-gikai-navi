import { describe, expect, it } from "vitest";
import { buildFactionVotes } from "./faction-votes";
import type { ResultRow } from "./parse-results-pdf";

const result: ResultRow = {
  name: "新宿区立学校における学用品の給付に関する条例",
  summary: "学用品を給付する。",
  votes: { 自参ク: "against", 共産: "for", れいわ: "unknown" },
  voteNotes: { 自参ク: "1人賛成" },
  result: "否決",
};

describe("buildFactionVotes", () => {
  it("PDF の列の順に、略称・正式名称・賛否・注記の行を作る", () => {
    const rows = buildFactionVotes(result, [
      { abbr: "自参ク", name: "自民・参政クラブ" },
      { abbr: "共産", name: "日本共産党新宿区議会議員団" },
      { abbr: "れいわ", name: "れいわ新選組 新宿" },
      { abbr: "維新", name: "日本維新の会・新宿区議団" },
    ]);
    expect(rows).toEqual([
      { factionAbbr: "自参ク", factionName: "自民・参政クラブ", vote: "against", note: "1人賛成", sortOrder: 0 },
      { factionAbbr: "共産", factionName: "日本共産党新宿区議会議員団", vote: "for", note: null, sortOrder: 1 },
      { factionAbbr: "れいわ", factionName: "れいわ新選組 新宿", vote: "unknown", note: null, sortOrder: 2 },
      // 行に記号が無い会派は「不明」
      { factionAbbr: "維新", factionName: "日本維新の会・新宿区議団", vote: "unknown", note: null, sortOrder: 3 },
    ]);
  });

  it("同じ略称が2回出たら最初の列だけを使う", () => {
    const rows = buildFactionVotes(result, [
      { abbr: "共産", name: "日本共産党新宿区議会議員団" },
      { abbr: "共産", name: "共産" },
    ]);
    expect(rows).toHaveLength(1);
  });
});
