import type { ExpenseEstimate, QuestionStats } from "../types";
import { describeExpenseEstimate, type FigureParts } from "./faction-expenses";
import { formatQuestionBreakdown } from "./question-stats";
import type { FactionVotesSummary } from "./summarize-faction-votes";
import { formatCurrentTermSince } from "./term-label";

/** タイルを押すと飛ぶ、議員のページの節の id。 */
export type ProfileTileId = "questions" | "votes" | "expenses" | "proposals";

/** 議員のページの上部に並べる数字のタイル1枚。 */
export type ProfileTile = {
  id: ProfileTileId;
  label: string;
  /** 大きく出す数字。出せなければ null で、fallback を出す */
  figure: FigureParts | null;
  /** 数字の代わりの短い文字（「—」「非公表」） */
  fallback: string;
  note: string;
};

/**
 * 議員のページ（/members/[id]）の上部の数字のタイル。
 *
 * 数は並べるだけで、ほかの議員との比較や順位は付けない。本会議の質問は、
 * 一覧のカードと同じく今の任期の始まりから数えたもの（termQuestions）を出し、
 * その期間を書く。政策提案（議員提出議案）は、区の議案一覧に提出者が載って
 * いないので、数を作らない。
 */
export function buildProfileTiles({
  questions,
  termStart,
  votes,
  hasFaction,
  expense,
}: {
  /** 今の任期の本会議の質問の回数 */
  questions: QuestionStats;
  termStart: string | null;
  votes: Pick<FactionVotesSummary, "total" | "againstCount">;
  hasFaction: boolean;
  /** 所属会派のいちばん新しい期間の目安（latestExpenseEstimate） */
  expense: ExpenseEstimate | null;
}): ProfileTile[] {
  const expenseFigure = describeExpenseEstimate(expense, hasFaction);
  const since = formatCurrentTermSince(termStart) ?? "区の資料にある範囲";

  return [
    {
      id: "questions",
      label: "本会議の質問",
      figure: { prefix: "", value: String(questions.count), unit: "回" },
      fallback: "—",
      note:
        questions.count > 0
          ? `${since}・${formatQuestionBreakdown(questions)}`
          : `${since}・質問の記録はありません`,
    },
    {
      id: "votes",
      label: "所属会派が反対した議案",
      figure:
        hasFaction && votes.total > 0
          ? { prefix: "", value: String(votes.againstCount), unit: "件" }
          : null,
      fallback: "—",
      note: !hasFaction
        ? "会派に属していません"
        : votes.total > 0
          ? `賛否の記録${votes.total}件のうち`
          : "賛否の記録はまだありません",
    },
    {
      id: "expenses",
      label: "会派の政務活動費・1人あたり（目安）",
      figure: expenseFigure.figure,
      fallback: "—",
      note: expenseFigure.note,
    },
    {
      id: "proposals",
      label: "政策提案（議員提出議案）",
      figure: null,
      fallback: "—",
      note: "区の議案一覧に、議員ごとの提出者の記載がありません",
    },
  ];
}
