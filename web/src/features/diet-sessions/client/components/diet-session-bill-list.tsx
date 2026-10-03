import { ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { BillWithContent } from "@/features/bills/shared/types";
import { formatDateWithDots } from "@/lib/utils/date";
import type { DietSession } from "../../shared/types";
import { BillListWithStatusFilter } from "./bill-list-with-status-filter";

type Props = {
  session: DietSession;
  bills: BillWithContent[];
};

export function DietSessionBillList({ session, bills }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {/* 見出し。会期名・期間・件数 */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2 rounded-md bg-white px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-mirai-text md:text-xl">
            {session.name}の議案
          </h1>
          <p className="text-[13px] text-mirai-text-secondary">
            {formatDateWithDots(session.start_date)} 〜{" "}
            {formatDateWithDots(session.end_date)}・
            <span className="font-bold">{bills.length}件</span>
          </p>
        </div>
        {/* 区議会の会期ページへのリンク */}
        {session.shugiin_url && (
          <Link
            href={session.shugiin_url as Route}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex min-h-11 items-center gap-1 text-[13px] font-bold text-brand-link hover:text-brand-link-hover hover:underline"
          >
            新宿区議会の公式ページ
            <ExternalLink className="h-3 w-3" aria-hidden />
            <span className="sr-only">（新しいタブで開きます）</span>
          </Link>
        )}
      </div>

      {bills.length === 0 ? (
        <p className="rounded-md bg-white py-12 text-center text-mirai-text-muted">
          この会期の議案はまだありません
        </p>
      ) : (
        <BillListWithStatusFilter bills={bills} />
      )}
    </div>
  );
}
