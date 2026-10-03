import "server-only";

import { env } from "@/lib/env";
import {
  type ParticipationHashSecret,
  resolveParticipationHashSecret,
} from "./resolve-participation-hash-secret";

let warned = false;

/**
 * 区民参加の HMAC の秘密鍵を返す。null なら投票などの受付を止める。
 * 決め方は resolveParticipationHashSecret を参照（本番で未設定なら null）。
 */
export function getParticipationHashSecret(): ParticipationHashSecret | null {
  const resolved = resolveParticipationHashSecret({
    secret: env.participation.hashSecret,
    nodeEnv: process.env.NODE_ENV,
  });
  if (!warned) {
    if (resolved === null) {
      warned = true;
      console.error(
        "PARTICIPATION_HASH_SECRET が未設定か短すぎるため、投票の受付を止めています（32文字以上を設定してください）"
      );
    } else if (resolved.source === "dev-default") {
      warned = true;
      console.warn(
        "PARTICIPATION_HASH_SECRET が未設定のため、開発用の既定値を使っています（本番では使われません）"
      );
    }
  }
  return resolved;
}
