import type {
  MemberQuestion,
  PlenaryQuestionRow,
  QuestionStats,
  QuestionTopic,
} from "../types";

/**
 * 本会議の質問（代表質問・一般質問）の数え方。
 *
 * 区の「質問者・質問内容一覧」ページの1人の1回の質問を1回と数える。委員会での
 * 質問は数えない（会議録システムは自動取得が禁止されているため、取り込んでいない）。
 */

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  representative: "代表質問",
  general: "一般質問",
};

export const ANSWER_STYLE_LABELS: Record<string, string> = {
  one_by_one: "一問一答方式",
  bulk: "一括方式",
};

export function emptyQuestionStats(): QuestionStats {
  return { count: 0, representativeCount: 0, generalCount: 0, topicCount: 0 };
}

type QuestionStatsRow = Pick<
  PlenaryQuestionRow,
  "member_id" | "question_type" | "topic_count"
>;

function addQuestion(
  stats: QuestionStats,
  row: Pick<QuestionStatsRow, "question_type" | "topic_count">
): QuestionStats {
  return {
    count: stats.count + 1,
    representativeCount:
      stats.representativeCount +
      (row.question_type === "representative" ? 1 : 0),
    generalCount:
      stats.generalCount + (row.question_type === "general" ? 1 : 0),
    topicCount: stats.topicCount + Math.max(0, row.topic_count),
  };
}

/** 質問の行を議員ごとに数える。元議員（member_id が無い行）は数えない。 */
export function tallyQuestionsByMember(
  rows: readonly QuestionStatsRow[]
): Map<string, QuestionStats> {
  const byMember = new Map<string, QuestionStats>();
  for (const row of rows) {
    if (!row.member_id) continue;
    const current = byMember.get(row.member_id) ?? emptyQuestionStats();
    byMember.set(row.member_id, addQuestion(current, row));
  }
  return byMember;
}

/** 1人分の質問から数を出す。 */
export function summarizeQuestions(
  questions: readonly Pick<MemberQuestion, "question_type" | "topics">[]
): QuestionStats {
  return questions.reduce(
    (stats, question) =>
      addQuestion(stats, {
        question_type: question.question_type,
        topic_count: question.topics.length,
      }),
    emptyQuestionStats()
  );
}

/**
 * DB の topics（jsonb）を題名の並びにする。
 * 形の違う要素（題名の無いものなど）は捨て、壊れたデータで画面を落とさない。
 */
export function parseQuestionTopics(value: unknown): QuestionTopic[] {
  if (!Array.isArray(value)) return [];
  const topics: QuestionTopic[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const { number, title, responders } = item as Record<string, unknown>;
    if (typeof title !== "string" || title.trim() === "") continue;
    topics.push({
      number: typeof number === "number" ? number : null,
      title: title.trim(),
      responders: Array.isArray(responders)
        ? responders.filter(
            (r): r is string => typeof r === "string" && r.trim() !== ""
          )
        : [],
    });
  }
  return topics.sort(
    (a, b) =>
      (a.number ?? Number.MAX_SAFE_INTEGER) -
      (b.number ?? Number.MAX_SAFE_INTEGER)
  );
}

/** 質問を新しい順に並べる（同じ日はページ内の順）。 */
export function sortQuestionsNewestFirst<
  T extends Pick<MemberQuestion, "asked_on" | "sort_order">,
>(questions: readonly T[]): T[] {
  return [...questions].sort(
    (a, b) =>
      b.asked_on.localeCompare(a.asked_on) || a.sort_order - b.sort_order
  );
}

/** 「代表質問1回・一般質問12回」のような内訳。0回の種類は書かない。 */
export function formatQuestionBreakdown(stats: QuestionStats): string {
  const parts = [
    stats.representativeCount > 0
      ? `代表質問${stats.representativeCount}回`
      : null,
    stats.generalCount > 0 ? `一般質問${stats.generalCount}回` : null,
  ].filter((part): part is string => part !== null);
  return parts.join("・");
}
