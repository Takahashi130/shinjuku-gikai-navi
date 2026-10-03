import { ArrowRight, MessageSquareText } from "lucide-react";
import Link from "next/link";
import {
  billsListHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "../../../shared/utils/parse-bills-list-params";

/**
 * AIインタビューを受け付けている議案があるときだけ出す1行の案内。
 * 受付中の議案に絞った一覧へ送る。0件のときは出さない（呼び出し側で判定）。
 */
export function HomeInterviewBand({ count }: { count: number }) {
  return (
    <Link
      href={billsListHref(DEFAULT_BILLS_LIST_PARAMS, { interviewOnly: true })}
      className="group flex items-center gap-4 rounded-3xl border border-line-soft bg-white p-5 shadow-xs transition-shadow hover:border-brand-link/40 hover:shadow-md"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-accent-tint text-brand-link">
        <MessageSquareText className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-bold text-mirai-text group-hover:text-brand-link group-hover:underline">
          {`AIインタビュー受付中の議案が${count}件あります`}
        </span>
        <span className="text-sm text-mirai-text-secondary">
          議案についてのご意見を、AIとの対話でお聞かせください。
        </span>
      </span>
      <ArrowRight className="size-5 shrink-0 text-brand-link" aria-hidden />
    </Link>
  );
}
