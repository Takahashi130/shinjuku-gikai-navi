import { Suspense } from "react";
import { BillExplainerSection } from "@/features/bill-explainers/server/components/bill-explainer-section";
import { CitizenVoteSection } from "@/features/citizen-votes/server/components/citizen-vote-section";
import { cn } from "@/lib/utils";

interface BillParticipationPanelProps {
  billId: string;
  /**
   * トークン付きのプレビュー（/preview/bills/[id]）で使うとき true。
   * 解説の下書きも見せる（公開前の議案には投票できない）。
   */
  preview?: boolean;
  className?: string;
}

function SectionSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={`${label}を読み込んでいます`}
      className="h-40 animate-pulse rounded-xl border bg-muted"
    />
  );
}

/**
 * 議案ページに1行で置ける、区民参加の入口（解説 → 投票の順）。
 *
 * 置き方：議案詳細の本文の後などに
 *   <BillParticipationPanel billId={bill.id} />
 * プレビューでは
 *   <BillParticipationPanel billId={bill.id} preview />
 *
 * それぞれの部分は Suspense で包んでいるので、議案ページのほかの部分を待たせない。
 * データが取れないときは、その部分だけ出さない。
 */
export function BillParticipationPanel({
  billId,
  preview = false,
  className,
}: BillParticipationPanelProps) {
  return (
    <div className={cn("min-w-0 space-y-6", className)}>
      <Suspense fallback={<SectionSkeleton label="議案の解説" />}>
        <BillExplainerSection billId={billId} includeDraft={preview} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton label="区民投票" />}>
        <CitizenVoteSection billId={billId} />
      </Suspense>
    </div>
  );
}
