import type { VoteActionErrorCode } from "../types";

/** 投票・取り消しが失敗したときに画面に出す文 */
export const VOTE_ACTION_ERROR_MESSAGES: Record<
  Exclude<VoteActionErrorCode, "not_allowed">,
  string
> = {
  invalid_input:
    "投票の内容を確認できませんでした。ページを再読み込みしてください。",
  unavailable: "現在、投票の受付を停止しています。",
  unauthenticated:
    "投票の準備ができませんでした。ページを再読み込みして、もう一度お試しください。",
  rate_limited:
    "短い時間に操作が続いたため、受け付けを一時的に止めています。1分ほど待ってからお試しください。",
  rate_limited_bill:
    "同じ接続元からこの議案への投票が続いたため、受け付けを一時的に止めています。しばらく（最大1時間）待ってからお試しください。",
  not_found: "投票の対象が見つかりませんでした。",
  server_error:
    "投票を保存できませんでした。時間をおいて、もう一度お試しください。",
};
