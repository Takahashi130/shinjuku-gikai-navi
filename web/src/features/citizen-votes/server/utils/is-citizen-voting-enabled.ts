import "server-only";

import { getParticipationHashSecret } from "@/lib/participation/get-participation-hash-secret";

/**
 * 新しい票を受け付けられる設定か（PARTICIPATION_HASH_SECRET が32文字以上ある）。
 *
 * false は受付を止めている状態（運用文書 2.4 の緊急停止、または本番で秘密鍵を
 * 入れ忘れた状態）。議案ページの帯だけでなく、トップの数・一覧の印・結果の面の
 * 「受付中」の表示もこれに合わせて出さない（押した先で投票できないため）。
 */
export function isCitizenVotingEnabled(): boolean {
  return getParticipationHashSecret() !== null;
}
