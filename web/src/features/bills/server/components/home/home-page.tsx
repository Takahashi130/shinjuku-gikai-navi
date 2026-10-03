import "server-only";

import { History, MessageSquare } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCurrentDietSession } from "@/features/diet-sessions/server/loaders/get-current-diet-session";
import { getRecentDietSessions } from "@/features/diet-sessions/server/loaders/get-recent-diet-sessions";
import { formatOpenSessionNote } from "@/features/diet-sessions/shared/utils/session-notice";
import { getJapanTime } from "@/lib/utils/date";
import { BillCard } from "../../../client/components/bill-list/bill-card";
import type { BillTag } from "../../../shared/types";
import {
  buildHomeView,
  describeFeaturedSection,
} from "../../../shared/utils/build-home-view";
import {
  billsListHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "../../../shared/utils/parse-bills-list-params";
import { getBills } from "../../loaders/get-bills";
import { getFeaturedTags } from "../../loaders/get-featured-tags";
import { getSplitVoteExample } from "../../loaders/get-split-vote-example";
import { HomeComparisonCard } from "./home-comparison-card";
import { HomeHero } from "./home-hero";
import { HomeInterviewBand } from "./home-interview-band";
import { HomeSessionChips } from "./home-session-chips";
import { HomeThemeChips } from "./home-theme-chips";

/**
 * トップページ。白地に大きな角丸のカードを縦に並べ、情報は絞る。
 *
 * 1. ヒーロー：見出しと大きな数字3つ（審議中・掲載数・賛否が分かれた数）
 * 2. 「区民の意思 vs 議会の議決」：賛否が分かれた直近の議案を例に、議会側は
 *    実データ、区民側は準備中
 * 3. 審議中の議案：大きめのカード最大6件と「すべて見る」
 *    （AIインタビューを受け付けている議案があるときだけ、その下に1行の案内）
 * 4. テーマで探す・会期から探す：小さなチップ
 *
 * お知らせ帯（会期の状況）はヘッダーが出す。カードと件数は、議案一覧（/bills）
 * と同じ全件の軽い議案から作る（buildHomeView）。データの出典と免責文言は
 * フッターに出している。
 */
export async function HomePage() {
  const now = getJapanTime();
  const [bills, themes, currentSession, recentSessions] = await Promise.all([
    getBills(),
    loadThemesSafely(),
    getCurrentDietSession(now),
    getRecentDietSessions(),
  ]);

  const view = buildHomeView(bills, themes);
  const example = await getSplitVoteExample(
    view.comparisonCandidates.map((bill) => bill.id)
  );
  const deliberating = view.featured.kind === "deliberating";
  const featuredCopy = describeFeaturedSection(
    view.featured.kind,
    view.statusCounts.deliberating,
    currentSession !== null
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 md:gap-12 md:py-10">
      <HomeHero
        deliberatingCount={view.statusCounts.deliberating}
        totalCount={view.totalCount}
        splitCount={view.splitCount}
        earliestYear={view.earliestYear}
        lastUpdatedAt={view.lastUpdatedAt}
        sessionNote={
          currentSession ? formatOpenSessionNote(currentSession, now) : null
        }
      />

      {example && <HomeComparisonCard example={example} />}

      {view.featured.bills.length > 0 && (
        <section
          aria-labelledby="featured-title"
          className="flex flex-col gap-5"
        >
          {/*
            件数は全会期の審議中の議案から数える。継続審査で前の会期の議案が
            残ることもあるので、会期名は添えない。
          */}
          <SectionHeading
            id="featured-title"
            icon={deliberating ? MessageSquare : History}
            title={featuredCopy.title}
            description={featuredCopy.description}
            action={{
              href: billsListHref(
                DEFAULT_BILLS_LIST_PARAMS,
                deliberating ? { status: "deliberating" } : {}
              ),
              label: "すべて見る",
            }}
          />
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {view.featured.bills.map((bill) => (
              <li key={bill.id}>
                <BillCard bill={bill} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.interviewOpenCount > 0 && (
        <HomeInterviewBand count={view.interviewOpenCount} />
      )}

      <HomeThemeChips chips={view.themeChips} />

      <HomeSessionChips
        sessions={recentSessions}
        currentSessionId={currentSession?.id ?? null}
      />
    </div>
  );
}

/**
 * テーマは「テーマで探す」の補助なので、取得に失敗してもトップごと落とさない。
 * getFeaturedTags は失敗をキャッシュに載せないために例外を投げる。
 */
async function loadThemesSafely(): Promise<BillTag[]> {
  try {
    return await getFeaturedTags();
  } catch (error) {
    console.error("Failed to load themes for home:", error);
    return [];
  }
}
