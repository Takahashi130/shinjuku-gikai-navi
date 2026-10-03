import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { InterviewLandingSection } from "@/features/interview-config/client/components/interview-landing-section";
import { getInterviewConfig } from "@/features/interview-config/server/loaders/get-interview-config";
import { getPublicReportsByBillId } from "@/features/interview-report/server/loaders/get-public-reports-by-bill-id";
import { getFactionMemberLinks } from "@/features/members/server/loaders/get-faction-member-links";
import { BillTopicsPreviewSection } from "@/features/user-topic-analysis/server/components/bill-topics-preview-section";
import { getPublicTopicAnalysis } from "@/features/user-topic-analysis/server/loaders/get-public-topic-analysis";
import { routes } from "@/lib/routes";
import { BillDisclaimer } from "../../../client/components/bill-detail/bill-disclaimer";
import { BillStatusProgress } from "../../../client/components/bill-detail/bill-status-progress";
import { BillThumbnail } from "../../../client/components/bill-list/bill-thumbnail";
import type { BillWithContent } from "../../../shared/types";
import {
  FACTION_VOTES_HEADING,
  parseBillVotes,
  RESULT_HEADING,
  removeMarkdownSections,
} from "../../../shared/utils/parse-bill-votes";
import {
  billsListHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "../../../shared/utils/parse-bills-list-params";
import { BillShareButtons } from "../share/bill-share-buttons";
import { BillContent } from "./bill-content";
import { BillDetailHeader } from "./bill-detail-header";
import { BillVoteBox } from "./bill-vote-box";
import { FactionVotes } from "./faction-votes";

interface BillDetailLayoutProps {
  bill: BillWithContent;
}

/**
 * 議案詳細（Amazon の商品ページの作り）。
 *
 * - 広い画面（xl）: 左にサムネイル、中央にタイトル・概要・会派ごとの賛否・本文、
 *   右に固定の「投票」ボックス
 * - 中くらいの画面（md）: サムネイルを中央の上に置き、投票ボックスは右に固定
 * - スマホ: 縦に積む。投票ボックスは概要のすぐ後に出す
 *
 * 議決結果と会派ごとの賛否は解説の Markdown から読み取って（parseBillVotes）
 * 構造化して出し、解説の本文からはその節を取り除いて二重に出さない。
 */
export async function BillDetailLayout({ bill }: BillDetailLayoutProps) {
  const [interviewConfig, publicReportsResult, topicAnalysis, memberLinks] =
    await Promise.all([
      getInterviewConfig(bill.id),
      getPublicReportsByBillId(bill.id),
      getPublicTopicAnalysis(bill.id),
      getFactionMemberLinks(),
    ]);

  const markdown = bill.bill_content?.content;
  const votes = parseBillVotes(markdown);
  const contentMarkdown =
    votes && markdown
      ? removeMarkdownSections(markdown, [
          RESULT_HEADING,
          ...(votes.hasFactionVotes ? [FACTION_VOTES_HEADING] : []),
        ])
      : markdown;

  const [firstTag] = bill.tags;
  const breadcrumb: BreadcrumbItem[] = [
    { label: "トップ", href: routes.home() },
    { label: "議案をさがす", href: routes.billsList() },
    ...(firstTag
      ? [
          {
            label: firstTag.label,
            href: billsListHref(DEFAULT_BILLS_LIST_PARAMS, {
              tagId: firstTag.id,
            }),
          },
        ]
      : []),
  ];

  return (
    <div className="w-full flex-1 bg-white">
      <div className="mx-auto max-w-[1500px] px-4 py-4 md:px-6 md:py-6">
        <Breadcrumb items={breadcrumb} />

        <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
          <div className="flex min-w-0 flex-1 flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
            {/* サムネイル */}
            <div className="xl:sticky xl:top-4 xl:w-[340px] xl:shrink-0">
              <BillThumbnail
                src={bill.thumbnail_url}
                sizes="(min-width: 1280px) 340px, (min-width: 700px) 480px, 100vw"
                priority
                className="aspect-[16/9] w-full md:aspect-[4/3] md:max-w-[480px] xl:max-w-none"
              />
            </div>

            {/* 中央 */}
            <div className="flex min-w-0 flex-1 flex-col gap-8">
              <BillDetailHeader
                bill={bill}
                hasInterviewConfig={interviewConfig != null}
                opinionCount={topicAnalysis?.total_opinions ?? 0}
                topicCount={topicAnalysis?.topics.length ?? 0}
              />

              {/* スマホでは右のボックスを置けないので、概要のすぐ後に出す */}
              <BillVoteBox
                status={bill.status}
                votes={votes}
                className="md:hidden"
              />

              <BillStatusProgress
                status={bill.status}
                originatingHouse={bill.originating_house}
                statusNote={bill.status_note}
              />

              {votes?.hasFactionVotes && (
                <FactionVotes votes={votes} memberLinks={memberLinks} />
              )}

              <BillContent markdown={contentMarkdown} />

              {/* 議案のトピック一覧（AIインタビュー意見の整理） */}
              <BillTopicsPreviewSection
                billId={bill.id}
                topics={topicAnalysis?.topics ?? []}
                publicReportCount={publicReportsResult.totalCount}
              />

              {interviewConfig != null && (
                <InterviewLandingSection billId={bill.id} />
              )}

              <BillShareButtons bill={bill} />

              {/* データの出典と免責事項 */}
              <BillDisclaimer className="border-mirai-border border-t pt-6" />
            </div>
          </div>

          {/* 右の投票ボックス（Amazon のカートボックスの位置） */}
          <aside className="hidden md:sticky md:top-4 md:block md:w-72 md:shrink-0">
            <BillVoteBox status={bill.status} votes={votes} />
          </aside>
        </div>
      </div>
    </div>
  );
}
