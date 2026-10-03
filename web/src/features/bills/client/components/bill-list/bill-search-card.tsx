import Link from "next/link";
import { RubySafeLineClamp } from "@/components/ruby-safe-line-clamp";
import { routes } from "@/lib/routes";
import { formatDateWithDots } from "@/lib/utils/date";
import type { BillListItem } from "../../../shared/types";
import { ReviewCompleteBadge } from "../bill-detail/review-status-banner";
import { BillPill } from "./bill-pill";
import { BillStatusBadge } from "./bill-status-badge";
import { BillTag } from "./bill-tag";
import { BillThumbnail } from "./bill-thumbnail";
import { SplitVoteMark } from "./split-vote-mark";

/**
 * 議案一覧（/bills）・会期別一覧の1行（Amazon の検索結果の1行）。
 *
 * 左にサムネイル、右にタイトル・ステータス・提出日・要約・テーマを並べる。
 * 行全体を1つのリンクにする（同じ行に詳細へのリンクを2つ置くと、読み上げで
 * 同じ行き先が2回出る）。
 *
 * サムネイルが無い議案も同じ大きさの枠を残して、タイトルの位置を揃える。
 */
export function BillSearchCard({ bill }: { bill: BillListItem }) {
  const title = bill.bill_content?.title || bill.name;
  const summary = bill.bill_content?.summary;
  const reportCount = bill.publicReportCount ?? 0;
  const hasBadges =
    bill.tags.length > 0 || bill.hasPublicInterview || reportCount > 0;

  return (
    <Link
      href={routes.billDetail(bill.id)}
      className="group flex gap-3 py-4 sm:gap-5"
    >
      <BillThumbnail
        src={bill.thumbnail_url}
        sizes="(min-width: 500px) 176px, 112px"
        className="aspect-[4/3] w-28 shrink-0 self-start sm:w-44"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* タイトルは省略しない。何の議案かが読めないと選べない。 */}
        <h3 className="text-[15px] font-bold leading-snug text-mirai-text group-hover:text-brand-link group-hover:underline sm:text-base">
          {title}
          {bill.is_review_completed && (
            <>
              {" "}
              <ReviewCompleteBadge size={14} top="1px" />
            </>
          )}
        </h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <BillStatusBadge status={bill.status} className="w-fit" />
          {bill.is_featured && <SplitVoteMark />}
          {bill.submitted_date && (
            <span className="text-xs font-medium text-mirai-text-muted">
              {formatDateWithDots(bill.submitted_date)} 提出
            </span>
          )}
        </div>

        {summary && (
          <RubySafeLineClamp
            text={summary}
            lineClamp={2}
            className="text-[13px] leading-relaxed text-mirai-text-secondary"
          />
        )}

        {hasBadges && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {bill.tags.map((tag) => (
              <BillTag key={tag.id} tag={tag} />
            ))}
            {bill.hasPublicInterview && (
              <BillPill>AIインタビュー受付中</BillPill>
            )}
            {/* 回答が集まっている議案だけ数字を出す。0人と書くと参加をためらわせる。 */}
            {reportCount > 0 && (
              <BillPill>💬 {reportCount}人がAIインタビューに回答</BillPill>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
