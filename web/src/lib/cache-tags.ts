/**
 * Next.js cache tags for revalidation
 */
export const CACHE_TAGS = {
  BILLS: "bills",
  DIET_SESSIONS: "diet-sessions",
  INTERVIEW_CONFIGS: "interview-configs",
  // 議員・会派・本会議の質問・政務活動費（取り込み処理の members / questions / expenses）
  MEMBERS: "members",
  // admin のレポート公開操作が revalidate するタグ。
  PUBLIC_INTERVIEW_REPORTS: "public-interview-reports",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export const ALL_CACHE_TAGS = Object.values(CACHE_TAGS);
