import { ArrowRight, Scale } from "lucide-react";
import Link from "next/link";
import { VoteSplitBar } from "@/features/bills/client/components/bill-detail/vote-split-bar";
import {
  billsListHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "@/features/bills/shared/utils/parse-bills-list-params";
import { routes } from "@/lib/routes";
import type { FactionSummary, FactionVoteRecord } from "../../shared/types";
import { describeMembershipWindow } from "../../shared/utils/describe-membership-window";
import type { MembershipWindow } from "../../shared/utils/membership-window";
import {
  type FactionVotesSummary,
  toBillVoteTally,
} from "../../shared/utils/summarize-faction-votes";
import {
  EmptyNote,
  MoreDetails,
  ProfileSection,
  SectionNote,
} from "./profile-section";

/** はじめから見せる議案の数。残りは折りたたむ。 */
const VISIBLE_AGAINST = 10;
const VISIBLE_SPLIT_FOR = 5;

/**
 * 所属会派の議案への賛否。区は会派ごとに賛否を公表しており、議員1人ひとりの
 * 賛否は分からないので、「会派としての賛否」と書く。
 *
 * 議員が今の会派に入る前の議案は数えない（window。resolveMembershipWindowWithHistory）。
 * 会派を移った記録の無い議員は、全員同じく今の任期の始まりから数える。
 * 反対した議案と、賛否が分かれた議案のうち賛成した議案を、議案のページへの
 * リンクで並べる。
 */
export function MemberFactionVotesSection({
  faction,
  votes,
  window,
  termNumber,
  memberName,
  hasPastFactions,
}: {
  faction: FactionSummary | null;
  votes: FactionVotesSummary;
  window: MembershipWindow;
  termNumber: number | null;
  memberName: string;
  /** 前に別の会派にいたことが区の資料で分かるか */
  hasPastFactions: boolean;
}) {
  if (!faction) {
    return (
      <ProfileSection id="votes" title="所属会派の議案への賛否" icon={Scale}>
        <EmptyNote>会派に属していないため、会派の賛否はありません。</EmptyNote>
      </ProfileSection>
    );
  }

  const { since, reason } = describeMembershipWindow(window, {
    memberName,
    factionName: faction.name,
    termNumber,
  });
  const scope = [
    since
      ? `${since}以降に閉会した会期の議案です${reason ? `（${reason}）` : ""}。`
      : "このサイトに載っている議案です。",
    hasPastFactions ? "前に所属していた会派の賛否は含みません。" : null,
  ]
    .filter(Boolean)
    .join("");

  return (
    <ProfileSection
      id="votes"
      title="所属会派の議案への賛否"
      icon={Scale}
      description={`${faction.name}としての賛否です。区は賛否を会派ごとに公表しており、議員1人ひとりの賛否は公表されていません。`}
    >
      <SectionNote>{scope}</SectionNote>

      {votes.total === 0 ? (
        <EmptyNote>
          {faction.note
            ? `この期間の会派の賛否の記録はまだありません。会派について：${faction.note}`
            : "この期間の会派の賛否の記録はまだありません。"}
        </EmptyNote>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl bg-mirai-surface p-4">
            <p className="text-sm font-bold text-mirai-text">
              {`賛否の記録がある議案 ${votes.total}件`}
            </p>
            <p className="flex items-baseline justify-between gap-2 text-sm font-bold">
              <span className="text-stance-for-strong">
                賛成{" "}
                <span className="font-lexend text-2xl">{votes.forCount}</span>件
              </span>
              <span className="text-stance-against">
                反対{" "}
                <span className="font-lexend text-2xl">
                  {votes.againstCount}
                </span>
                件
              </span>
            </p>
            <VoteSplitBar
              tally={toBillVoteTally(votes)}
              decorative
              className="h-3"
            />
            {(votes.unknownCount > 0 || votes.internalSplitCount > 0) && (
              <p className="text-xs leading-relaxed text-mirai-text-muted">
                {[
                  votes.internalSplitCount > 0
                    ? `会派の中で賛否が分かれた議案 ${votes.internalSplitCount}件（「1人反対」などの補足つき）`
                    : null,
                  votes.unknownCount > 0
                    ? `区の資料から賛否を読み取れなかった議案 ${votes.unknownCount}件`
                    : null,
                ]
                  .filter(Boolean)
                  .join("・")}
              </p>
            )}
          </div>

          <VoteList
            title={`反対した議案（${votes.againstCount}件）`}
            records={votes.against}
            visibleCount={VISIBLE_AGAINST}
            emptyText="この期間に反対した議案はありません。"
          />
          <VoteList
            title={`賛否が分かれた議案のうち、賛成した議案（${votes.splitFor.length}件）`}
            records={votes.splitFor}
            visibleCount={VISIBLE_SPLIT_FOR}
            emptyText="この期間に、賛否が分かれた議案で賛成したものはありません。"
          />

          <SectionNote>
            賛否は区の「議案の概要と審議結果」をもとにしています。審議結果がまだ公開されていない会期や、資料を読み取れなかった会期の議案は含みません。
          </SectionNote>
          <Link
            href={billsListHref(DEFAULT_BILLS_LIST_PARAMS, { splitOnly: true })}
            className="inline-flex min-h-11 w-fit items-center gap-1 text-sm font-bold text-brand-link hover:text-brand-link-hover hover:underline"
          >
            会派の賛否が分かれた議案をすべて見る
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </>
      )}
    </ProfileSection>
  );
}

function VoteList({
  title,
  records,
  visibleCount,
  emptyText,
}: {
  title: string;
  records: FactionVoteRecord[];
  visibleCount: number;
  emptyText: string;
}) {
  const visible = records.slice(0, visibleCount);
  const rest = records.slice(visibleCount);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-base font-bold text-mirai-text">{title}</h3>
      {records.length === 0 ? (
        <p className="text-sm text-mirai-text-secondary">{emptyText}</p>
      ) : (
        <>
          <VoteRows records={visible} />
          {rest.length > 0 && (
            <MoreDetails summary={`残りの${rest.length}件を見る`}>
              <VoteRows records={rest} />
            </MoreDetails>
          )}
        </>
      )}
    </div>
  );
}

function VoteRows({ records }: { records: FactionVoteRecord[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line-soft">
      {records.map((record) => (
        <li key={record.bill.id} className="flex flex-col gap-1 py-2.5">
          <Link
            href={routes.billDetail(record.bill.id)}
            className="text-sm font-bold leading-snug text-brand-link hover:text-brand-link-hover hover:underline"
          >
            {record.bill.name}
          </Link>
          <span className="text-xs text-mirai-text-muted">
            {[
              record.session?.name ?? "会期不明",
              record.note ? `会派の中で：${record.note}` : null,
            ]
              .filter(Boolean)
              .join("・")}
          </span>
        </li>
      ))}
    </ul>
  );
}
