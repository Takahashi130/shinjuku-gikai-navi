import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { DietSession } from "../../shared/types";
import { findDietSessionById } from "../repositories/diet-session-repository";

/**
 * id で会期を取得する。議案ページの会期のピル（会期別一覧へのリンク）に使う。
 * 会期はめったに変わらないので、他の会期の loader と同じく1時間キャッシュする。
 */
export async function getDietSessionById(
  id: string
): Promise<DietSession | null> {
  return _getCachedDietSessionById(id);
}

const _getCachedDietSessionById = unstable_cache(
  async (id: string): Promise<DietSession | null> => findDietSessionById(id),
  ["diet-session-by-id"],
  { revalidate: 3600, tags: [CACHE_TAGS.DIET_SESSIONS] }
);
