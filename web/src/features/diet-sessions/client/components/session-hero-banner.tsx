import { ArrowRight, CalendarClock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  billsListHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "@/features/bills/shared/utils/parse-bills-list-params";
import { routes } from "@/lib/routes";
import { formatDateWithDots } from "@/lib/utils/date";
import type { DietSession } from "../../shared/types";
import {
  calculateSessionProgress,
  formatDaysLeft,
} from "../../shared/utils/session-progress";

type SessionHeroBannerProps = {
  /** 開会中の会期。閉会中は null。 */
  session: DietSession | null;
  /** 直近で閉会した会期。閉会中に「終了しました」を出すために使う。 */
  closedSession: DietSession | null;
  /** 残り日数の基準時刻。呼び出し側が日本時刻を渡す。 */
  now: Date;
  /** 審議中の議案の件数。 */
  deliberatingCount: number;
  /** 掲載している議案の件数。 */
  totalCount: number;
};

/**
 * トップの大きなバナー（Amazon のトップの大きな画像の位置づけ）。
 *
 * 会期中は会期名・閉会までの日数・審議中の議案の件数を出し、審議中の議案の
 * 一覧へ送る。閉会中はどの会期が終わったかを出し、その会期の議案へ送る。
 *
 * 下端は本文の背景色へ溶かす。その上にテーマ別のカードを重ねるので、
 * 重ねる分の高さ（-mt）は呼び出し側と揃えること（HERO_OVERLAP_CLASS）。
 *
 * 地はヘッダー下段の帯（brand-header-sub）とは別の色（brand-hero）にして、
 * ナビゲーションの帯とバナーの境目が見えるようにする。
 */
export function SessionHeroBanner({
  session,
  closedSession,
  now,
  deliberatingCount,
  totalCount,
}: SessionHeroBannerProps) {
  return (
    <section aria-labelledby="session-hero-title">
      <div data-surface="dark" className="bg-brand-hero text-brand-on-header">
        <div className="mx-auto max-w-[1500px] px-4 pt-6 pb-4 md:px-8 md:pt-10">
          {session ? (
            <InSession
              session={session}
              now={now}
              deliberatingCount={deliberatingCount}
            />
          ) : (
            <Closed closedSession={closedSession} totalCount={totalCount} />
          )}
        </div>
      </div>
      {/* カードを重ねる部分。濃色から本文の背景へ溶かす */}
      <div
        aria-hidden
        className="h-24 bg-gradient-to-b from-brand-hero to-page md:h-36"
      />
    </section>
  );
}

/** バナーの下端にカードを重ねる量。上の溶かす部分の高さと揃える。 */
export const HERO_OVERLAP_CLASS = "-mt-24 md:-mt-36";

function InSession({
  session,
  now,
  deliberatingCount,
}: {
  session: DietSession;
  now: Date;
  deliberatingCount: number;
}) {
  const { percentage, daysLeft } = calculateSessionProgress(session, now);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-brand-accent">
          <span
            className="size-2 shrink-0 rounded-full bg-brand-accent"
            aria-hidden
          />
          新宿区議会は いま開会中です
        </p>
        <h1
          id="session-hero-title"
          className="text-2xl font-extrabold tracking-wide md:text-4xl"
        >
          {session.name}
        </h1>
        <p className="text-sm text-brand-on-header-muted">
          {formatDateWithDots(session.start_date)} 召集 〜{" "}
          {formatDateWithDots(session.end_date)} 閉会予定
        </p>
        <div className="flex max-w-xl flex-col gap-1.5 pt-1">
          <div className="flex items-baseline justify-between text-xs font-bold text-brand-on-header-muted">
            <span>会期の進行</span>
            <span>{formatDaysLeft(daysLeft)}</span>
          </div>
          <Progress
            value={percentage}
            aria-label="会期の進行"
            className="h-2 bg-brand-on-header/20 [&>[data-slot=progress-indicator]]:bg-brand-accent"
          />
        </div>
        <p className="max-w-xl text-xs leading-relaxed text-brand-on-header-muted">
          審議中の議案は、会期の終わりまでに本会議で議決される見込みです（継続審査になるものもあります）。
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch lg:flex-col">
        <div className="grid grid-cols-2 gap-3 sm:min-w-80">
          <Stat
            label="閉会まで"
            value={daysLeft}
            unit="日"
            note={daysLeft === 0 ? "本日閉会予定" : undefined}
          />
          <Stat label="審議中の議案" value={deliberatingCount} unit="件" />
        </div>
        <div className="flex flex-col gap-2 sm:justify-end">
          <Button asChild className="h-11 rounded-md px-5 text-sm">
            <Link
              href={billsListHref(DEFAULT_BILLS_LIST_PARAMS, {
                status: "deliberating",
              })}
            >
              審議中の議案を見る
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          {session.slug && (
            <Link
              href={routes.kokkaiSessionBills(session.slug) as Route}
              className="inline-flex min-h-11 items-center justify-center gap-1 text-sm font-bold text-brand-on-header underline-offset-4 hover:underline"
            >
              <CalendarClock className="size-4" aria-hidden />
              この会期の議案をすべて見る
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Closed({
  closedSession,
  totalCount,
}: {
  closedSession: DietSession | null;
  totalCount: number;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-brand-on-header-muted">
          <span
            className="size-2 shrink-0 rounded-full bg-brand-on-header-muted"
            aria-hidden
          />
          新宿区議会は いま閉会中です
        </p>
        <h1
          id="session-hero-title"
          className="text-2xl font-extrabold tracking-wide md:text-4xl"
        >
          区議会の議案と、会派ごとの賛否
        </h1>
        {closedSession && (
          <p className="text-sm text-brand-on-header-muted">
            {closedSession.name}（{formatDateWithDots(closedSession.start_date)}{" "}
            〜 {formatDateWithDots(closedSession.end_date)}）は終了しました
          </p>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end lg:flex-col lg:items-stretch">
        <div className="sm:min-w-40">
          <Stat label="掲載している議案" value={totalCount} unit="件" />
        </div>
        {closedSession?.slug && (
          <Button asChild className="h-11 rounded-md px-5 text-sm">
            <Link href={routes.kokkaiSessionBills(closedSession.slug) as Route}>
              {closedSession.name}の議案を見る
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: number;
  unit: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-brand-header px-4 py-3">
      <span className="text-xs font-bold text-brand-on-header-muted">
        {label}
      </span>
      <span className="flex items-baseline gap-1">
        <span className="font-lexend text-3xl font-bold leading-none text-brand-accent">
          {value}
        </span>
        <span className="text-sm font-bold">{unit}</span>
      </span>
      {note && (
        <span className="text-xs text-brand-on-header-muted">{note}</span>
      )}
    </div>
  );
}
