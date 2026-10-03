import "server-only";

import type { ReactNode } from "react";
import { About } from "@/components/top/about";
import { ComingSoonSection } from "@/components/top/coming-soon-section";
import {
  HERO_OVERLAP_CLASS,
  SessionHeroBanner,
} from "@/features/diet-sessions/client/components/session-hero-banner";
import { getCurrentDietSession } from "@/features/diet-sessions/server/loaders/get-current-diet-session";
import { getLatestClosedDietSession } from "@/features/diet-sessions/server/loaders/get-latest-closed-diet-session";
import { getRecentDietSessions } from "@/features/diet-sessions/server/loaders/get-recent-diet-sessions";
import { cn } from "@/lib/utils";
import { getJapanTime } from "@/lib/utils/date";
import { BillDisclaimer } from "../../../client/components/bill-detail/bill-disclaimer";
import type { BillTag } from "../../../shared/types";
import { buildHomeView } from "../../../shared/utils/build-home-view";
import {
  billsListHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "../../../shared/utils/parse-bills-list-params";
import { getBills } from "../../loaders/get-bills";
import { getComingSoonBills } from "../../loaders/get-coming-soon-bills";
import { getFeaturedTags } from "../../loaders/get-featured-tags";
import { getInterviewOpenBills } from "../../loaders/get-interview-open-bills";
import { BillRowSection } from "./bill-row-section";
import { ConceptCard } from "./concept-card";
import { SessionsCard } from "./sessions-card";
import { ThemeShelfCard } from "./theme-shelf-card";

/**
 * トップページ（Amazon のトップの作り）。
 *
 * 1. 大きなバナー：今の会期の状況・閉会までの日数・審議中の議案の件数
 * 2. カードの棚（1段目）：できること＋テーマ別（見出し＋サムネイル2×2）を4枚。
 *    バナーの下端に重ねる
 * 3. 横スクロールする議案の列：審議中の議案
 * 4. カードの棚（2段目以降）：残りのテーマ別と、会期から探す
 * 5. 残りの列：AIインタビュー受付中／賛否が分かれた／可決／否決
 * 6. サービスの紹介と免責事項
 *
 * Amazon のトップと同じく、カードの段と議案の列を交互に置く。棚を全部並べて
 * から列を出すと、いちばん見てほしい「審議中の議案」が広い画面でも2画面ほど
 * 下になる。
 *
 * カードと列は、議案一覧（/bills）と同じ全件の軽い議案から作る（buildHomeView）。
 */
export async function HomePage() {
  const now = getJapanTime();
  const [
    bills,
    themes,
    currentSession,
    latestClosedSession,
    recentSessions,
    interviewOpenBills,
    comingSoonBills,
  ] = await Promise.all([
    getBills(),
    loadThemesSafely(),
    getCurrentDietSession(now),
    getLatestClosedDietSession(now),
    getRecentDietSessions(),
    getInterviewOpenBills(),
    getComingSoonBills(),
  ]);

  const view = buildHomeView(bills, themes);
  const listHref = (patch: Parameters<typeof billsListHref>[1]) =>
    billsListHref(DEFAULT_BILLS_LIST_PARAMS, patch);

  // 棚の1段目は「できること」とテーマ3つ。残りのテーマと会期は2段目以降に回す。
  const firstShelfThemes = view.themeShelves.slice(0, FIRST_SHELF_THEMES);
  const restShelfThemes = view.themeShelves.slice(FIRST_SHELF_THEMES);
  const sessionsCard =
    recentSessions.length > 0 ? (
      <ShelfItem>
        <SessionsCard
          sessions={recentSessions}
          currentSessionId={currentSession?.id ?? null}
        />
      </ShelfItem>
    ) : null;

  return (
    <div className="pb-10">
      <SessionHeroBanner
        session={currentSession}
        closedSession={latestClosedSession}
        now={now}
        deliberatingCount={view.statusCounts.deliberating}
        totalCount={bills.length}
      />

      <div
        className={cn(
          "relative mx-auto flex max-w-[1500px] flex-col gap-5 md:px-5",
          HERO_OVERLAP_CLASS
        )}
      >
        <Shelf label="カテゴリから探す">
          <ShelfItem>
            <ConceptCard totalCount={bills.length} />
          </ShelfItem>
          {firstShelfThemes.map((shelf) => (
            <ShelfItem key={shelf.theme.id}>
              <ThemeShelfCard shelf={shelf} />
            </ShelfItem>
          ))}
        </Shelf>

        {/*
          件数は全会期の審議中の議案から数える。継続審査で前の会期の議案が
          残ることもあるので、会期名は添えない。
        */}
        {view.rows.deliberating.length > 0 && (
          <div className="px-3 sm:px-0">
            <BillRowSection
              id="deliberating"
              title="審議中の議案"
              subtitle={`${view.statusCounts.deliberating}件`}
              moreHref={listHref({ status: "deliberating" })}
              bills={view.rows.deliberating}
            />
          </div>
        )}

        {(restShelfThemes.length > 0 || sessionsCard) && (
          <Shelf label="テーマ・会期から探す">
            {restShelfThemes.map((shelf) => (
              <ShelfItem key={shelf.theme.id}>
                <ThemeShelfCard shelf={shelf} />
              </ShelfItem>
            ))}
            {sessionsCard}
          </Shelf>
        )}

        <div className="flex flex-col gap-5 px-3 sm:px-0">
          <BillRowSection
            id="interview-open"
            title="AIインタビュー受付中"
            subtitle="意見を募集している議案"
            moreHref={listHref({ interviewOnly: true })}
            bills={interviewOpenBills}
          />
          <BillRowSection
            id="split"
            title="会派の賛否が分かれた議案"
            subtitle={`全会一致ではなかった議案・${view.splitCount}件`}
            moreHref={listHref({ splitOnly: true })}
            bills={view.rows.split}
          />
          <BillRowSection
            id="enacted"
            title="最近可決された議案"
            subtitle={`${view.statusCounts.enacted}件`}
            moreHref={listHref({ status: "enacted" })}
            bills={view.rows.enacted}
          />
          <BillRowSection
            id="rejected"
            title="否決された議案"
            subtitle={`${view.statusCounts.rejected}件`}
            moreHref={listHref({ status: "rejected" })}
            bills={view.rows.rejected}
          />

          <ComingSoonSection bills={comingSoonBills} />

          <section
            aria-label="このサイトについて"
            className="grid gap-6 rounded-md bg-white p-4 md:grid-cols-2 md:p-5"
          >
            <About />
            <BillDisclaimer />
          </section>
        </div>
      </div>
    </div>
  );
}

/** 棚の1段目に並べるテーマのカードの数（「できること」と合わせて4枚＝広い画面で1段）。 */
const FIRST_SHELF_THEMES = 3;

/**
 * カードの棚。狭い画面では横にスクロールさせる（縦に積むと、その下の列までが
 * 遠くなる）。sm 以上は2列、lg 以上は4列のグリッド。
 */
function Shelf({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul
      aria-label={label}
      className="scrollbar-hide flex snap-x snap-mandatory scroll-px-3 gap-3 overflow-x-auto px-3 pb-1 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4"
    >
      {children}
    </ul>
  );
}

/** 棚の1枚。狭い画面の横スクロールでは画面幅の8割ほどにして、次の1枚を覗かせる。 */
function ShelfItem({ children }: { children: ReactNode }) {
  return (
    <li className="w-[82%] max-w-80 shrink-0 snap-start sm:w-auto sm:max-w-none">
      {children}
    </li>
  );
}

/**
 * テーマはカードの棚と帯の補助なので、取得に失敗してもトップごと落とさない。
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
