import type { MetadataRoute } from "next";
import { getBills } from "@/features/bills/server/loaders/get-bills";
import { getMembersDirectory } from "@/features/members/server/loaders/get-members-directory";
import { UPCOMING_FEATURE_IDS } from "@/features/upcoming/shared/utils/upcoming-features";
import { routes } from "@/lib/routes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const [bills, members] = await Promise.all([getBills(), loadMembersSafely()]);

  const billUrls = bills.map((bill) => ({
    url: `${baseUrl}${routes.billDetail(bill.id)}`,
    lastModified: new Date(bill.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const memberUrls = members.map((member) => ({
    url: `${baseUrl}${routes.memberProfile(member.id)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}${routes.billsList()}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}${routes.membersList()}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    // 準備中の機能の説明ページ（ヘッダーのタブの行き先）
    ...UPCOMING_FEATURE_IDS.map((feature) => ({
      url: `${baseUrl}${routes.upcoming(feature)}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
    ...billUrls,
    ...memberUrls,
  ];
}

/**
 * 議員のページは議案とは別の取得なので、失敗しても（議員のテーブルがまだ無い
 * DB など）サイトマップごと落とさず、議員のページだけを省く。
 */
async function loadMembersSafely() {
  try {
    return (await getMembersDirectory()).members;
  } catch (error) {
    console.error("Failed to load members for sitemap:", error);
    return [];
  }
}
