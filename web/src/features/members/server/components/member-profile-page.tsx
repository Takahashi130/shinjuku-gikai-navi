import "server-only";

import Link from "next/link";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { SITE } from "@/config/site";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils/date";
import { MemberInitialIcon } from "../../client/components/member-initial-icon";
import {
  estimatePerMemberExpense,
  formatYen,
} from "../../shared/utils/faction-expenses";
import {
  formatCommitteeSeat,
  groupMemberPositions,
} from "../../shared/utils/member-positions";
import {
  DEFAULT_MEMBERS_LIST_PARAMS,
  membersListHref,
} from "../../shared/utils/members-list-params";
import { summarizeQuestions } from "../../shared/utils/question-stats";
import type { MemberProfile } from "../loaders/get-member-profile";
import { getMembersDirectory } from "../loaders/get-members-directory";
import { MemberBasicInfo } from "./member-basic-info";
import { MemberExpensesSection } from "./member-expenses-section";
import { MemberFactionVotesSection } from "./member-faction-votes-section";
import { SourceLinks } from "./members-page-note";
import { MemberProposalsSection } from "./member-proposals-section";
import { MemberQuestionsSection } from "./member-questions-section";

/**
 * 議員のページ（/members/[id]）。議案ページと同じ Amazon の商品ページの作り。
 *
 * - 上: 頭文字のアイコン・名前・会派・役職と、数字のタイル（各節へ飛ぶ）
 * - 中央: 基本情報 / 本会議の質問 / 所属会派の賛否 / 所属会派の政務活動費 / 政策提案
 * - 右（スマホでは最後）: 出典と「ランキングはしていません」の注記
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
  const questionStats = summarizeQuestions(profile.questions);
  const [latestExpense] = profile.expenses;
  const latestPerMember = latestExpense
    ? estimatePerMemberExpense(
        latestExpense.total_expense,
        latestExpense.member_count
      )
    : null;

  const breadcrumb: BreadcrumbItem[] = [
    { label: "トップ", href: routes.home() },
    { label: "議員をさがす", href: routes.membersList() },
    ...(faction
      ? [
          {
            label: faction.name,
            href: membersListHref(DEFAULT_MEMBERS_LIST_PARAMS, {
              faction: faction.slug,
            }),
          },
        ]
      : []),
  ];

  const tiles: StatTileProps[] = [
    {
      href: "#questions",
      label: "本会議の質問",
      value: `${questionStats.count}回`,
      note:
        questionStats.count > 0
          ? `題名 ${questionStats.topicCount}件`
          : "記録なし",
    },
    {
      href: "#votes",
      label: "所属会派が反対した議案",
      value:
        faction && profile.votes.total > 0
          ? `${profile.votes.againstCount}件`
          : "—",
      note: !faction
        ? "会派なし"
        : profile.votes.total > 0
          ? `賛否の記録 ${profile.votes.total}件のうち`
          : "賛否の記録なし",
    },
    {
      href: "#expenses",
      label: "政務活動費 1人あたりの目安",
      value: latestPerMember !== null ? formatYen(latestPerMember) : "—",
      note: latestExpense
        ? `${latestExpense.period_label}・会派の支出÷人数`
        : "収支一覧なし",
    },
    {
      href: "#proposals",
      label: "政策提案（議員提出議案）",
      value: "非公表",
      note: "区は提出者を公開していません",
    },
  ];

  return (
    <div className="w-full flex-1 bg-white">
      <div className="mx-auto max-w-[1500px] px-4 py-4 md:px-6 md:py-6">
        <Breadcrumb items={breadcrumb} />

        <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
          <div className="flex min-w-0 flex-1 flex-col gap-8">
            {/* 名前と会派 */}
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-4 md:gap-6">
                <MemberInitialIcon name={member.name} size="lg" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {member.nameKana && (
                    <p className="text-xs text-mirai-text-muted md:text-sm">
                      {member.nameKana}
                    </p>
                  )}
                  <h1 className="text-2xl font-bold leading-tight text-mirai-text md:text-3xl">
                    {member.name}
                  </h1>
                  {faction ? (
                    <Link
                      href={membersListHref(DEFAULT_MEMBERS_LIST_PARAMS, {
                        faction: faction.slug,
                      })}
                      className="w-fit text-sm font-bold text-brand-link hover:text-brand-link-hover hover:underline md:text-base"
                    >
                      {faction.name}
                    </Link>
                  ) : (
                    <p className="text-sm text-mirai-text-secondary">
                      会派なし
                    </p>
                  )}
                  <p className="text-[13px] text-mirai-text-secondary">
                    {[
                      positions.councilRoles.join("・") || null,
                      member.seatNumber !== null
                        ? `議席番号 ${member.seatNumber}番`
                        : null,
                      member.electedCount !== null
                        ? `当選${member.electedCount}回`
                        : null,
                      profile.term
                        ? `任期 ${formatDate(profile.term.termEnd)}まで`
                        : null,
                    ]
                      .filter(Boolean)
                      .join("・")}
                  </p>
                  {positions.committees.length > 0 && (
                    <p className="text-xs leading-relaxed text-mirai-text-secondary">
                      {positions.committees.map(formatCommitteeSeat).join("、")}
                    </p>
                  )}
                </div>
              </div>

              {/* 数字のタイル。押すとその節へ飛ぶ */}
              <nav aria-label="このページの内容">
                <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {tiles.map((tile) => (
                    <li key={tile.href}>
                      <StatTile {...tile} />
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <MemberBasicInfo profile={profile} positions={positions} />

            <MemberQuestionsSection
              questions={profile.questions}
              stats={questionStats}
              currentFactionName={faction?.name ?? null}
              questionsSince={questionsSince}
            />

            <MemberFactionVotesSection
              faction={faction}
              votes={profile.votes}
              windowStart={profile.windowStart}
              memberName={member.name}
              hasPastFactions={profile.memberships.some(
                (period) => period.faction_id !== faction?.id
              )}
            />

            <MemberExpensesSection
              faction={faction}
              expenses={profile.expenses}
              windowStart={profile.windowStart}
            />

            <MemberProposalsSection submittedBills={profile.submittedBills} />
          </div>

          {/* 右の出典のボックス（スマホでは最後） */}
          <aside
            aria-label="出典と注記"
            className="md:sticky md:top-4 md:w-72 md:shrink-0"
          >
            <div className="flex flex-col gap-3 rounded-md border border-mirai-border p-4">
              <p className="text-sm font-bold leading-relaxed text-mirai-text">
                区の公開資料をもとに作成。ランキングはしていません。
              </p>
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-bold text-mirai-text">出典</h2>
                <SourceLinks sources={profile.sources} />
                <p className="text-xs leading-relaxed text-mirai-text-muted">
                  本会議の質問は、会期ごとの「質問者・質問内容一覧」のページ（質問ごとにリンク）、会派の賛否は区の「議案の概要と審議結果」（各議案のページに出典）をもとにしています。
                </p>
              </div>
              <p className="text-xs leading-relaxed text-mirai-text-note">
                {`顔写真・住所・電話番号・メールアドレスは載せていません。${SITE.NAME}は新宿区・新宿区議会の公式サービスではありません。正確な情報は区の公式ページでご確認ください。`}
              </p>
              <Link
                href={routes.membersList()}
                className="text-sm font-bold text-brand-link hover:text-brand-link-hover hover:underline"
              >
                議員の一覧に戻る
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

type StatTileProps = {
  href: `#${string}`;
  label: string;
  value: string;
  note: string;
};

function StatTile({ href, label, value, note }: StatTileProps) {
  return (
    <a
      href={href}
      className="flex h-full flex-col gap-0.5 rounded-md border border-mirai-border px-3 py-2.5 hover:border-brand-link hover:bg-mirai-surface"
    >
      <span className="text-xs text-mirai-text-secondary">{label}</span>
      <span className="text-lg font-bold tabular-nums text-mirai-text md:text-xl">
        {value}
      </span>
      <span className="text-[11px] text-mirai-text-muted">{note}</span>
    </a>
  );
}
