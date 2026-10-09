import { ArrowRight, Flame } from "lucide-react";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { BillTitleText } from "../../../client/components/bill-list/bill-title-text";

/**
 * 「注目の議案」の帯。審議中の議案のうち、いちばん上に出す1件へ誘う。
 */
export function HomeSpotlightStrip({
  billId,
  title,
  voteOpen,
}: {
  billId: string;
  title: string;
  /** 区民投票を受け付けているか */
  voteOpen: boolean;
}) {
  return (
    <Link
      href={routes.billDetail(billId)}
      className="group flex flex-col gap-3 rounded-2xl border border-brand-accent-light bg-brand-accent-tint px-4 py-3 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <span className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-orange-600 px-2.5 py-1 text-xs font-bold text-white">
          <Flame className="size-3.5" aria-hidden />
          注目の議案
        </span>
        <span className="text-sm font-bold leading-snug text-mirai-text group-hover:underline">
          <BillTitleText title={title} />
          <span className="text-brand-link">
            {voteOpen ? "（審議中・区民投票を受付中）" : "（審議中）"}
          </span>
        </span>
      </span>
      <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-full bg-brand-band px-5 text-sm font-bold text-white shadow-sm group-hover:bg-brand-link">
        議案と解説を見る
        <ArrowRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}
