import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { getFeaturedTags } from "@/features/bills/server/loaders/get-featured-tags";
import type { BillTag } from "@/features/bills/shared/types";
import { getCurrentDietSession } from "@/features/diet-sessions/server/loaders/get-current-diet-session";
import { getRecentDietSessions } from "@/features/diet-sessions/server/loaders/get-recent-diet-sessions";
import { getJapanTime } from "@/lib/utils/date";
import { HeaderClient } from "./header-client";
import { buildSessionLinks, buildSessionPill } from "./header-nav";

/**
 * サイト共通のヘッダー。テーマ・会期など、帯とメニューに並べるデータをここで取る。
 * どれもキャッシュ済みの loader なので、ページごとの問い合わせは増えない。
 */
export async function Header() {
  const now = getJapanTime();
  const [difficultyLevel, themes, currentSession, recentSessions] =
    await Promise.all([
      getDifficultyLevel(),
      loadThemesSafely(),
      getCurrentDietSession(now),
      getRecentDietSessions(),
    ]);

  return (
    <HeaderClient
      difficultyLevel={difficultyLevel}
      themes={themes}
      sessionLinks={buildSessionLinks(recentSessions)}
      sessionPill={buildSessionPill(currentSession, now)}
    />
  );
}

/**
 * テーマは帯とメニューの補助なので、取得に失敗してもヘッダーごと落とさない。
 * getFeaturedTags は失敗をキャッシュに載せないために例外を投げる。
 */
async function loadThemesSafely(): Promise<BillTag[]> {
  try {
    return await getFeaturedTags();
  } catch (error) {
    console.error("Failed to load themes for header:", error);
    return [];
  }
}
