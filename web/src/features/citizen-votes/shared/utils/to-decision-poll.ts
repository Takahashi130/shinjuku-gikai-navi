import { isPollAudience } from "@/lib/participation/resolve-eligibility";
import type { DecisionPoll } from "../types";

/** polls から読む列 */
export type PollRow = {
  id: string;
  opens_at: string;
  closes_at: string | null;
  accepts_after_close: boolean;
  is_hidden: boolean;
  audience: string;
  options: string[] | null;
};

/**
 * DB の行を画面・判定用の形にする。
 * audience が知らない値なら、いちばん狭い resident_verified として扱う（安全側）。
 */
export function toDecisionPoll(row: PollRow): DecisionPoll {
  return {
    id: row.id,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    acceptsAfterClose: row.accepts_after_close,
    isHidden: row.is_hidden,
    audience: isPollAudience(row.audience) ? row.audience : "resident_verified",
    options: row.options ?? [],
  };
}
