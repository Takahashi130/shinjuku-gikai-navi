import type { BillStatusEnum } from "../types";
import { toBillStatusGroup } from "./bill-status-group";
import {
  type BillVotes,
  FACTION_VOTES_HEADING,
  RESULT_HEADING,
} from "./parse-bill-votes";

/** 議決まで済んだ（可決・否決の）議案か。 */
export function isDecidedStatus(status: BillStatusEnum): boolean {
  const group = toBillStatusGroup(status);
  return group === "enacted" || group === "rejected";
}

/**
 * 「議会の議決」の面（CouncilDecisionPanel）が出す、解説の節の見出し。
 *
 * 面に出す節は、解説の本文から取り除いて二重に出さない。面は議決まで済んだ
 * 議案でだけ議決結果と会派ごとの賛否を出すので、ステータスが議決前のまま
 * （管理画面で直し忘れたなど）の議案では何も取り除かない。取り除くと、
 * 会派の賛否がページのどこにも出なくなる。
 */
export function getSectionsShownInDecisionPanel(
  status: BillStatusEnum,
  votes: BillVotes | null
): string[] {
  if (!votes || !isDecidedStatus(status)) return [];
  return votes.hasFactionVotes
    ? [RESULT_HEADING, FACTION_VOTES_HEADING]
    : [RESULT_HEADING];
}
