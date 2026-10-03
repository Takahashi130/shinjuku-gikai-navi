import { MessageSquare, MessageSquareText } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getInterviewLPLink } from "@/features/interview-config/shared/utils/interview-links";
import { routes } from "@/lib/routes";
import { BillDetailShareButton } from "../../../client/components/bill-detail/bill-detail-share-button";
import {
  ReviewCompleteBadge,
  ReviewInProgressBanner,
} from "../../../client/components/bill-detail/review-status-banner";
import { BillTitleText } from "../../../client/components/bill-list/bill-title-text";
import { getBillShareData } from "../../../client/utils/share";
import type { BillWithContent } from "../../../shared/types";
import {
  billsListHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "../../../shared/utils/parse-bills-list-params";

interface BillDetailHeaderProps {
  bill: BillWithContent;
  hasInterviewConfig?: boolean;
  /** 意見数（トピック分析の total_opinions）。回答者数（人数）ではない点に注意。 */
  opinionCount?: number;
  /** 公開トピック数。1件以上ならトピック一覧への導線として件数を併記する。 */
  topicCount?: number;
}

/**
 * 議案カードの先頭（濃色の帯のすぐ下）。タイトル・正式名称・要約・テーマと、
 * 意見・共有の操作を並べる。会期・議案番号・議決の結果は、上の濃色の帯に出す。
 */
export async function BillDetailHeader({
  bill,
  hasInterviewConfig,
  opinionCount,
  topicCount,
}: BillDetailHeaderProps) {
  const displayTitle = bill.bill_content?.title || bill.name;
  const displaySummary = bill.bill_content?.summary;

  const { shareUrl, shareMessage, thumbnailUrl } = await getBillShareData(bill);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1
          id="bill-title"
          className="text-pretty text-2xl font-extrabold leading-snug tracking-tight text-mirai-text md:text-[32px]"
        >
          <BillTitleText title={displayTitle} />
          {bill.is_review_completed && (
            <>
              {" "}
              <ReviewCompleteBadge showTooltip />
            </>
          )}
        </h1>
        {/* 正式名称。わかりやすいタイトルと違うときに、元の名前も分かるようにする */}
        {displayTitle !== bill.name && (
          <p className="text-sm text-mirai-text-secondary">{bill.name}</p>
        )}
      </div>

      {displaySummary && (
        <p className="text-[15px] leading-relaxed text-mirai-text">
          {displaySummary}
        </p>
      )}

      {bill.tags.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="テーマ">
          {bill.tags.map((tag) => (
            <li key={tag.id}>
              {/* 見た目は 36px のまま、押せる範囲だけ上下に広げる（44px） */}
              <Link
                href={billsListHref(DEFAULT_BILLS_LIST_PARAMS, {
                  tagId: tag.id,
                })}
                className="relative inline-flex h-9 items-center rounded-full bg-mirai-surface px-3.5 text-xs font-bold text-mirai-text-secondary after:absolute after:inset-x-0 after:-inset-y-1 hover:text-brand-link hover:underline"
              >
                {tag.label}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!bill.is_review_completed && <ReviewInProgressBanner />}

      {opinionCount != null && opinionCount > 0 && (
        <Link
          href={
            (topicCount != null && topicCount > 0
              ? routes.billTopics(bill.id)
              : routes.billOpinions(bill.id)) as Route
          }
          className="flex w-fit items-center gap-1 text-brand-link hover:text-brand-link-hover hover:underline"
        >
          <MessageSquare className="size-4 relative top-[1px]" aria-hidden />
          <span className="text-[14px] font-bold leading-[14px] tracking-[0.14px]">
            {topicCount != null &&
              topicCount > 0 &&
              `${topicCount}件のトピック・`}
            {opinionCount}件のご意見
          </span>
        </Link>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {hasInterviewConfig && (
          <Button size="sm" asChild className="h-11 gap-1.5 px-4 text-[13px]">
            <Link href={getInterviewLPLink(bill.id) as Route}>
              <MessageSquareText className="size-5" aria-hidden />
              AIインタビューに協力する
            </Link>
          </Button>
        )}
        <BillDetailShareButton
          shareMessage={shareMessage}
          shareUrl={shareUrl}
          thumbnailUrl={thumbnailUrl}
        />
      </div>
    </div>
  );
}
