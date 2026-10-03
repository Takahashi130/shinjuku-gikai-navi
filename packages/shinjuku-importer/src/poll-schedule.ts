import type { SessionPage } from "./parse-session-page";

/**
 * 「議決」の投票の回の締切（closes_at）を、取り込みでどう扱うか。
 *
 * 採決前か後かは、集計のたびに responded_at < closes_at で決める。締切を過ぎた回の
 * closes_at を後から動かすと、過去の票の採決前・後の区分がまとめて入れ替わり、
 * 「議会と分かれた」の比較も変わってしまう。そのため取り込みでは、
 * 締切が未設定の回と、締切がまだ来ていない回だけを日程に合わせる。
 * 締切を過ぎた回は、日程と食い違っていても警告を出すだけにする。
 */

/** 締切を手で直すコマンド（運営用） */
export const SET_CLOSE_COMMAND = "pnpm --filter @mirai-gikai/navi-ops polls:set-close <議案slug>... --at <日時>";

/** 先議の議案の締切を、会期の先議の予定（diet_sessions.early_vote_at）にするコマンド（運営用） */
export const SET_EARLY_CLOSE_COMMAND = "pnpm --filter @mirai-gikai/navi-ops polls:set-close <先議の議案slug>... --early";

/**
 * 日程由来（closes_at_source = 'schedule'）の回のうち、取り込みで締切を更新してよいものの条件
 * （PostgREST の or フィルタ）。
 * - 締切が未設定
 * - 締切がまだ来ておらず（closes_at > now）、日程から求めた値と違う
 */
export function updatableScheduleCloseFilter(scheduleClosesAt: string, now: Date): string {
  return `closes_at.is.null,and(closes_at.gt."${now.toISOString()}",closes_at.neq."${scheduleClosesAt}")`;
}

export type ClosedPollRow = { billSlug: string; closesAt: string };

/**
 * 締切を過ぎた回のうち、今の日程から求めた締切と食い違うものの警告（無ければ null）。
 * 取り込みでは直さない。直すなら運営が polls:set-close で確かめてから直す。
 */
export function staleClosedPollWarning(rows: ClosedPollRow[], scheduleClosesAt: string): string | null {
  const target = new Date(scheduleClosesAt).getTime();
  const stale = rows.filter((r) => new Date(r.closesAt).getTime() !== target);
  if (stale.length === 0) return null;
  const examples = stale
    .slice(0, 3)
    .map((r) => `${r.billSlug}（今の締切 ${r.closesAt}）`)
    .join("、");
  return (
    `⚠️  締切を過ぎた回 ${stale.length} 件は、日程から求めた締切（${scheduleClosesAt}）と違いますが、` +
    `採決前・後の区分が変わるため変えていません: ${examples}${stale.length > 3 ? " ほか" : ""}。` +
    `直す場合は確かめてから ${SET_CLOSE_COMMAND} を使ってください`
  );
}

/**
 * 会期の日程について、運営が手で確かめるべきことの警告。
 * - 先議がある：会期ページからはどの議案が先議か分からないため、取り込みでは全議案の締切を
 *   会期の採決予定（final_vote_at）にする。先議の議案は polls:set-close --early で
 *   締切を先議の予定（early_vote_at）に直す
 * - 採決の時刻が書かれていない：直前の行の時刻などを使っているので、実際の採決はもっと後かもしれない
 */
export function voteScheduleWarnings(
  session: Pick<SessionPage, "title" | "finalVoteAt" | "finalVoteTimeInferred" | "earlyVoteAt" | "endDate">
): string[] {
  const warnings: string[] = [];
  if (session.earlyVoteAt) {
    warnings.push(
      `⚠️  ${session.title}には先議（${session.earlyVoteAt}）があります。先議で採決する議案の締切は、` +
        `会期の採決予定のままです。先議の議案を確かめて、先議の前に ${SET_EARLY_CLOSE_COMMAND} で締切を先議の予定に直してください`
    );
  }
  if (session.finalVoteTimeInferred) {
    const at = session.finalVoteAt ?? `${session.endDate}T14:00:00+09:00`;
    warnings.push(
      `⚠️  ${session.title}の採決の時刻が会期ページに書かれていないため、${at} を締切にしています（実際の採決はこれより後のことがあります）。` +
        `分かったら ${SET_CLOSE_COMMAND} で直してください`
    );
  }
  return warnings;
}
