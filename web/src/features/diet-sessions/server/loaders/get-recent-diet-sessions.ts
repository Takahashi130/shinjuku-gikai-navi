import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { DietSession } from "../../shared/types";
import { findRecentDietSessions } from "../repositories/diet-session-repository";

/** トップの「会期から探す」に並べる会期の数。 */
const RECENT_SESSION_LIMIT = 6;

/**
 * 新しい順に直近の会期を返す（slug のあるものだけ）。
 *
 * トップの「会期から探す」に使う。過去の会期の議案一覧（/kokkai/[slug]/bills）
 * へは、ここからたどれるようにする。会期はめったに変わらないので、他の会期の
 * loader と同じく1時間キャッシュする。
 */
export async function getRecentDietSessions(): Promise<DietSession[]> {
  return _getCachedRecentDietSessions();
}

const _getCachedRecentDietSessions = unstable_cache(
  async (): Promise<DietSession[]> =>
    findRecentDietSessions(RECENT_SESSION_LIMIT),
  ["recent-diet-sessions"],
  { revalidate: 3600, tags: [CACHE_TAGS.DIET_SESSIONS] }
);
