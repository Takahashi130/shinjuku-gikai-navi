import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LabelPill } from "@/components/ui/label-pill";
import { RoundCard } from "@/components/ui/round-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { VersusLayout } from "@/components/ui/versus-layout";
import { routes } from "@/lib/routes";
import { formatDateWithDots } from "@/lib/utils/date";
import { CitizenVoteSlot } from "../../../client/components/bill-detail/bill-slots";
import { CouncilDecisionPanel } from "../../../client/components/bill-detail/council-decision-panel";
import { BillTitleText } from "../../../client/components/bill-list/bill-title-text";
import type { SplitVoteExample } from "../../loaders/get-split-vote-example";

/**
 * 「区民の意思 vs 議会の議決」の比較カード。
 *
 * 会派の賛否が分かれた直近の議案を例に、議会の議決（実際のデータ）と区民の
 * 意思を並べる（広い画面では左右、狭い画面では上下。説明文では位置を言わない）。
 * 区民の面（citizenVote）は HomeCitizenVotePanel：票があれば実際の結果、無ければ
 * その議案の投票への案内（議案ページと同じ差し込み口 CitizenVoteSlot を使う）。
 */
export function HomeComparisonCard({
  example,
  citizenVote,
}: {
  example: SplitVoteExample;
  /** 例の議案の区民投票の面。渡さなければ準備中の説明を出す。 */
  citizenVote?: ReactNode;
}) {
  const { bill, votes, billNumber } = example;
  const title = bill.bill_content?.title || bill.name;

  return (
    <RoundCard
      asChild
      padding="lg"
      className="flex flex-col gap-5 border-brand-accent-light/70 bg-[radial-gradient(ellipse_at_bottom_left,var(--color-stance-against-bg),white_45%)] shadow-md"
    >
      <section aria-labelledby="comparison-title">
        <SectionHeading
          id="comparison-title"
          title="区民の意思 vs 議会の議決"
          description="会派の賛否が分かれた直近の議案を例に、区民投票（参考値）と議会の議決を見比べます。"
        />

        <Link
          href={routes.billDetail(bill.id)}
          className="group flex flex-col gap-3 rounded-2xl border border-brand-accent-light bg-brand-accent-tint px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <span className="flex min-w-0 flex-col gap-1.5">
            <span className="flex flex-wrap items-center gap-1.5">
              <LabelPill tone="alert">賛否が分かれた議案</LabelPill>
              {billNumber && <LabelPill tone="outline">{billNumber}</LabelPill>}
              {bill.submitted_date && (
                <span className="text-xs text-mirai-text-muted">
                  {formatDateWithDots(bill.submitted_date)} 提出
                </span>
              )}
            </span>
            <span className="text-base font-bold leading-snug text-mirai-text group-hover:text-brand-link group-hover:underline">
              <BillTitleText title={title} />
            </span>
          </span>
          <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-full bg-brand-band px-5 text-sm font-bold text-white shadow-sm group-hover:bg-brand-link">
            議案を見る
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </Link>

        <VersusLayout
          left={<CitizenVoteSlot>{citizenVote}</CitizenVoteSlot>}
          right={<CouncilDecisionPanel status={bill.status} votes={votes} />}
        />
      </section>
    </RoundCard>
  );
}
