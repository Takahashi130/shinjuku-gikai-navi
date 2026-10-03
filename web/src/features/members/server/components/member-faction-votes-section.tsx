import Link from "next/link";
import { VoteSplitBar } from "@/features/bills/client/components/bill-detail/vote-split-bar";
import {
  billsListHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "@/features/bills/shared/utils/parse-bills-list-params";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils/date";
import type { FactionSummary, FactionVoteRecord } from "../../shared/types";
import {
  type FactionVotesSummary,
  toBillVoteTally,
} from "../../shared/utils/summarize-faction-votes";
import { EmptyNote, ProfileSection } from "./profile-section";

/** はじめから見せる議案の数。残りは「すべて見る」の中に入れる。 */
const VISIBLE_AGAINST = 10;
const VISIBLE_SPLIT_FOR = 5;

/**
 * 所属会派の議案への賛否。区は会派ごとに賛否を公表しており、議員1人ひとりの
 * 賛否は分からないので、「会派としての賛否」と書く。
 *
 * 議員が今の会派に入る前の議案は数えない（windowStart。resolveMembershipWindowStart）。
 */
export function MemberFactionVotesSection({
  faction,
  votes,
  windowStart,
  memberName,
  hasPastFactions,
}: {
  faction: FactionSummary | null;
  votes: FactionVotesSummary;
  windowStart: string | null;
  memberName: string;
  /** 前に別の会派にいたことが区の資料で分かるか */
  hasPastFactions: boolean;
}) {
  if (!faction) {
    return (
      <ProfileSection id="votes" title="所属会派の議案への賛否">
        <EmptyNote>会派に属していないため、会派の賛否はありません。</EmptyNote>
      </ProfileSection>
    );
  }

  const scope = [
    windowStart
      ? `${formatDate(windowStart)}以降に閉会した会期の議案です（${memberName}さんが${faction.name}に所属していたことを、区の資料で確認できる期間）。`
      : "このサイトに載っている議案です。",
    hasPastFactions ? "前に所属していた会派の賛否は含みません。" : null,
  ]
    .filter(Boolean)
    .join("");

  return (
    <ProfileSection
      id="votes"
      title="所属会派の議案への賛否"
      lead={
        <>
          <p>
            {`${faction.name}としての賛否です。区は賛否を会派ごとに公表しており、議員1人ひとりの賛否は公表されていません。`}
          </p>
          <p>{scope}</p>
        </>
      }
    >
      {votes.total === 0 ? (
        <EmptyNote>
          {faction.note
            ? `この期間の会派の賛否の記録はまだありません。会派について：${faction.note}`
            : "この期間の会派の賛否の記録はまだありません。"}
        </EmptyNote>
      ) : (
        <>
          <div className="flex flex-col gap-2 rounded-md border border-mirai-border p-3 md:p-4">
            <p className="text-sm text-mirai-text">
              {`賛否の記録がある議案 ${votes.total}件`}
            </p>
            <div className="flex items-center gap-3 text-sm font-bold">
              <span className="whitespace-nowrap text-stance-for-strong">
                {`賛成 ${votes.forCount}件`}
              </span>
              <VoteSplitBar
                tally={toBillVoteTally(votes)}
                decorative
                className="flex-1"
              />
              <span className="whitespace-nowrap text-stance-against">
                {`反対 ${votes.againstCount}件`}
              </span>
            </div>
            {(votes.unknownCount > 0 || votes.internalSplitCount > 0) && (
              <p className="text-xs text-mirai-text-muted">
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

          <p className="text-xs leading-relaxed text-mirai-text-muted">
            賛否は区の「議案の概要と審議結果」をもとにしています。審議結果がまだ公開されていない会期や、資料を読み取れなかった会期の議案は含みません。
          </p>
          <Link
            href={billsListHref(DEFAULT_BILLS_LIST_PARAMS, { splitOnly: true })}
            className="w-fit text-sm font-bold text-brand-link hover:text-brand-link-hover hover:underline"
          >
            会派の賛否が分かれた議案をすべて見る
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
    <div className="flex flex-col gap-1">
      <h3 className="text-base font-bold text-mirai-text">{title}</h3>
      {records.length === 0 ? (
        <p className="text-sm text-mirai-text-secondary">{emptyText}</p>
      ) : (
        <>
          <VoteRows records={visible} />
          {rest.length > 0 && (
            <details className="rounded-md border border-mirai-border">
              <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-bold text-brand-link hover:underline">
                {`残りの${rest.length}件を見る`}
              </summary>
              <div className="border-mirai-border border-t px-3">
                <VoteRows records={rest} />
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function VoteRows({ records }: { records: FactionVoteRecord[] }) {
  return (
    <ul className="divide-y divide-mirai-border">
      {records.map((record) => (
        <li key={record.bill.id} className="flex flex-col gap-0.5 py-2 text-sm">
          <Link
            href={routes.billDetail(record.bill.id)}
            className="text-brand-link hover:text-brand-link-hover hover:underline"
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
