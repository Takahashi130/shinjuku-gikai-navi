import "server-only";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  buildFactionMemberLinkLookup,
  type FactionMemberLinkLookup,
} from "../../shared/utils/faction-member-links";
import { findFactionNamesWithFaction } from "../repositories/member-repository";

/**
 * 議案ページの「会派ごとの賛否」で、会派名から議員の一覧へのリンクを引く表。
 *
 * リンクは補助なので、取得に失敗しても議案ページは落とさず、リンク無しで出す。
 */
export async function getFactionMemberLinks(): Promise<FactionMemberLinkLookup> {
  try {
    return await _getCachedFactionMemberLinks();
  } catch (error) {
    console.error("Failed to load faction member links:", error);
    return {};
  }
}

const _getCachedFactionMemberLinks = unstable_cache(
  async (): Promise<FactionMemberLinkLookup> => {
    const rows = await findFactionNamesWithFaction();
    return buildFactionMemberLinkLookup(
      rows.map((row) => ({
        name: row.name,
        slug: row.factions.slug,
        isCurrent: row.factions.is_current,
      }))
    );
  },
  ["faction-member-links-v1"],
  {
    revalidate: 3600,
    tags: [CACHE_TAGS.MEMBERS],
  }
);
