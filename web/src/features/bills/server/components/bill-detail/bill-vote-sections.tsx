import { unstable_rethrow } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { VersusLayout } from "@/components/ui/versus-layout";
import { ParticipationSkeleton } from "@/features/bill-participation/client/components/participation-skeleton";
import { CastVoteAnchor } from "@/features/citizen-votes/client/components/cast-vote-anchor";
import { CastVoteBand } from "@/features/citizen-votes/client/components/cast-vote-band";
import { CitizenVoteProvider } from "@/features/citizen-votes/client/components/citizen-vote-provider";
import { CitizenVoteResultPanel } from "@/features/citizen-votes/client/components/citizen-vote-result-panel";
import { CitizenVoteUnavailable } from "@/features/citizen-votes/client/components/citizen-vote-unavailable";
import { getBillCitizenVotes } from "@/features/citizen-votes/server/loaders/get-bill-citizen-votes";
import { describePollStatus } from "@/features/citizen-votes/shared/utils/describe-poll-status";
import {
  CastVoteSlot,
  CitizenVoteSlot,
} from "../../../client/components/bill-detail/bill-slots";

/** 「区民の意思 vs 議会の議決」の節の id（投票の帯の「結果を見る」の行き先） */
const VOTES_SECTION_ID = "bill-votes";

interface BillVoteSectionsProps {
  billId: string;
  /** 議会の議決の面（CouncilDecisionPanel）。区民の面と並べる */
  council: ReactNode;
}

/**
 * 議案ページの「区民の意思 vs 議会の議決」と「あなたの意思を投じる」の帯。
 *
 * 2つは離れた差し込み口（CitizenVoteSlot・CastVoteSlot）に入るが、帯で投票すると
 * 結果の面もすぐ変わるよう、どちらも同じ CitizenVoteProvider の中に置く。
 *
 * 区民投票のデータ（本人の票は Cookie から読む）は Suspense の中で取り、議案
 * ページのほかの部分を待たせない。読み込むあいだも議会の議決の面は先に出す。
 */
export function BillVoteSections({ billId, council }: BillVoteSectionsProps) {
  return (
    <Suspense
      fallback={
        <BillVoteSectionsFrame
          council={council}
          citizen={<ParticipationSkeleton label="区民投票の結果" />}
          cast={<ParticipationSkeleton label="区民投票" tone="dark" />}
        />
      }
    >
      <LoadedBillVoteSections billId={billId} council={council} />
    </Suspense>
  );
}

async function LoadedBillVoteSections({
  billId,
  council,
}: BillVoteSectionsProps) {
  let view: Awaited<ReturnType<typeof getBillCitizenVotes>> = null;
  try {
    view = await getBillCitizenVotes(billId);
  } catch (error) {
    // 動的レンダリングの合図など Next.js 内部のエラーは投げ直す
    unstable_rethrow(error);
    console.error(
      "Failed to load citizen votes:",
      error instanceof Error ? error.message : error
    );
  }

  // 読み込めないときは、議会の面だけを出し、投票の帯は出さない
  if (!view) {
    return (
      <BillVoteSectionsFrame
        council={council}
        citizen={<CitizenVoteUnavailable />}
        cast={null}
      />
    );
  }

  return (
    <CitizenVoteProvider
      view={view}
      status={describePollStatus(view.pollState, new Date())}
    >
      <BillVoteSectionsFrame
        council={council}
        citizen={<CitizenVoteResultPanel />}
        cast={<CastVoteBand resultsHref={`#${VOTES_SECTION_ID}`} />}
      />
    </CitizenVoteProvider>
  );
}

function BillVoteSectionsFrame({
  council,
  citizen,
  cast,
}: {
  council: ReactNode;
  citizen: ReactNode;
  /** null なら帯を出さない */
  cast: ReactNode | null;
}) {
  return (
    <>
      <section
        id={VOTES_SECTION_ID}
        aria-labelledby="bill-votes-title"
        className="flex scroll-mt-24 flex-col gap-3"
      >
        <h2
          id="bill-votes-title"
          className="text-lg font-extrabold text-mirai-text md:text-xl"
        >
          区民の意思 vs 議会の議決
        </h2>
        {/* 議会の面は会派の一覧で縦に長くなるので、区民の面は伸ばさない */}
        <VersusLayout
          stretch={false}
          left={<CitizenVoteSlot>{citizen}</CitizenVoteSlot>}
          right={council}
        />
      </section>

      {/*
        #cast-vote の行き先は、読み込み中の骨組みにも付くよう帯の外側に置く
        （直接開いたリンクでも帯まで移動する）
      */}
      {cast !== null && (
        <CastVoteAnchor>
          <CastVoteSlot>{cast}</CastVoteSlot>
        </CastVoteAnchor>
      )}
    </>
  );
}
