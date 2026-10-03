/**
 * 区民参加の機能（投票など）で使う HMAC の秘密鍵を決める。
 *
 * - PARTICIPATION_HASH_SECRET が 32 文字以上で設定されていれば、それを使う。
 * - 本番（NODE_ENV=production。Vercel のプレビューも含む）で未設定・短すぎる場合は
 *   null を返す。呼び出し側は投票の受付を止める（推測できる鍵で接続元を
 *   ハッシュしない＝安全側に倒す）。
 * - 開発・テストでは、決め打ちの開発用の値を使う（source = "dev-default"）。
 *   この値はリポジトリに公開されているので、本番では絶対に使わない。
 */

export const MIN_PARTICIPATION_HASH_SECRET_LENGTH = 32;

/** 開発・テスト専用。公開リポジトリに載っているため、本番では使われない */
export const DEV_PARTICIPATION_HASH_SECRET =
  "dev-only-participation-hash-secret-not-for-production";

export type ParticipationHashSecret = {
  value: string;
  source: "env" | "dev-default";
};

export function resolveParticipationHashSecret(input: {
  secret: string | undefined;
  nodeEnv: string | undefined;
}): ParticipationHashSecret | null {
  const secret = input.secret?.trim() ?? "";
  if (secret.length >= MIN_PARTICIPATION_HASH_SECRET_LENGTH) {
    return { value: secret, source: "env" };
  }
  if (input.nodeEnv === "production") {
    return null;
  }
  return { value: DEV_PARTICIPATION_HASH_SECRET, source: "dev-default" };
}
