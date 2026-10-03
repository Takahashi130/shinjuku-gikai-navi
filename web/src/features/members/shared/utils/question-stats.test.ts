import { describe, expect, it } from "vitest";
import {
  formatQuestionBreakdown,
  parseQuestionTopics,
  sortQuestionsNewestFirst,
  summarizeQuestions,
  tallyQuestionsByMember,
} from "./question-stats";

describe("tallyQuestionsByMember", () => {
  it("議員ごとに回数・種類・題名の数を数える", () => {
    const stats = tallyQuestionsByMember([
      { member_id: "a", question_type: "general", topic_count: 2 },
      { member_id: "a", question_type: "representative", topic_count: 5 },
      { member_id: "b", question_type: "general", topic_count: 1 },
    ]);
    expect(stats.get("a")).toEqual({
      count: 2,
      representativeCount: 1,
      generalCount: 1,
      topicCount: 7,
    });
    expect(stats.get("b")?.count).toBe(1);
  });

  // 今の名簿に無い元議員の質問は、member_id が空で残っている。
  it("元議員の行（member_id が空）は数えない", () => {
    const stats = tallyQuestionsByMember([
      { member_id: null, question_type: "general", topic_count: 3 },
    ]);
    expect(stats.size).toBe(0);
  });
});

describe("summarizeQuestions", () => {
  it("題名の数は題名の並びの長さで数える", () => {
    const topic = { number: 1, title: "t", responders: [] };
    expect(
      summarizeQuestions([
        { question_type: "general", topics: [topic, topic] },
        { question_type: "general", topics: [topic] },
      ])
    ).toEqual({
      count: 2,
      representativeCount: 0,
      generalCount: 2,
      topicCount: 3,
    });
  });
});

describe("parseQuestionTopics", () => {
  it("番号の順に題名と答弁者を読む", () => {
    expect(
      parseQuestionTopics([
        { number: 2, title: " ねずみ対策について ", responders: ["区長"] },
        {
          number: 1,
          title: "防災について",
          responders: ["区長", "教育委員会"],
        },
      ])
    ).toEqual([
      { number: 1, title: "防災について", responders: ["区長", "教育委員会"] },
      { number: 2, title: "ねずみ対策について", responders: ["区長"] },
    ]);
  });

  it("題名の無い要素や配列でない値は捨てる", () => {
    expect(parseQuestionTopics(null)).toEqual([]);
    expect(parseQuestionTopics({ title: "x" })).toEqual([]);
    expect(
      parseQuestionTopics([null, "x", { number: 1 }, { title: "  " }])
    ).toEqual([]);
  });

  // 令和7年第3回・第4回のページには答弁者が書かれていない題名がある。
  it("答弁者が無ければ空にする", () => {
    expect(parseQuestionTopics([{ title: "a" }])).toEqual([
      { number: null, title: "a", responders: [] },
    ]);
  });
});

describe("sortQuestionsNewestFirst", () => {
  it("質問した日の新しい順、同じ日はページ内の順に並べる", () => {
    const sorted = sortQuestionsNewestFirst([
      { asked_on: "2025-02-20", sort_order: 3, id: "old" },
      { asked_on: "2026-06-11", sort_order: 5, id: "new-2" },
      { asked_on: "2026-06-11", sort_order: 1, id: "new-1" },
    ]);
    expect(sorted.map((q) => q.id)).toEqual(["new-1", "new-2", "old"]);
  });
});

describe("formatQuestionBreakdown", () => {
  it("0回の種類は書かない", () => {
    expect(
      formatQuestionBreakdown({
        count: 3,
        representativeCount: 1,
        generalCount: 2,
        topicCount: 4,
      })
    ).toBe("代表質問1回・一般質問2回");
    expect(
      formatQuestionBreakdown({
        count: 2,
        representativeCount: 0,
        generalCount: 2,
        topicCount: 2,
      })
    ).toBe("一般質問2回");
  });
});
