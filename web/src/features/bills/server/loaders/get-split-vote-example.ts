import "server-only";

import type { BillWithContent } from "../../shared/types";
import { extractBillNumber } from "../../shared/utils/bill-number";
import {
  type BillVotes,
  parseBillVotes,
} from "../../shared/utils/parse-bill-votes";
import { getBillById } from "./get-bill-by-id";

/** トップの「区民の意思 vs 議会の議決」の例にする議案。 */
export type SplitVoteExample = {
  bill: BillWithContent;
  votes: BillVotes;
  /** 議案番号（例：第42号議案）。読めなければ null。 */
  billNumber: string | null;
};

/**
 * 候補（会派の賛否が分かれ、議決まで済んだ議案。新しい順）を先頭から確かめ、
 * 解説から会派ごとの賛否が読めた最初の1件を返す。
 *
 * 一覧用の軽い議案は解説の本文を持たないので、候補ごとに議案1件を引く
 * （キャッシュ済みの loader。候補は数件に絞ってから渡すこと）。
 */
export async function getSplitVoteExample(
  candidateIds: readonly string[]
): Promise<SplitVoteExample | null> {
  for (const id of candidateIds) {
    const bill = await getBillById(id);
    const markdown = bill?.bill_content?.content;
    const votes = parseBillVotes(markdown);
    if (bill && votes?.hasFactionVotes) {
      return { bill, votes, billNumber: extractBillNumber(markdown) };
    }
  }
  return null;
}
