import type { MetadataRoute } from "next";
import { getBills } from "@/features/bills/server/loaders/get-bills";
import { getMembersDirectory } from "@/features/members/server/loaders/get-members-directory";
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
    url: `${baseUrl}${routes.memberDetail(member.id)}`,
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
    ...billUrls,
    ...memberUrls,
  ];
}

/**
 * 議員のページは補助なので、取得に失敗しても（議員のテーブルがまだ無い DB など）
 * サイトマップごと落とさず、議員のページを省く。
 */
async function loadMembersSafely() {
  try {
    return (await getMembersDirectory()).members;
  } catch (error) {
    console.error("Failed to load members for sitemap:", error);
    return [];
  }
}
