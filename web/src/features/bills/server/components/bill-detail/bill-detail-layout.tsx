import { Suspense } from "react";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { RoundCard } from "@/components/ui/round-card";
import { BillExplainerSection } from "@/features/bill-explainers/server/components/bill-explainer-section";
import { ExplainerVideo } from "@/features/bill-explainers/server/components/explainer-video";
import { ParticipationSkeleton } from "@/features/bill-participation/client/components/participation-skeleton";
import { getDietSessionById } from "@/features/diet-sessions/server/loaders/get-diet-session-by-id";
import { formatPendingSessionNote } from "@/features/diet-sessions/shared/utils/session-notice";
import { InterviewLandingSection } from "@/features/interview-config/client/components/interview-landing-section";
import { getInterviewConfig } from "@/features/interview-config/server/loaders/get-interview-config";
import { getPublicReportsByBillId } from "@/features/interview-report/server/loaders/get-public-reports-by-bill-id";
import { getFactionMemberLinks } from "@/features/members/server/loaders/get-faction-member-links";
import { BillTopicsPreviewSection } from "@/features/user-topic-analysis/server/components/bill-topics-preview-section";
import { getPublicTopicAnalysis } from "@/features/user-topic-analysis/server/loaders/get-public-topic-analysis";
import { routes } from "@/lib/routes";
import { getJapanTime } from "@/lib/utils/date";
import { BillDisclaimer } from "../../../client/components/bill-detail/bill-disclaimer";
import {
  BillCommentsSlot,
  BillExplainerSlot,
} from "../../../client/components/bill-detail/bill-slots";
import { BillStatusProgress } from "../../../client/components/bill-detail/bill-status-progress";
import { CouncilDecisionPanel } from "../../../client/components/bill-detail/council-decision-panel";
import type { BillWithContent } from "../../../shared/types";
import { extractBillNumber } from "../../../shared/utils/bill-number";
import { getSectionsShownInDecisionPanel } from "../../../shared/utils/council-decision";
import {
  parseBillVotes,
  removeMarkdownSections,
} from "../../../shared/utils/parse-bill-votes";
import {
  billsListHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "../../../shared/utils/parse-bills-list-params";
import { BillShareButtons } from "../share/bill-share-buttons";
import { BillContent } from "./bill-content";
import { BillDetailHeader } from "./bill-detail-header";
import { BillDetailStrip } from "./bill-detail-strip";
import { BillVoteSections } from "./bill-vote-sections";

interface BillDetailLayoutProps {
  bill: BillWithContent;
  /**
   * トークン付きのプレビュー（/preview/bills/[id]）で描くとき true。
   * 解説の下書きも見せる（公開前の議案には投票できない）。
   */
  preview?: boolean;
}

/**
 * 議案詳細。1枚の大きな角丸のカードに、上から
 *
 * 1. 濃色の帯：会期・議案番号・議会の結果のピルと提出日
 * 2. タイトル・要約・テーマ
 * 3. 事前解説（AI が作成し別の AI が照合したスライド。無ければその理由）
 * 4. 区民の意思 vs 議会の議決（区民投票の結果と議会の議決を並べ、ズレを示す）
 * 5. 「あなたの意思を投じる」の濃色の帯（賛成・反対・取り消し）
 * 6. 区民のコメント（差し込み口・いまは準備中）
 *
 * を並べ、その下に審議のステータス・議案の内容（解説の本文）・AIインタビュー
 * などを続ける。差し込み口は bill-slots.tsx。解説と区民投票は Suspense の中で
 * 読み込み、議案ページのほかの部分を待たせない（4 と 5 は bill-vote-sections.tsx）。
 *
 * 議決結果と会派ごとの賛否は解説の Markdown から読み取って（parseBillVotes）
 * 構造化して出し、解説の本文からはその節を取り除いて二重に出さない。取り除く
 * のは「議会の議決」の面が実際に出す節だけ（getSectionsShownInDecisionPanel）。
 */
export async function BillDetailLayout({
  bill,
  preview = false,
}: BillDetailLayoutProps) {
  const [
    interviewConfig,
    publicReportsResult,
    topicAnalysis,
    session,
    memberLinks,
  ] = await Promise.all([
    getInterviewConfig(bill.id),
    getPublicReportsByBillId(bill.id),
    getPublicTopicAnalysis(bill.id),
    bill.diet_session_id
      ? getDietSessionById(bill.diet_session_id)
      : Promise.resolve(null),
    // 会派名から議員カルテへのリンク。取れなければリンク無しで出す
    getFactionMemberLinks(),
  ]);

  const markdown = bill.bill_content?.content;
  const votes = parseBillVotes(markdown);
  const sectionsInPanel = getSectionsShownInDecisionPanel(bill.status, votes);
  const contentMarkdown =
    markdown && sectionsInPanel.length > 0
      ? removeMarkdownSections(markdown, sectionsInPanel)
      : markdown;
  const topics = topicAnalysis?.topics ?? [];

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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:py-8">
      <Breadcrumb items={breadcrumb} />

      <RoundCard asChild padding="none" className="overflow-hidden">
        <article aria-labelledby="bill-title">
          <BillDetailStrip
            status={bill.status}
            resultLabel={votes?.result ?? null}
            session={session}
            billNumber={extractBillNumber(markdown)}
            isSplit={bill.is_featured}
            submittedDate={bill.submitted_date}
          />

          <div className="flex flex-col gap-6 p-5 md:gap-8 md:p-8">
            <BillDetailHeader
              bill={bill}
              hasInterviewConfig={interviewConfig != null}
              opinionCount={topicAnalysis?.total_opinions ?? 0}
              topicCount={topics.length}
            />

            <ExplainerVideo billId={bill.id} />

            <BillExplainerSlot>
              <Suspense
                fallback={
                  <ParticipationSkeleton label="事前解説" className="h-72" />
                }
              >
                <BillExplainerSection billId={bill.id} includeDraft={preview} />
              </Suspense>
            </BillExplainerSlot>

            <BillVoteSections
              billId={bill.id}
              council={
                <CouncilDecisionPanel
                  status={bill.status}
                  votes={votes}
                  showFactions
                  memberLinks={memberLinks}
                  pendingNote={
                    session
                      ? (formatPendingSessionNote(session, getJapanTime()) ??
                        undefined)
                      : undefined
                  }
                />
              }
            />

            <BillCommentsSlot />
          </div>
        </article>
      </RoundCard>

      <RoundCard>
        <BillStatusProgress
          status={bill.status}
          originatingHouse={bill.originating_house}
          statusNote={bill.status_note}
        />
      </RoundCard>

      {contentMarkdown && (
        <RoundCard>
          <BillContent markdown={contentMarkdown} />
        </RoundCard>
      )}

      {/* 議案のトピック一覧（AIインタビュー意見の整理）。無ければ何も出さない */}
      {topics.length > 0 && (
        <RoundCard>
          <BillTopicsPreviewSection
            billId={bill.id}
            topics={topics}
            publicReportCount={publicReportsResult.totalCount}
          />
        </RoundCard>
      )}

      {interviewConfig != null && (
        <RoundCard>
          <InterviewLandingSection billId={bill.id} />
        </RoundCard>
      )}

      <RoundCard className="flex flex-col gap-6">
        <BillShareButtons bill={bill} />
        {/* データの出典と免責事項 */}
        <BillDisclaimer className="border-line-soft border-t pt-6" />
      </RoundCard>
    </div>
  );
}
