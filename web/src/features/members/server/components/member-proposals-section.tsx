import Link from "next/link";
import { BillStatusBadge } from "@/features/bills/client/components/bill-list/bill-status-badge";
import { routes } from "@/lib/routes";
import { formatDateWithDots } from "@/lib/utils/date";
import type { MemberSubmittedBill } from "../../shared/types";
import { ProfileSection } from "./profile-section";

/**
 * 政策提案（議員提出議案）。
 *
 * 区は議員提出議案の提出者（どの議員・会派が出したか）を公開していない。
 * 推測で数えないため、議員ごと・会派ごとの件数は出さず、その旨を明記する。
 * 参考として、区議会全体の議員提出議案の件数と新しいものを並べる。
 */
export function MemberProposalsSection({
  submittedBills,
}: {
  submittedBills: { bills: MemberSubmittedBill[]; totalCount: number };
}) {
  return (
    <ProfileSection id="proposals" title="政策提案（議員提出議案）">
      <div className="flex flex-col gap-1.5 rounded-md border border-mirai-border bg-mirai-surface p-3 md:p-4">
        <p className="text-sm font-bold text-mirai-text">
          区の資料では提出者が公開されていません。
        </p>
        <p className="text-[13px] leading-relaxed text-mirai-text-secondary">
          議員が出す条例案など（議員提出議案）について、新宿区は議員ごと・会派ごとの提出者を公開していません。このため、このページでは議員ごと・会派ごとの政策提案の数を出していません（推測で数えることはしません）。
        </p>
      </div>

      {submittedBills.totalCount > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-bold text-mirai-text">
            {`参考：区議会全体の議員提出議案（このサイトに載っているもの ${submittedBills.totalCount}件）`}
          </h3>
          <p className="text-xs text-mirai-text-muted">
            {`新しいものから${submittedBills.bills.length}件。各議案のページで会派ごとの賛否が見られます。`}
          </p>
          <ul className="divide-y divide-mirai-border">
            {submittedBills.bills.map((bill) => (
              <li
                key={bill.id}
                className="flex flex-col gap-1 py-2 text-sm sm:flex-row sm:items-center sm:gap-3"
              >
                <Link
                  href={routes.billDetail(bill.id)}
                  className="min-w-0 flex-1 text-brand-link hover:text-brand-link-hover hover:underline"
                >
                  {bill.name}
                </Link>
                <span className="flex shrink-0 items-center gap-2">
                  <BillStatusBadge status={bill.status} />
                  {bill.submittedDate && (
                    <span className="text-xs text-mirai-text-muted">
                      {`${formatDateWithDots(bill.submittedDate)} 提出`}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ProfileSection>
  );
}
