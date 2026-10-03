import { ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils/date";
import type { MemberQuestion, QuestionStats } from "../../shared/types";
import {
  ANSWER_STYLE_LABELS,
  formatQuestionBreakdown,
  QUESTION_TYPE_LABELS,
} from "../../shared/utils/question-stats";
import { EmptyNote, ProfileSection } from "./profile-section";

/** はじめから開いておく質問の数。残りは「すべて見る」の中に入れる。 */
const VISIBLE_QUESTIONS = 5;

/**
 * 本会議の質問（代表質問・一般質問）。回数と、会期ごとの題名・答弁者。
 * 委員会の質問は数えない（会議録システムは自動取得が禁止されているため）。
 */
export function MemberQuestionsSection({
  questions,
  stats,
  currentFactionName,
  questionsSince,
}: {
  questions: MemberQuestion[];
  stats: QuestionStats;
  currentFactionName: string | null;
  questionsSince: { sessionTitle: string; askedOn: string } | null;
}) {
  const visible = questions.slice(0, VISIBLE_QUESTIONS);
  const rest = questions.slice(VISIBLE_QUESTIONS);
  const scope = questionsSince
    ? `${questionsSince.sessionTitle}（${formatDate(questionsSince.askedOn)}）以降`
    : "区の資料にある範囲";

  return (
    <ProfileSection
      id="questions"
      title="本会議の質問"
      lead={`${scope}の本会議での代表質問・一般質問を、区の「質問者・質問内容一覧」から数えています。委員会での質問は含みません。`}
    >
      {stats.count === 0 ? (
        <EmptyNote>この期間に本会議で質問した記録はありません。</EmptyNote>
      ) : (
        <>
          <p className="text-sm text-mirai-text">
            <span className="text-2xl font-bold">{stats.count}</span>
            <span className="ml-0.5 font-bold">回</span>
            <span className="ml-2 text-[13px] text-mirai-text-secondary">
              {`（${formatQuestionBreakdown(stats)}・質問の題名は計${stats.topicCount}件）`}
            </span>
          </p>

          <ol className="flex flex-col gap-3">
            {visible.map((question) => (
              <QuestionItem
                key={question.id}
                question={question}
                currentFactionName={currentFactionName}
              />
            ))}
          </ol>

          {rest.length > 0 && (
            <details className="rounded-md border border-mirai-border">
              <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-bold text-brand-link hover:underline">
                {`それより前の質問を見る（${rest.length}回）`}
              </summary>
              <ol className="flex flex-col gap-3 border-mirai-border border-t p-3">
                {rest.map((question) => (
                  <QuestionItem
                    key={question.id}
                    question={question}
                    currentFactionName={currentFactionName}
                  />
                ))}
              </ol>
            </details>
          )}
        </>
      )}
    </ProfileSection>
  );
}

function QuestionItem({
  question,
  currentFactionName,
}: {
  question: MemberQuestion;
  currentFactionName: string | null;
}) {
  const typeLabel = QUESTION_TYPE_LABELS[question.question_type] ?? "質問";
  const styleLabel = question.answer_style
    ? ANSWER_STYLE_LABELS[question.answer_style]
    : undefined;
  // 会派を移った・会派名が変わった議員は、質問したときの会派も添える
  const factionAtTheTime =
    question.faction_name && question.faction_name !== currentFactionName
      ? question.faction_name
      : null;

  return (
    <li className="flex flex-col gap-2 rounded-md border border-mirai-border p-3 md:p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-sm bg-brand-accent-tint px-1.5 py-0.5 text-xs font-bold text-brand-link">
          {typeLabel}
        </span>
        <h3 className="text-sm font-bold text-mirai-text">
          {question.session_title}
        </h3>
        <span className="text-xs text-mirai-text-muted">
          {[formatDate(question.asked_on), styleLabel]
            .filter(Boolean)
            .join("・")}
        </span>
      </div>
      {factionAtTheTime && (
        <p className="text-xs text-mirai-text-secondary">
          {`質問したときの会派：${factionAtTheTime}`}
        </p>
      )}

      <ol className="flex flex-col gap-1.5">
        {question.topics.map((topic, index) => (
          <li
            key={`${topic.number ?? index}-${topic.title}`}
            className="flex gap-2 text-sm leading-relaxed text-mirai-text"
          >
            <span className="shrink-0 font-bold text-mirai-text-muted">
              {`${topic.number ?? index + 1}.`}
            </span>
            <span className="min-w-0">
              {topic.title}
              {topic.responders.length > 0 && (
                <span className="block text-xs text-mirai-text-muted">
                  {`答弁：${topic.responders.join("、")}`}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      <a
        href={question.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center gap-1 text-xs text-brand-link hover:text-brand-link-hover hover:underline"
      >
        出典：区の「質問者・質問内容一覧」
        <ExternalLink className="size-3" aria-hidden />
        <span className="sr-only">（新しいタブで開きます）</span>
      </a>
    </li>
  );
}
