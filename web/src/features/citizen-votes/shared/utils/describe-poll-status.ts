import type { PollState } from "../types";
import { formatJstDateTime, formatRemaining } from "./format-vote-deadline";

export type PollStatusDescription = {
  headline: string;
  detail: string | null;
  /** 締切までの残り（例：あと11日）。締切前だけ */
  remaining: string | null;
};

/**
 * 投票カードの上に出す、受付の状態の説明。
 * 締切は本会議の採決予定の時刻（日本時間）。
 */
export function describePollStatus(
  pollState: PollState,
  now: Date
): PollStatusDescription {
  switch (pollState.state) {
    case "not_applicable":
      return pollState.reason === "personnel"
        ? {
            headline: "人事案件のため、投票の対象外です",
            detail:
              "特定の人の任命などへの同意・意見を求める議案は、投票の対象にしていません。",
            remaining: null,
          }
        : {
            headline: "この議案は投票の対象外です",
            detail: null,
            remaining: null,
          };
    case "upcoming":
      return {
        headline: `投票の受付は ${formatJstDateTime(pollState.opensAt, now)} から始まります`,
        detail: null,
        remaining: null,
      };
    case "open":
      return pollState.closesAt === null
        ? { headline: "締切は未定です", detail: null, remaining: null }
        : {
            headline: `締切 ${formatJstDateTime(pollState.closesAt, now)}`,
            detail: "本会議で採決する予定の時刻です。",
            remaining: formatRemaining(pollState.closesAt, now),
          };
    case "open_after_close":
      return pollState.openedAfterClose
        ? {
            headline: `採決の予定（${formatJstDateTime(pollState.closesAt, now)}）のあとに受付を始めました`,
            detail:
              "票はすべて「採決後の票」として数え、議会の議決とは比べません。",
            remaining: null,
          }
        : {
            headline: `採決の予定（${formatJstDateTime(pollState.closesAt, now)}）を過ぎました`,
            detail:
              "これからの票は「採決後の票」として、採決前の票とは分けて数えます。",
            remaining: null,
          };
    case "closed":
      return {
        headline: "投票の受付は終了しました",
        detail: `締切：${formatJstDateTime(pollState.closesAt, now)}`,
        remaining: null,
      };
  }
}
