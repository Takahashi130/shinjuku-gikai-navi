import { formatJstDateTime, formatRemaining } from "./format-vote-deadline";
import type { OpenVoteStats } from "./summarize-open-votes";

/**
 * トップの「区民投票を受付中の議案」の数字の下に添える一言。
 * 例：次の締切 10月15日（木）14:00・あと11日
 */
export function formatOpenVotesNote(stats: OpenVoteStats, now: Date): string {
  if (stats.count === 0) return "いま受け付けている議案はありません";
  if (!stats.earliestClosesAt) {
    return "採決前の議案に、賛成・反対を投じられます";
  }
  const deadline = formatJstDateTime(stats.earliestClosesAt, now);
  const remaining = formatRemaining(stats.earliestClosesAt, now);
  return remaining
    ? `次の締切 ${deadline}・${remaining}`
    : `次の締切 ${deadline}`;
}
