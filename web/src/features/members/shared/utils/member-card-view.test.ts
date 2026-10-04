import { describe, expect, it } from "vitest";
import type { MemberListItem } from "../types";
import { buildMemberCardView, formatMemberMeta } from "./member-card-view";

const TERM_START = "2023-05-01";

const member = (patch: Partial<MemberListItem> = {}): MemberListItem => ({
  id: "m1",
  name: "木もと ひろゆき",
  nameKana: "きもと ひろゆき",
  seatNumber: 1,
  electedCount: 3,
  factionId: "komei",
  positions: [
    {
      body_kind: "special_committee",
      body_name: "防災等安全対策特別委員会",
      role: "委員",
      sort_order: 3,
    },
    {
      body_kind: "standing_committee",
      body_name: "総務区民委員会",
      role: "委員長",
      sort_order: 2,
    },
    {
      body_kind: "council",
      body_name: "新宿区議会",
      role: "議長",
      sort_order: 1,
    },
    {
      body_kind: "faction",
      body_name: "新宿区議会公明党",
      role: "幹事長",
      sort_order: 4,
    },
  ],
  questions: {
    count: 12,
    representativeCount: 1,
    generalCount: 11,
    topicCount: 40,
  },
  expenseEstimate: {
    fiscalYear: 2025,
    periodLabel: "令和7年4月～令和8年3月分",
    totalExpense: 5_845_812,
    memberCount: 8,
    divisor: { value: 8, basis: "member_count" },
    perMember: 730_727,
  },
  ...patch,
});

describe("buildMemberCardView", () => {
  it("役職・委員会・数字をカード用にまとめる", () => {
    expect(buildMemberCardView(member(), TERM_START)).toEqual({
      meta: "3期・議席番号1番",
      councilRoles: ["議長"],
      // 常任委員会を先に。委員でない役は括弧で添える。会派の役職は出さない
      committees: ["総務区民委員会（委員長）", "防災等安全対策特別委員会"],
      questionCount: 12,
      // 議長には、在任中は質問しないことがあると添える
      questionNote:
        "2023年5月〜（今の任期）。議長・副議長は在任中、質問しないことがあります",
      expense: {
        figure: { prefix: "約", value: "73", unit: "万円" },
        note: "令和7年度・会派の支出÷人数",
      },
    });
  });

  it("会派に属していなければ、政務活動費の目安を出さない", () => {
    const view = buildMemberCardView(
      member({ factionId: null, expenseEstimate: null }),
      TERM_START
    );
    expect(view.expense).toEqual({
      figure: null,
      note: "会派に属していません",
    });
  });

  it("質問の記録が無くても0回と出す", () => {
    const view = buildMemberCardView(
      member({
        questions: {
          count: 0,
          representativeCount: 0,
          generalCount: 0,
          topicCount: 0,
        },
      }),
      TERM_START
    );
    expect(view.questionCount).toBe(0);
  });

  // 前の任期から議員の人ほど多く見えないよう、数えた期間を必ず書く
  it("質問の回数には、数えた期間（今の任期）を添える", () => {
    const view = buildMemberCardView(member({ positions: [] }), TERM_START);
    expect(view.questionNote).toBe("2023年5月〜（今の任期）");
  });
});

describe("formatMemberMeta", () => {
  it("分からないものは書かない", () => {
    expect(formatMemberMeta({ electedCount: 1, seatNumber: null })).toBe("1期");
    expect(formatMemberMeta({ electedCount: null, seatNumber: null })).toBe("");
  });
});
