/**
 * 環境変数の設定
 * アプリケーション全体で使用する環境変数を一元管理
 */

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("環境変数 NEXT_PUBLIC_SUPABASE_URL が設定されていません");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "環境変数 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY が設定されていません"
  );
}

const chatDailyUserCostLimitUsdRaw =
  process.env.CHAT_DAILY_USER_COST_LIMIT_USD ||
  process.env.CHAT_DAILY_COST_LIMIT_USD ||
  "0.5";

const chatDailyUserCostLimitUsd = Number(chatDailyUserCostLimitUsdRaw);

if (Number.isNaN(chatDailyUserCostLimitUsd) || chatDailyUserCostLimitUsd <= 0) {
  throw new Error(
    "環境変数 CHAT_DAILY_USER_COST_LIMIT_USD は正の数値で指定してください"
  );
}

const chatDailyTotalCostLimitUsdRaw =
  process.env.CHAT_DAILY_TOTAL_COST_LIMIT_USD || "50";

const chatDailyTotalCostLimitUsd = Number(chatDailyTotalCostLimitUsdRaw);

if (
  Number.isNaN(chatDailyTotalCostLimitUsd) ||
  chatDailyTotalCostLimitUsd <= 0
) {
  throw new Error(
    "環境変数 CHAT_DAILY_TOTAL_COST_LIMIT_USD は正の数値で指定してください"
  );
}

const chatMonthlyTotalCostLimitUsdRaw =
  process.env.CHAT_MONTHLY_TOTAL_COST_LIMIT_USD || "1000";

const chatMonthlyTotalCostLimitUsd = Number(chatMonthlyTotalCostLimitUsdRaw);

if (
  Number.isNaN(chatMonthlyTotalCostLimitUsd) ||
  chatMonthlyTotalCostLimitUsd <= 0
) {
  throw new Error(
    "環境変数 CHAT_MONTHLY_TOTAL_COST_LIMIT_USD は正の数値で指定してください"
  );
}

export const env = {
  webUrl: process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
  adminUrl: process.env.ADMIN_URL || "http://localhost:3001",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  revalidateSecret: process.env.REVALIDATE_SECRET,
  analytics: {
    gaTrackingId: process.env.NEXT_PUBLIC_GA_TRACKING_ID,
  },
  langfuse: {
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
  },
  chat: {
    dailyUserCostLimitUsd: chatDailyUserCostLimitUsd,
    dailyTotalCostLimitUsd: chatDailyTotalCostLimitUsd,
    monthlyTotalCostLimitUsd: chatMonthlyTotalCostLimitUsd,
  },
  participation: {
    /**
     * 区民参加（投票など）で接続元などをハッシュする HMAC の秘密鍵（32文字以上）。
     * サーバー専用。本番で未設定なら投票の受付を止める（起動は止めない）。
     * 開発では未設定でも開発用の既定値で動く。
     * 決め方は lib/participation/resolve-participation-hash-secret.ts を参照。
     */
    hashSecret: process.env.PARTICIPATION_HASH_SECRET,
  },
} as const;

// 型定義
export type Env = typeof env;
