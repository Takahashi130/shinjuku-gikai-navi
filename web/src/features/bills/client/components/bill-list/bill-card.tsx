import Link from "next/link";
import { RubySafeLineClamp } from "@/components/ruby-safe-line-clamp";
import { ParticipationBadges } from "@/features/bill-participation/client/components/participation-badges";
import type { ParticipationBadge } from "@/features/bill-participation/shared/types";
import { routes } from "@/lib/routes";
import { formatDateWithDots } from "@/lib/utils/date";
import type { BillListItem } from "../../../shared/types";
import { ReviewCompleteBadge } from "../bill-detail/review-status-banner";
import { BillPill } from "./bill-pill";
import { BillStatusBadge } from "./bill-status-badge";
import { BillTag } from "./bill-tag";
import { BillTitleText } from "./bill-title-text";
import { SplitVoteMark } from "./split-vote-mark";

/** カードに要る最小限。一覧用の軽い議案でも、本文つきの議案でも渡せる。 */
export type BillCardData = Pick<
  BillListItem,
  | "id"
  | "name"
  | "status"
  | "submitted_date"
  | "is_review_completed"
  | "is_featured"
  | "tags"
  | "hasPublicInterview"
  | "publicReportCount"
> & {
  bill_content?: { title?: string | null; summary?: string | null } | null;
};

/**
 * 議案の大きめのカード（トップの「審議中の議案」・議案一覧・会期別一覧）。
 *
 * 上からステータスと提出日 → タイトル → 要約（2行）→ 区民参加の印（投票受付中・
 * 解説あり など）→ テーマ。サムネイルは置かない（どれも分野ごとの共通の絵で、
 * 情報が増えるだけなので）。
 *
 * リンクは議案名にだけ付け、疑似要素（after:inset-0）でカード全体に押せる
 * 範囲を広げる。カード全体を <a> にすると、読み上げるリンクの名前が
 * ステータス・日付・要約・テーマまでつながった長い文になり、リンクの一覧から
 * 議案を選びにくい。フォーカスの枠はカードに描く。
 */
export function BillCard({
  bill,
  participation,
}: {
  bill: BillCardData;
  /**
   * 解説と区民投票の印（getBillParticipationBadges で一覧の議案をまとめて取る）。
   * 無ければ出さない。
   */
  participation?: ParticipationBadge[];
}) {
  const title = bill.bill_content?.title || bill.name;
  const summary = bill.bill_content?.summary;
  const reportCount = bill.publicReportCount ?? 0;
  const hasBadges =
    bill.tags.length > 0 || bill.hasPublicInterview || reportCount > 0;
  const hasParticipation = (participation?.length ?? 0) > 0;

  return (
    <div className="group relative flex h-full flex-col gap-3 rounded-3xl border border-line-soft bg-white p-5 shadow-xs transition-shadow hover:border-brand-link/40 hover:shadow-md has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-primary has-[a:focus-visible]:outline-offset-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <BillStatusBadge status={bill.status} />
        {bill.is_featured && <SplitVoteMark />}
        {bill.submitted_date && (
          <span className="ml-auto text-xs font-medium text-mirai-text-muted">
            {formatDateWithDots(bill.submitted_date)} 提出
          </span>
        )}
      </div>

      {/*
        タイトルは省略しない。何の議案かが読めないと選べない。長い議案名なので
        文節での折り返し（break-phrase）は使わず、末尾の「（第2号）」などだけを
        ひとまとまりにする（BillTitleText）。
      */}
      <h3 className="text-pretty text-[17px] font-bold leading-snug text-mirai-text">
        <Link
          href={routes.billDetail(bill.id)}
          className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none group-hover:text-brand-link group-hover:underline"
        >
          <BillTitleText title={title} />
        </Link>
        {bill.is_review_completed && (
          <>
            {" "}
            <ReviewCompleteBadge size={14} top="1px" />
          </>
        )}
      </h3>

      {summary && (
        <RubySafeLineClamp
          text={summary}
          lineClamp={2}
          className="text-sm leading-relaxed text-mirai-text-secondary"
        />
      )}

      {(hasParticipation || hasBadges) && (
        <div className="mt-auto flex flex-col gap-2 pt-1">
          <ParticipationBadges badges={participation} />
          {hasBadges && (
            <div className="flex flex-wrap items-center gap-1.5">
              {bill.tags.map((tag) => (
                <BillTag key={tag.id} tag={tag} />
              ))}
              {bill.hasPublicInterview && (
                <BillPill>AIインタビュー受付中</BillPill>
              )}
              {/* 回答が集まっている議案だけ数字を出す。0人と書くと参加をためらわせる。 */}
              {reportCount > 0 && (
                <BillPill>{reportCount}人がAIインタビューに回答</BillPill>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
