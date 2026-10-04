import "server-only";

import {
  ArrowDown,
  ArrowLeft,
  BookOpen,
  IdCard,
  Info,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { LabelPill } from "@/components/ui/label-pill";
import { RoundCard } from "@/components/ui/round-card";
import { SITE } from "@/config/site";
import { routes } from "@/lib/routes";
import { formatDateWithDots } from "@/lib/utils/date";
import { FigureValue } from "../../client/components/figure-value";
import { MemberInitialIcon } from "../../client/components/member-initial-icon";
import { latestExpenseEstimate } from "../../shared/utils/faction-expenses";
import { groupMemberPositions } from "../../shared/utils/member-positions";
import {
  buildProfileTiles,
  type ProfileTile,
} from "../../shared/utils/member-profile-tiles";
import {
  DEFAULT_MEMBERS_LIST_PARAMS,
  membersListHref,
} from "../../shared/utils/members-list-params";
import { isOnOrAfter } from "../../shared/utils/membership-window";
import { summarizeQuestions } from "../../shared/utils/question-stats";
import { formatElectedTerms } from "../../shared/utils/term-label";
import type { MemberProfile } from "../loaders/get-member-profile";
import { getMembersDirectory } from "../loaders/get-members-directory";
import { MemberBasicInfo } from "./member-basic-info";
import { MemberExpensesSection } from "./member-expenses-section";
import { MemberFactionVotesSection } from "./member-faction-votes-section";
import { MemberProposalsSection } from "./member-proposals-section";
import { MemberQuestionsSection } from "./member-questions-section";
import { RANKING_NOTE, SourceLinks } from "./members-page-note";
import { ProfileSection } from "./profile-section";

/**
 * 議員のページ（/members/[id]）。議案のページと同じく、1枚目の大きな角丸の
 * カードに、上から
 *
 * 1. 濃色の帯：議員カルテ・議席番号・期数・議会の役職と任期
 * 2. 頭文字のアイコン・よみ・名前・会派
 * 3. 数字のタイル（今の任期の本会議の質問・会派が反対した議案・政務活動費の
 *    目安・政策提案）。押すとその節へ飛ぶ
 *
 * を置き、その下に 基本情報 / 本会議の質問 / 所属会派の賛否 / 所属会派の
 * 政務活動費 / 政策提案 / 出典 のカードを続ける。
 *
 * 数字は並べるだけで、ほかの議員と比べたり順位を付けたりしない。
 */
export async function MemberProfilePage({
  profile,
}: {
  profile: MemberProfile;
}) {
  const { questionsSince } = await getMembersDirectory();
  const { member, faction } = profile;
  const positions = groupMemberPositions(profile.positions);
  const termStart = profile.term?.termStart ?? null;
  const questionStats = summarizeQuestions(profile.questions);
  // タイルは一覧のカードと同じく、今の任期の始まりから数える
  const termQuestionStats = summarizeQuestions(
    profile.questions.filter((q) => isOnOrAfter(q.asked_on, termStart))
  );
  // profile.expenses は会派にいた期間のものだけで、新しい順（一覧のカードと同じ期間）
  const tiles = buildProfileTiles({
    questions: termQuestionStats,
    termStart,
    votes: profile.votes,
    hasFaction: faction !== null,
    expense: latestExpenseEstimate(profile.expenses, null),
  });
  const factionHref = faction
    ? membersListHref(DEFAULT_MEMBERS_LIST_PARAMS, { faction: faction.slug })
    : null;

  const breadcrumb: BreadcrumbItem[] = [
    { label: "トップ", href: routes.home() },
    { label: "議員カルテ", href: routes.membersList() },
    ...(faction && factionHref
      ? [{ label: faction.name, href: factionHref }]
      : []),
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:py-8">
      <Breadcrumb items={breadcrumb} />

      <RoundCard asChild padding="none" className="overflow-hidden">
        <article aria-labelledby="member-name">
          <div
            data-surface="dark"
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-brand-header px-5 py-4 text-brand-on-header md:px-8"
          >
            <div className="flex flex-wrap items-center gap-2">
              <LabelPill tone="solid" size="md">
                <IdCard aria-hidden />
                議員カルテ
              </LabelPill>
              {positions.councilRoles.map((role) => (
                <LabelPill key={role} tone="on-dark" size="md">
                  {role}
                </LabelPill>
              ))}
              {member.seatNumber !== null && (
                <LabelPill tone="on-dark" size="md">
                  {`議席番号 ${member.seatNumber}番`}
                </LabelPill>
              )}
              {member.electedCount !== null && (
                <LabelPill tone="on-dark" size="md">
                  {formatElectedTerms(member.electedCount)}
                </LabelPill>
              )}
            </div>
            {profile.term && (
              <span className="text-xs text-brand-on-header-muted">
                {`第${profile.term.termNumber}期・任期は${formatDateWithDots(profile.term.termEnd)}まで`}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-6 p-5 md:gap-8 md:p-8">
            <div className="flex items-start gap-4 md:gap-6">
              <MemberInitialIcon name={member.name} size="lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-col gap-1">
                  {member.nameKana && (
                    <p className="text-sm text-mirai-text-muted">
                      {member.nameKana}
                    </p>
                  )}
                  {/* 名の途中で折り返さない（語のまとまりで折り返す） */}
                  <h1
                    id="member-name"
                    className="break-phrase text-[28px] font-extrabold leading-tight tracking-tight text-mirai-text md:text-4xl"
                  >
                    {member.name}
                  </h1>
                </div>
                {faction && factionHref ? (
                  /*
                    会派名は省略せずに折り返す（会派によって全部見えたり切れたり
                    しないように）。1行なら見た目は 36px、押せる範囲は上下に
                    広げて 44px にする
                  */
                  <Link
                    href={factionHref}
                    className="relative inline-flex min-h-9 w-fit max-w-full items-center gap-1.5 rounded-2xl bg-mirai-surface px-3.5 py-1.5 text-sm font-bold leading-snug text-mirai-text after:absolute after:inset-x-0 after:-inset-y-1 hover:text-brand-link hover:underline"
                  >
                    <Users className="size-4 shrink-0" aria-hidden />
                    <span className="break-phrase">{faction.name}</span>
                  </Link>
                ) : (
                  <p className="text-sm text-mirai-text-secondary">
                    会派に属していません
                  </p>
                )}
                {positions.factionRoles.length > 0 && (
                  <p className="text-xs text-mirai-text-secondary">
                    {`会派での役職：${positions.factionRoles.map((r) => r.role).join("・")}`}
                  </p>
                )}
              </div>
            </div>

            <nav aria-label="このページの内容">
              {/* 2列だと注記が語の途中で切れるほど狭い画面では、1列にする */}
              <ul className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-4">
                {tiles.map((tile) => (
                  <li key={tile.id}>
                    <StatTile tile={tile} />
                  </li>
                ))}
              </ul>
            </nav>

            <p className="flex items-start gap-2 rounded-2xl bg-mirai-surface px-4 py-3 text-sm leading-relaxed text-mirai-text-secondary">
              <Info
                className="mt-0.5 size-4 shrink-0 text-mirai-text-muted"
                aria-hidden
              />
              <span className="break-phrase">
                <span className="font-bold text-mirai-text">
                  {RANKING_NOTE}
                </span>
                ほかの議員と比べたり、数で順位を付けたりはしていません。
              </span>
            </p>
          </div>
        </article>
      </RoundCard>

      <MemberBasicInfo profile={profile} positions={positions} />

      <MemberQuestionsSection
        questions={profile.questions}
        stats={questionStats}
        termStats={termQuestionStats}
        termStart={termStart}
        currentFactionName={faction?.name ?? null}
        questionsSince={questionsSince}
        memberName={member.name}
        presidingRoles={positions.councilRoles}
      />

      <MemberFactionVotesSection
        faction={faction}
        votes={profile.votes}
        window={{ start: profile.windowStart, basis: profile.windowBasis }}
        termNumber={profile.term?.termNumber ?? null}
        memberName={member.name}
        hasPastFactions={profile.memberships.some(
          (period) => period.faction_id !== faction?.id
        )}
      />

      <MemberExpensesSection
        faction={faction}
        expenses={profile.expenses}
        window={{ start: profile.windowStart, basis: profile.windowBasis }}
        termNumber={profile.term?.termNumber ?? null}
        memberName={member.name}
      />

      <MemberProposalsSection submittedBillCount={profile.submittedBillCount} />

      <ProfileSection id="sources" title="出典" icon={BookOpen}>
        <SourceLinks sources={profile.sources} />
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-mirai-text-secondary">
          <li>
            本会議の質問は会期ごとの「質問者・質問内容一覧」のページ（質問ごとにリンク）、会派の賛否は区の「議案の概要と審議結果」（各議案のページに出典）をもとにしています。
          </li>
          <li>顔写真・住所・電話番号・メールアドレスは載せていません。</li>
          <li>
            {`${SITE.NAME}は新宿区・新宿区議会の公式サービスではありません。正確な情報は区の公式ページでご確認ください。`}
          </li>
        </ul>
        <Link
          href={routes.membersList()}
          className="inline-flex min-h-11 w-fit items-center gap-1 text-sm font-bold text-brand-link hover:text-brand-link-hover hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          議員の一覧に戻る
        </Link>
      </ProfileSection>
    </div>
  );
}

/**
 * 数字のタイル。押すとその節へ飛ぶ（同じページの中の移動なので a を使う）。
 * 数字と単位はまとめて読み上げる。
 */
function StatTile({ tile }: { tile: ProfileTile }) {
  return (
    <a
      href={`#${tile.id}`}
      className="group flex h-full flex-col gap-2 rounded-2xl border border-line-soft bg-white p-4 transition-shadow hover:border-brand-link/40 hover:shadow-md"
    >
      <span className="break-phrase text-xs font-bold leading-snug text-mirai-text-secondary">
        {tile.label}
      </span>
      <span className="text-mirai-text">
        <FigureValue figure={tile.figure} fallback={tile.fallback} size="lg" />
      </span>
      <span className="break-phrase text-xs leading-snug text-mirai-text-muted">
        {tile.note}
      </span>
      <span
        aria-hidden
        className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-brand-link group-hover:underline"
      >
        詳しく
        <ArrowDown className="size-3.5" />
      </span>
    </a>
  );
}
