import { MessageSquareText } from "lucide-react";
import { LabelPill } from "@/components/ui/label-pill";
import { formatDate } from "@/lib/utils/date";
import type { MemberQuestion, QuestionStats } from "../../shared/types";
import {
  ANSWER_STYLE_LABELS,
  formatQuestionBreakdown,
  QUESTION_TYPE_LABELS,
} from "../../shared/utils/question-stats";
import {
  formatCurrentTermSince,
  isPresidingOfficerRole,
  PRESIDING_OFFICER_QUESTION_NOTE,
} from "../../shared/utils/term-label";
import {
  EmptyNote,
  ExternalTextLink,
  MoreDetails,
  ProfileSection,
} from "./profile-section";

/** はじめから開いておく質問の数。残りは折りたたむ。 */
const VISIBLE_QUESTIONS = 5;

/**
 * 本会議の質問（代表質問・一般質問）。回数と、会期ごとの題名・答弁者。
 * 委員会の質問は数えない（会議録システムは自動取得が禁止されているため）。
 *
 * 回数は、一覧のカード・上部のタイルと同じ「今の任期」の回数と、区の資料に
 * ある範囲（令和元年から）の合計を並べる。議長・副議長には、在任中は質問して
 * いないことがあると添える。
 */
export function MemberQuestionsSection({
  questions,
  stats,
  termStats,
  termStart,
  currentFactionName,
  questionsSince,
  memberName,
  presidingRoles,
}: {
  questions: MemberQuestion[];
  /** 区の資料にある範囲（令和元年から）の合計 */
  stats: QuestionStats;
  /** 今の任期の回数 */
  termStats: QuestionStats;
  termStart: string | null;
  currentFactionName: string | null;
  questionsSince: { sessionTitle: string; askedOn: string } | null;
  memberName: string;
  /** 議会の役職（議長・副議長など） */
  presidingRoles: string[];
}) {
  const visible = questions.slice(0, VISIBLE_QUESTIONS);
  const rest = questions.slice(VISIBLE_QUESTIONS);
  const scope = questionsSince
    ? `${questionsSince.sessionTitle}（${formatDate(questionsSince.askedOn)}）以降`
    : "区の資料にある範囲";
  const termLabel = formatCurrentTermSince(termStart);
  const presidingRole = presidingRoles.find(isPresidingOfficerRole) ?? null;
  const lastAskedOn = questions[0]?.asked_on ?? null;

  return (
    <ProfileSection
      id="questions"
      title="本会議の質問"
      icon={MessageSquareText}
      description={`${scope}の本会議での代表質問・一般質問を、区の「質問者・質問内容一覧」から数えています。委員会での質問は含みません。`}
    >
      {presidingRole && (
        <p className="rounded-2xl bg-mirai-surface px-4 py-3 text-sm leading-relaxed text-mirai-text-secondary">
          {[
            `${memberName}さんは${presidingRole}です。${PRESIDING_OFFICER_QUESTION_NOTE}`,
            lastAskedOn
              ? `最後に本会議で質問したのは${formatDate(lastAskedOn)}です。`
              : null,
          ]
            .filter(Boolean)
            .join("")}
        </p>
      )}

      {stats.count === 0 ? (
        <EmptyNote>この期間に本会議で質問した記録はありません。</EmptyNote>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2">
            {termLabel && (
              <QuestionCount
                label={termLabel}
                stats={termStats}
                note="一覧のカードと同じ期間（全員同じ）"
              />
            )}
            <QuestionCount
              label={`${scope}の合計`}
              stats={stats}
              note={`質問の題名は計${stats.topicCount}件`}
            />
          </dl>
          <p className="text-xs leading-relaxed text-mirai-text-muted">
            代表質問は会派を代表して行う質問です。
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
            <MoreDetails summary={`それより前の質問を見る（${rest.length}回）`}>
              <ol className="flex flex-col gap-3">
                {rest.map((question) => (
                  <QuestionItem
                    key={question.id}
                    question={question}
                    currentFactionName={currentFactionName}
                  />
                ))}
              </ol>
            </MoreDetails>
          )}
        </>
      )}
    </ProfileSection>
  );
}

function QuestionCount({
  label,
  stats,
  note,
}: {
  label: string;
  stats: QuestionStats;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-mirai-surface px-4 py-3">
      <dt className="text-xs font-bold text-mirai-text-secondary">{label}</dt>
      <dd className="flex flex-wrap items-baseline gap-x-1 text-mirai-text">
        <span className="font-lexend text-3xl font-bold leading-none tracking-tight">
          {stats.count}
        </span>
        <span className="text-sm font-bold">回</span>
      </dd>
      <dd className="text-xs leading-relaxed text-mirai-text-muted">
        {[formatQuestionBreakdown(stats), note].filter(Boolean).join("・")}
      </dd>
    </div>
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
    <li className="flex flex-col gap-3 rounded-2xl bg-mirai-surface p-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <LabelPill tone="accent">{typeLabel}</LabelPill>
          <h3 className="text-base font-bold text-mirai-text">
            {question.session_title}
          </h3>
        </div>
        <p className="text-xs text-mirai-text-muted">
          {[formatDate(question.asked_on), styleLabel]
            .filter(Boolean)
            .join("・")}
          {factionAtTheTime && `・質問したときの会派：${factionAtTheTime}`}
        </p>
      </div>

      {question.topics.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {question.topics.map((topic, index) => (
            <li
              key={`${topic.number ?? index}-${topic.title}`}
              className="flex gap-2 text-sm leading-relaxed text-mirai-text"
            >
              <span className="shrink-0 font-lexend font-bold text-mirai-text-muted">
                {`${topic.number ?? index + 1}.`}
              </span>
              <span className="min-w-0">
                {topic.title}
                {topic.responders.length > 0 && (
                  <span className="block text-xs text-mirai-text-secondary">
                    {`答弁：${topic.responders.join("、")}`}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-mirai-text-secondary">
          題名は区のページでご確認ください。
        </p>
      )}

      <p className="text-xs">
        {/* 押せる範囲は上下に広げ、カードの高さは変えない */}
        <ExternalTextLink href={question.source_url} className="-my-3 py-3">
          出典：区の「質問者・質問内容一覧」
        </ExternalTextLink>
      </p>
    </li>
  );
}
