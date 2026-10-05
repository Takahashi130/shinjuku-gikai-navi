import { Clock, Landmark } from "lucide-react";
import type { Route } from "next";
import { LabelPill } from "@/components/ui/label-pill";
import { RoundCard } from "@/components/ui/round-card";
import { StatCard } from "@/components/ui/stat-card";
import { formatOpenVotesNote } from "@/features/citizen-votes/shared/utils/format-open-votes-note";
import type { OpenVoteStats } from "@/features/citizen-votes/shared/utils/summarize-open-votes";
import { formatDateWithDots } from "@/lib/utils/date";
import {
  billsListHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "../../../shared/utils/parse-bills-list-params";

interface HomeHeroProps {
  /** 審議中の議案の件数。 */
  deliberatingCount: number;
  /** 掲載している議案の件数。 */
  totalCount: number;
  /** 会派の賛否が分かれた議案の件数。 */
  splitCount: number;
  /** 掲載している議案のうち最も古い提出日の年。 */
  earliestYear: number | null;
  /** データの最終更新日時。 */
  lastUpdatedAt: string | null;
  /** 開会中の会期の一言（例：「令和8年第3回定例会・閉会まであと11日」）。閉会中は null。 */
  sessionNote: string | null;
  /** 区民投票を受け付けている議案（締切前のもの）。読み込めなければ null で、カードを出さない。 */
  openVotes: OpenVoteStats | null;
  /** 受付中の議案をまとめて見られるページ（会期の議案一覧など）。無ければリンクにしない。 */
  openVotesHref?: Route;
}

/**
 * トップのヒーロー。ラベルのピル＋大きな見出し＋説明＋右上の更新日と、
 * 大きな数字のカード（濃色1・白3）。
 *
 * 数字はどれも DB から数えた実際の値。区民投票は「受付中の議案の数」だけを出す
 * （票の数や議会との一致率は、まだ議案をまたいで集計していないので出さない）。
 */
export function HomeHero({
  deliberatingCount,
  totalCount,
  splitCount,
  earliestYear,
  lastUpdatedAt,
  sessionNote,
  openVotes,
  openVotesHref,
}: HomeHeroProps) {
  const listHref = (patch: Parameters<typeof billsListHref>[1]) =>
    billsListHref(DEFAULT_BILLS_LIST_PARAMS, patch);

  return (
    <RoundCard
      asChild
      padding="lg"
      className="flex flex-col gap-6 border-brand-accent-light/70 bg-[radial-gradient(ellipse_at_top_right,var(--brand-accent-tint),white_55%)] shadow-md md:gap-8"
    >
      <section aria-labelledby="home-hero-title">
        <div className="flex flex-col gap-4 border-brand-accent-light/60 border-b pb-6 md:flex-row md:items-start md:justify-between md:pb-8">
          <div className="flex flex-col gap-3">
            <LabelPill tone="accent" size="md">
              <Landmark aria-hidden />
              新宿区議会 × 区民の意思
            </LabelPill>
            <h1
              id="home-hero-title"
              className="text-[32px] font-extrabold leading-tight tracking-tight text-mirai-text md:text-5xl"
            >
              {/* 狭い画面では「、」のあとで折り返し、語の途中で切らない */}
              <span className="inline-block">政治のズレ、</span>
              <span className="inline-block">
                <span className="text-brand-link">見える化</span>。
              </span>
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-mirai-text-secondary md:text-base">
              区議会でいま何が審議され、会派がどう賛成・反対したのかを、議案ごとにまとめています。区民投票（参考値）で賛成・反対を示し、議会の議決とのズレを見比べられます。
            </p>
          </div>
          {lastUpdatedAt && (
            <LabelPill tone="outline" size="md" className="md:mt-1">
              <Clock aria-hidden />
              {`${formatDateWithDots(lastUpdatedAt)} データ更新`}
            </LabelPill>
          )}
        </div>

        <ul
          className={
            openVotes
              ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              : "grid gap-4 sm:grid-cols-3"
          }
        >
          <li>
            <StatCard
              tone="dark"
              badge={
                sessionNote ? <LabelPill tone="alert">開会中</LabelPill> : null
              }
              label="審議中の議案"
              value={deliberatingCount}
              unit="件"
              note={sessionNote ?? "新宿区議会はいま閉会中です"}
              href={
                deliberatingCount > 0
                  ? listHref({ status: "deliberating" })
                  : undefined
              }
              linkLabel="審議中の議案を見る"
            />
          </li>
          {openVotes && (
            <li>
              <StatCard
                label="区民投票を受付中の議案"
                badge={<LabelPill tone="accent">受付中</LabelPill>}
                valueTone="accent"
                value={openVotes.count}
                unit="件"
                note={formatOpenVotesNote(openVotes, new Date())}
                href={openVotes.count > 0 ? openVotesHref : undefined}
                linkLabel="投票できる議案を見る"
              />
            </li>
          )}
          <li>
            <StatCard
              label="掲載している議案"
              value={totalCount}
              unit="件"
              note={
                earliestYear
                  ? `${earliestYear}年以降に新宿区議会へ提出された議案`
                  : "新宿区議会へ提出された議案"
              }
              href={listHref({})}
              linkLabel="議案をさがす"
            />
          </li>
          <li>
            <StatCard
              label="会派の賛否が分かれた議案"
              badge={<LabelPill tone="against">ズレに注目</LabelPill>}
              value={splitCount}
              unit="件"
              note="全会一致ではなかった議案"
              href={listHref({ splitOnly: true })}
              linkLabel="賛否が分かれた議案を見る"
            />
          </li>
        </ul>
      </section>
    </RoundCard>
  );
}
