import { CalendarDays } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { LabelPill } from "@/components/ui/label-pill";
import { routes } from "@/lib/routes";
import { formatDateWithDots } from "@/lib/utils/date";
import { SplitVoteMark } from "../../../client/components/bill-list/split-vote-mark";
import type { BillStatusEnum } from "../../../shared/types";
import { getCardStatusLabel } from "../../../shared/utils/bill-status";
import { toBillStatusGroup } from "../../../shared/utils/bill-status-group";
import { isDecidedStatus } from "../../../shared/utils/council-decision";

interface BillDetailStripProps {
  status: BillStatusEnum;
  /** 議決の語（「可決」「承認」など）。解説から読めなければ null。 */
  resultLabel: string | null;
  /** 議案の会期。slug があれば会期別一覧へのリンクにする。 */
  session: { name: string; slug: string | null } | null;
  /** 議案番号（例：第42号議案）。 */
  billNumber: string | null;
  /** 会派の賛否が分かれた議案か。 */
  isSplit: boolean;
  submittedDate: string | null;
}

/**
 * 議案カードの先頭の濃色の帯。会期・議案番号・議会の結果のピルと提出日。
 *
 * 議決の日付は持っていないので出さない（提出日を出す）。
 */
export function BillDetailStrip({
  status,
  resultLabel,
  session,
  billNumber,
  isSplit,
  submittedDate,
}: BillDetailStripProps) {
  const group = toBillStatusGroup(status);
  const decided = isDecidedStatus(status);

  return (
    <div
      data-surface="dark"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-brand-header px-5 py-4 text-brand-on-header md:px-8"
    >
      <div className="flex flex-wrap items-center gap-2">
        {session &&
          (session.slug ? (
            // ピルの見た目は変えず、押せる範囲だけ上下に広げる（44px）
            <Link
              href={routes.kokkaiSessionBills(session.slug) as Route}
              className="group relative rounded-full after:absolute after:inset-x-0 after:-inset-y-2"
              aria-label={`${session.name}の議案一覧`}
            >
              <LabelPill
                tone="solid"
                size="md"
                className="group-hover:underline"
              >
                {session.name}
              </LabelPill>
            </Link>
          ) : (
            <LabelPill tone="solid" size="md">
              {session.name}
            </LabelPill>
          ))}
        {billNumber && (
          <LabelPill tone="on-dark" size="md">
            {billNumber}
          </LabelPill>
        )}
        <LabelPill
          tone={
            group === "enacted"
              ? "for"
              : group === "rejected"
                ? "against"
                : "accent"
          }
          size="md"
        >
          {decided
            ? `議会の結果：${resultLabel ?? getCardStatusLabel(status)}`
            : getCardStatusLabel(status)}
        </LabelPill>
        {isSplit && <SplitVoteMark size="md" />}
      </div>
      {submittedDate && (
        <span className="inline-flex items-center gap-1.5 text-xs text-brand-on-header-muted">
          <CalendarDays className="size-3.5" aria-hidden />
          {`${formatDateWithDots(submittedDate)} 提出`}
        </span>
      )}
    </div>
  );
}
