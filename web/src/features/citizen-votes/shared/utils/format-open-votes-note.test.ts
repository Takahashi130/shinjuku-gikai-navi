import { describe, expect, it } from "vitest";
import { formatOpenVotesNote } from "./format-open-votes-note";

const NOW = new Date("2026-10-04T01:00:00Z");

describe("formatOpenVotesNote", () => {
  it("次の締切と残りの日数を出す", () => {
    expect(
      formatOpenVotesNote(
        {
          count: 24,
          earliestClosesAt: "2026-10-15T05:00:00.000Z",
          dietSessionIds: ["s1"],
        },
        NOW
      )
    ).toBe("次の締切 10月15日（木）14:00・あと11日");
  });

  it("締切が未定なら、投票できることだけを書く", () => {
    expect(
      formatOpenVotesNote(
        { count: 1, earliestClosesAt: null, dietSessionIds: [] },
        NOW
      )
    ).toBe("採決前の議案に、賛成・反対を投じられます");
  });

  it("受付中が無ければそう書く", () => {
    expect(
      formatOpenVotesNote(
        { count: 0, earliestClosesAt: null, dietSessionIds: [] },
        NOW
      )
    ).toBe("いま受け付けている議案はありません");
  });
});
