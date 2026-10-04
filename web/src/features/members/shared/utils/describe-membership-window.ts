import { formatDate } from "@/lib/utils/date";
import type { MembershipWindow } from "./membership-window";

/**
 * 会派の賛否・政務活動費を数えた期間の説明（議員のページの節に出す）。
 *
 * 移った記録の無い議員に「区の資料で確認できる期間」と書くと、その期間しか
 * 所属していなかったように読めるので、理由ごとに書き分ける。
 */
export function describeMembershipWindow(
  window: MembershipWindow,
  context: {
    memberName: string;
    factionName: string;
    termNumber: number | null;
  }
): { since: string | null; reason: string | null } {
  if (window.start === null) return { since: null, reason: null };
  const since = formatDate(window.start);
  switch (window.basis) {
    case "term_start":
      return {
        since,
        reason: context.termNumber
          ? `今の任期（第${context.termNumber}期）の始まり。${context.memberName}さんが今の任期の中で会派を移った記録はありません`
          : `今の任期の始まり。${context.memberName}さんが今の任期の中で会派を移った記録はありません`,
      };
    case "faction_event":
      return {
        since,
        reason: `${context.memberName}さんが${context.factionName}に入った時期にあたる、区が公表している会派の結成・合流などの日`,
      };
    case "first_seen":
      return {
        since,
        reason: `${context.memberName}さんが${context.factionName}に所属していることを、区の資料で最初に確認できた日。移った正確な日は公表されていません`,
      };
    case "none":
      return { since, reason: null };
  }
}
