import { CalendarDays, ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { LabelPill } from "@/components/ui/label-pill";
import { RoundCard } from "@/components/ui/round-card";
import type { ParticipationBadgesByBillId } from "@/features/bill-participation/shared/types";
import type { BillWithContent } from "@/features/bills/shared/types";
import { formatDateWithDots } from "@/lib/utils/date";
import type { DietSession } from "../../shared/types";
import { BillListWithStatusFilter } from "./bill-list-with-status-filter";

type Props = {
  session: DietSession;
  bills: BillWithContent[];
  /** 議案ごとの解説・区民投票の印 */
  participationBadges?: ParticipationBadgesByBillId;
};

/** 会期ごとの議案一覧の本体。見出しのカードと、ステータスの絞り込みつきの一覧。 */
export function DietSessionBillList({
  session,
  bills,
  participationBadges,
}: Props) {
  return (
    <div className="flex flex-col gap-5">
      <RoundCard className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <LabelPill tone="accent" size="md">
            <CalendarDays aria-hidden />
            {`${formatDateWithDots(session.start_date)} 〜 ${formatDateWithDots(session.end_date)}`}
          </LabelPill>
          <h1 className="text-2xl font-extrabold tracking-tight text-mirai-text md:text-3xl">
            {session.name}の議案
          </h1>
          <p className="text-sm font-bold text-mirai-text-secondary">
            {`${bills.length}件`}
          </p>
        </div>
        {/* 区議会の会期ページへのリンク */}
        {session.shugiin_url && (
          <Link
            href={session.shugiin_url as Route}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-bold text-brand-link hover:text-brand-link-hover hover:underline"
          >
            新宿区議会の公式ページ
            <ExternalLink className="size-3" aria-hidden />
            <span className="sr-only">（新しいタブで開きます）</span>
          </Link>
        )}
      </RoundCard>

      {bills.length === 0 ? (
        <RoundCard className="py-12 text-center text-mirai-text-muted">
          この会期の議案はまだありません
        </RoundCard>
      ) : (
        <BillListWithStatusFilter
          bills={bills}
          participationBadges={participationBadges}
        />
      )}
    </div>
  );
}
