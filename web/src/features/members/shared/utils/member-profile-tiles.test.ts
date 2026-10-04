import { describe, expect, it } from "vitest";
import { buildProfileTiles } from "./member-profile-tiles";

const questions = {
  count: 5,
  representativeCount: 1,
  generalCount: 4,
  topicCount: 18,
};
const expense = {
  fiscalYear: 2025,
  periodLabel: "令和7年4月～令和8年3月分",
  totalExpense: 12_135_127,
  memberCount: 7,
  divisor: { value: 7, basis: "member_count" as const },
  perMember: 1_733_590,
};
const TERM_START = "2023-05-01";

describe("buildProfileTiles", () => {
  it("質問・反対した議案・政務活動費の目安・政策提案の順に並べる", () => {
    const tiles = buildProfileTiles({
      questions,
      termStart: TERM_START,
      votes: { total: 820, againstCount: 133 },
      hasFaction: true,
      expense,
    });

    expect(tiles.map((tile) => tile.id)).toEqual([
      "questions",
      "votes",
      "expenses",
      "proposals",
    ]);
    expect(tiles[0]).toMatchObject({
      figure: { value: "5", unit: "回" },
      // 一覧のカードと同じく、数えた期間（今の任期）を書く
      note: "今の任期（2023年5月〜）・代表質問1回・一般質問4回",
    });
    expect(tiles[1]).toMatchObject({
      figure: { value: "133", unit: "件" },
      note: "賛否の記録820件のうち",
    });
    expect(tiles[2]).toMatchObject({
      label: "会派の政務活動費・1人あたり（目安）",
      figure: { prefix: "約", value: "173", unit: "万円" },
      note: "令和7年度・会派の支出÷人数",
    });
  });

  // 区の議案一覧に提出者が載っていないので、推測の数を作らない。
  it("政策提案は数を出さず、提出者の記載が無いと書く", () => {
    const [, , , proposals] = buildProfileTiles({
      questions,
      termStart: TERM_START,
      votes: { total: 0, againstCount: 0 },
      hasFaction: true,
      expense,
    });
    expect(proposals).toMatchObject({
      figure: null,
      fallback: "—",
      note: "区の議案一覧に、議員ごとの提出者の記載がありません",
    });
  });

  it("会派に属していなければ、会派の数字は出さず理由を書く", () => {
    const [, votes, expenses] = buildProfileTiles({
      questions,
      termStart: TERM_START,
      votes: { total: 0, againstCount: 0 },
      hasFaction: false,
      expense: null,
    });
    expect(votes).toMatchObject({ figure: null, note: "会派に属していません" });
    expect(expenses).toMatchObject({
      figure: null,
      note: "会派に属していません",
    });
  });

  it("記録が無いときは、無いと書く", () => {
    const [questionTile, votes] = buildProfileTiles({
      questions: {
        count: 0,
        representativeCount: 0,
        generalCount: 0,
        topicCount: 0,
      },
      termStart: TERM_START,
      votes: { total: 0, againstCount: 0 },
      hasFaction: true,
      expense: null,
    });
    expect(questionTile).toMatchObject({
      figure: { value: "0", unit: "回" },
      note: "今の任期（2023年5月〜）・質問の記録はありません",
    });
    expect(votes).toMatchObject({
      figure: null,
      note: "賛否の記録はまだありません",
    });
  });
});
