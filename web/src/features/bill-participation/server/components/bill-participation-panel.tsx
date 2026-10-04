import { Suspense } from "react";
import { BillExplainerSection } from "@/features/bill-explainers/server/components/bill-explainer-section";
import { CitizenVoteSection } from "@/features/citizen-votes/server/components/citizen-vote-section";
import { cn } from "@/lib/utils";
import { ParticipationSkeleton } from "../../client/components/participation-skeleton";

interface BillParticipationPanelProps {
  billId: string;
  /**
   * トークン付きのプレビュー（/preview/bills/[id]）で使うとき true。
   * 解説の下書きも見せる（公開前の議案には投票できない）。
   */
  preview?: boolean;
  className?: string;
}

/**
 * 1か所に縦に並べる、区民参加の入口（解説 → 投票の帯 → 区民投票の結果）。
 * 開発用の実データのページ（/dev/features/participation/live）で使う。
 *
 * 議案ページ（BillDetailLayout）では、解説・結果・投票の帯をそれぞれの差し込み口
 * （bill-slots.tsx）に分けて置くので、このパネルは使わない。
 *
 * それぞれの部分は Suspense で包んでいるので、ほかの部分を待たせない。
 * データが取れないときは、その部分だけ出さない。
 */
export function BillParticipationPanel({
  billId,
  preview = false,
  className,
}: BillParticipationPanelProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-6", className)}>
      <Suspense fallback={<ParticipationSkeleton label="事前解説" />}>
        <BillExplainerSection billId={billId} includeDraft={preview} />
      </Suspense>
      <Suspense
        fallback={<ParticipationSkeleton label="区民投票" tone="dark" />}
      >
        <CitizenVoteSection billId={billId} />
      </Suspense>
    </div>
  );
}
