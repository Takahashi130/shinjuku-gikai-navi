import { createHmac } from "node:crypto";

/**
 * 区民参加の機能で、生の値（IP アドレスなど）を保存・比較しないために使う HMAC。
 *
 * 1つの秘密鍵（PARTICIPATION_HASH_SECRET）を、用途の印（`ip:` など）を付けて
 * 使い分ける。用途が違えば同じ値でも別のハッシュになるので、ある用途のハッシュを
 * 別の用途の照合に流用できない。
 */
/**
 * - ip: 接続元ごとの回数制限
 * - ip_bill: 接続元と議案の組ごとの回数制限（値は「接続元|議案ID」）
 * - pseudonym: 議案ごとに変わる表示名
 */
export const HASH_PURPOSES = ["ip", "ip_bill", "pseudonym"] as const;
export type HashPurpose = (typeof HASH_PURPOSES)[number];

/** 出力の長さ（16進の文字数）。128bit あれば衝突は実用上起きない */
const HASH_HEX_LENGTH = 32;

export function hashForPurpose(
  secret: string,
  purpose: HashPurpose,
  value: string
): string {
  if (!secret) {
    throw new Error("hashForPurpose: secret is empty");
  }
  return createHmac("sha256", secret)
    .update(`${purpose}:${value}`)
    .digest("hex")
    .slice(0, HASH_HEX_LENGTH);
}
