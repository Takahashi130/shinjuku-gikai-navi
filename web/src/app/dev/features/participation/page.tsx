import { ExplainerAbsence } from "@/features/bill-explainers/client/components/explainer-absence";
import { ExplainerSlides } from "@/features/bill-explainers/client/components/explainer-slides";
import { buildExplainerFooter } from "@/features/bill-explainers/shared/utils/build-explainer-footer";
import { buildExplainerSlides } from "@/features/bill-explainers/shared/utils/build-explainer-slides";
import { explainerAbsenceMessage } from "@/features/bill-explainers/shared/utils/explainer-absence-message";
import { sampleBillExplainer } from "@/features/bill-explainers/shared/utils/explainer-fixtures";
import { ParticipationBadges } from "@/features/bill-participation/client/components/participation-badges";
import type { CitizenVoteSummary } from "@/features/citizen-votes/shared/types";
import { describePollStatus } from "@/features/citizen-votes/shared/utils/describe-poll-status";
import { ComponentShowcase } from "../../_components/component-showcase";
import { PreviewSection } from "../../_components/preview-section";
import { VoteCardPreview } from "./_components/vote-card-preview";

const CLOSES_AT = "2026-10-15T05:00:00.000Z";
const NOW = new Date("2026-10-12T01:00:00Z");

const SUMMARY: CitizenVoteSummary = {
  beforeClose: { for: 18, against: 44, total: 62 },
  afterClose: { for: 3, against: 5, total: 8 },
  verifiedBeforeClose: { for: 0, against: 0, total: 0 },
};

export default function ParticipationPreview() {
  const explainer = sampleBillExplainer();
  const draft = sampleBillExplainer({
    isDraft: true,
    reviewedAt: null,
    reviewedBy: null,
  });
  const openState = { state: "open", closesAt: CLOSES_AT } as const;
  const afterState = {
    state: "open_after_close",
    closesAt: CLOSES_AT,
    openedAfterClose: false,
  } as const;

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold">区民参加（解説・投票）</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        架空のデータで見た目を確かめるページです。実データで試すときは
        <a className="mx-1 underline" href="/dev/features/participation/live">
          live
        </a>
        を開いてください。
      </p>

      <ComponentShowcase
        title="ExplainerSlides"
        description="@/features/bill-explainers/client/components/explainer-slides"
      >
        <PreviewSection label="公開済み（AI作成・照合済み）">
          <div className="mx-auto max-w-2xl">
            <ExplainerSlides
              billId={explainer.billId}
              slides={buildExplainerSlides(explainer.body, explainer.sources)}
              footer={buildExplainerFooter(explainer, NOW)}
            />
          </div>
        </PreviewSection>
        <PreviewSection label="下書き（プレビュー）・論点なし">
          <div className="mx-auto max-w-2xl">
            <ExplainerSlides
              billId={draft.billId}
              slides={buildExplainerSlides(
                { ...draft.body, concerns: [] },
                draft.sources
              )}
              footer={buildExplainerFooter(draft, NOW)}
            />
          </div>
        </PreviewSection>
      </ComponentShowcase>

      <ComponentShowcase title="ExplainerAbsence" description="解説が無い理由">
        <div className="mx-auto max-w-2xl space-y-3">
          <ExplainerAbsence
            message={explainerAbsenceMessage(
              {
                kind: "absent",
                readiness: { state: "preparing", afterVote: false },
                hasDraft: true,
              },
              NOW
            )}
          />
          <ExplainerAbsence
            message={explainerAbsenceMessage(
              {
                kind: "absent",
                readiness: { state: "preparing", afterVote: false },
                hasDraft: false,
              },
              NOW
            )}
          />
          <ExplainerAbsence
            message={explainerAbsenceMessage(
              {
                kind: "absent",
                readiness: { state: "not_applicable", reason: "personnel" },
                hasDraft: false,
              },
              NOW
            )}
          />
          <ExplainerAbsence
            message={explainerAbsenceMessage(
              {
                kind: "absent",
                readiness: { state: "not_available", reason: "past_bill" },
                hasDraft: false,
              },
              NOW
            )}
          />
        </div>
      </ComponentShowcase>

      <ComponentShowcase
        title="VoteCardView"
        description="@/features/citizen-votes/client/components/vote-card-view（押すとその場で反映。サーバーには送らない）"
      >
        <div className="mx-auto grid max-w-2xl gap-6">
          <PreviewSection label="締切前・未投票（結果は隠す）">
            <VoteCardPreview
              pollState={openState}
              status={describePollStatus(openState, NOW)}
              initial={{ myVote: null, summary: null }}
            />
          </PreviewSection>
          <PreviewSection label="締切前・投票済み（票が少なく判定なし）">
            <VoteCardPreview
              pollState={openState}
              status={describePollStatus(openState, NOW)}
              initial={{
                myVote: { choice: "for", castBeforeClose: true },
                summary: {
                  ...SUMMARY,
                  beforeClose: { for: 12, against: 9, total: 21 },
                  afterClose: { for: 0, against: 0, total: 0 },
                },
              }}
            />
          </PreviewSection>
          <PreviewSection label="採決後（可決）・区民は反対多数 → 判断が分かれた">
            <VoteCardPreview
              pollState={afterState}
              status={describePollStatus(afterState, NOW)}
              councilStatus="enacted"
              initial={{ myVote: null, summary: SUMMARY }}
            />
          </PreviewSection>
          <PreviewSection label="投票の受付を停止中（秘密鍵が未設定の本番など）">
            <VoteCardPreview
              pollState={openState}
              status={describePollStatus(openState, NOW)}
              votingEnabled={false}
              initial={{ myVote: null, summary: null }}
            />
          </PreviewSection>
          <PreviewSection label="エラー表示">
            <VoteCardPreview
              pollState={openState}
              status={describePollStatus(openState, NOW)}
              error="短い時間に操作が続いたため、受け付けを一時的に止めています。1分ほど待ってからお試しください。"
              initial={{
                myVote: { choice: "against", castBeforeClose: true },
                summary: SUMMARY,
              }}
            />
          </PreviewSection>
          <PreviewSection label="人事案件">
            <VoteCardPreview
              pollState={{ state: "not_applicable", reason: "personnel" }}
              status={describePollStatus(
                { state: "not_applicable", reason: "personnel" },
                NOW
              )}
              initial={{ myVote: null, summary: null }}
            />
          </PreviewSection>
        </div>
      </ComponentShowcase>

      <ComponentShowcase
        title="ParticipationBadges"
        description="@/features/bill-participation/client/components/participation-badges（一覧のカード用）"
      >
        <div className="space-y-3">
          <ParticipationBadges
            badges={[
              { kind: "explainer", label: "解説あり" },
              { kind: "vote_open", label: "投票受付中", detail: "あと3日" },
            ]}
          />
          <ParticipationBadges
            badges={[
              { kind: "explainer", label: "解説あり" },
              {
                kind: "citizens_result",
                label: "区民 反対多数",
                diverges: true,
              },
            ]}
          />
          <ParticipationBadges
            badges={[
              {
                kind: "citizens_result",
                label: "区民 賛成多数",
                diverges: false,
              },
            ]}
          />
        </div>
      </ComponentShowcase>
    </>
  );
}
