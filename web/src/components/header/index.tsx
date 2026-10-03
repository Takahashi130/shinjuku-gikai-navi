import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { getCurrentDietSession } from "@/features/diet-sessions/server/loaders/get-current-diet-session";
import { getLatestClosedDietSession } from "@/features/diet-sessions/server/loaders/get-latest-closed-diet-session";
import { buildSessionNotice } from "@/features/diet-sessions/shared/utils/session-notice";
import { getJapanTime } from "@/lib/utils/date";
import { HeaderClient } from "./header-client";

/**
 * サイト共通のヘッダー。お知らせ帯に出す会期の状況をここで取る。
 * どちらもキャッシュ済みの loader なので、ページごとの問い合わせは増えない。
 */
export async function Header() {
  const now = getJapanTime();
  const [difficultyLevel, currentSession, latestClosedSession] =
    await Promise.all([
      getDifficultyLevel(),
      getCurrentDietSession(now),
      getLatestClosedDietSession(now),
    ]);

  return (
    <HeaderClient
      difficultyLevel={difficultyLevel}
      notice={buildSessionNotice(currentSession, latestClosedSession, now)}
    />
  );
}
