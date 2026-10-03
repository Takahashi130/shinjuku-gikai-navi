import { describe, expect, it } from "vitest";
import { billSlug, buildContent, sessionSlug, shortSummary, toBillStatus } from "./build-content";
import type { MatchedBill } from "./match-bills";
import type { SessionPage } from "./parse-session-page";

const session: SessionPage = {
  title: "令和8年第2回定例会",
  reiwaYear: 8,
  ordinal: 2,
  type: "regular",
  startDate: "2026-06-10",
  endDate: "2026-06-19",
  bills: [],
  resultsPdfUrl: null,
};

const bill: MatchedBill = {
  kind: "member",
  number: 7,
  label: "議員提出議案第7号",
  name: "学用品の給付に関する条例",
  result: {
    name: "学用品の給付に関する条例",
    summary: "学用品を給付する。\n・対象は区立学校",
    votes: { A: "for", B: "against" },
    result: "否決",
  },
};

describe("toBillStatus", () => {
  it.each([
    ["可決", "enacted"],
    ["承認", "enacted"],
    ["否決", "rejected"],
    ["不承認", "rejected"],
    ["継続審査", null],
  ])("%s → %s", (result, expected) => {
    expect(toBillStatus(result)).toBe(expected);
  });
});

describe("slug", () => {
  it("会期と議案の種類・番号から一意に決まる", () => {
    expect(sessionSlug(session)).toBe("r8-teirei-2");
    expect(billSlug(session, bill)).toBe("r8-teirei-2-giin-7");
  });
});

describe("shortSummary", () => {
  it("最初の行だけを使い、長ければ切り詰める", () => {
    expect(shortSummary("一行目\n二行目")).toBe("一行目");
    expect(shortSummary("あいうえお", 3)).toBe("あい…");
  });
});

describe("buildContent", () => {
  it("概要・議決結果・会派ごとの賛否・出典を含む", () => {
    const content = buildContent(session, "https://example.com/s", bill, [
      { abbr: "A", name: "会派エー" },
      { abbr: "B", name: "会派ビー" },
    ]);
    expect(content).toContain("学用品を給付する。\n- 対象は区立学校");
    expect(content).toContain("**否決**（議員提出議案第7号）");
    expect(content).toContain("- **賛成**：会派エー");
    expect(content).toContain("- **反対**：会派ビー");
    expect(content).toContain("[新宿区議会「令和8年第2回定例会」](https://example.com/s)");
  });
});
