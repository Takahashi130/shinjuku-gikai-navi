import { MessageSquare, MessageSquareText } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getInterviewLPLink } from "@/features/interview-config/shared/utils/interview-links";
import { routes } from "@/lib/routes";
import { formatDateWithDots } from "@/lib/utils/date";
import { BillDetailShareButton } from "../../../client/components/bill-detail/bill-detail-share-button";
import {
  ReviewCompleteBadge,
  ReviewInProgressBanner,
} from "../../../client/components/bill-detail/review-status-banner";
import { BillStatusBadge } from "../../../client/components/bill-list/bill-status-badge";
import { SplitVoteMark } from "../../../client/components/bill-list/split-vote-mark";
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
 * 議案詳細の中央の先頭（Amazon の商品名・評価・価格の位置）。
 * タイトル・ステータス・提出日・テーマ・概要と、意見・共有の操作を並べる。
 * サムネイルと投票ボックスはレイアウト側で左右に置く。
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
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold leading-snug text-mirai-text md:text-[28px]">
        {displayTitle}
        {bill.is_review_completed && (
          <>
            {" "}
            <ReviewCompleteBadge showTooltip />
          </>
        )}
      </h1>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <BillStatusBadge status={bill.status} className="w-fit" />
        {bill.is_featured && <SplitVoteMark />}
        {bill.submitted_date && (
          <time className="text-xs font-medium text-mirai-text-muted">
            {formatDateWithDots(bill.submitted_date)} 提出
          </time>
        )}
      </div>

      {/* 正式名称。わかりやすいタイトルと違うときに、元の名前も分かるようにする */}
      {displayTitle !== bill.name && (
        <p className="text-sm text-mirai-text-secondary">{bill.name}</p>
      )}

      {bill.tags.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="テーマ">
          {bill.tags.map((tag) => (
            <li key={tag.id}>
              <Link
                href={billsListHref(DEFAULT_BILLS_LIST_PARAMS, {
                  tagId: tag.id,
                })}
                className="inline-flex h-9 items-center rounded-sm bg-mirai-surface-muted px-3 text-xs font-medium text-mirai-text-secondary hover:text-brand-link hover:underline"
              >
                {tag.label}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <hr className="my-1 border-mirai-border" />

      {displaySummary && (
        <p className="text-[15px] leading-relaxed text-mirai-text">
          {displaySummary}
        </p>
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
          <Button
            size="sm"
            asChild
            className="gap-1.5 rounded-md px-3 text-[13px]"
          >
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
