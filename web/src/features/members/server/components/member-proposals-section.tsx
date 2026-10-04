import { ArrowRight, FileText, Info } from "lucide-react";
import Link from "next/link";
import {
  billsListHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "@/features/bills/shared/utils/parse-bills-list-params";
import { ProfileSection } from "./profile-section";

/**
 * 政策提案（議員提出議案）。
 *
 * 区のウェブサイトの議案一覧・審議結果には、議員提出議案の提出者（どの議員・
 * 会派が出したか）が載っていない。推測で数えないため、議員ごと・会派ごとの
 * 件数は出さず、その旨を書く。
 *
 * 区議会全体の議員提出議案を議員のページに並べると、この議員の提案のように
 * 読めるので、一覧は議案一覧（「議員提出議案のみ」）に任せ、ここには件数と
 * そこへのリンクだけを置く。
 */
export function MemberProposalsSection({
  submittedBillCount,
}: {
  /** 区議会全体の議員提出議案の件数（このサイトに載っているもの） */
  submittedBillCount: number;
}) {
  return (
    <ProfileSection
      id="proposals"
      title="政策提案（議員提出議案）"
      icon={FileText}
    >
      <div className="flex items-start gap-3 rounded-2xl bg-mirai-surface p-4">
        <Info
          className="mt-0.5 size-5 shrink-0 text-mirai-text-muted"
          aria-hidden
        />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold text-mirai-text">
            区のウェブサイトの議案一覧・審議結果には、議員提出議案の提出者が載っていません。
          </p>
          <p className="text-sm leading-relaxed text-mirai-text-secondary">
            議員が出す条例案や意見書など（議員提出議案）について、どの議員・会派が出したかを、このサイトが使っている区の資料からは確かめられません。このため、議員ごと・会派ごとの政策提案の数は出していません（推測で数えることはしません）。
          </p>
        </div>
      </div>

      {submittedBillCount > 0 && (
        <Link
          href={billsListHref(DEFAULT_BILLS_LIST_PARAMS, {
            memberSubmittedOnly: true,
          })}
          className="inline-flex min-h-11 w-fit items-center gap-1 text-sm font-bold text-brand-link hover:text-brand-link-hover hover:underline"
        >
          {`区議会全体の議員提出議案（${submittedBillCount}件）を議案一覧で見る`}
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Link>
      )}
    </ProfileSection>
  );
}
