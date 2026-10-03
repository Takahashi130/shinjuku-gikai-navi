import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { BillExplainerView } from "../../shared/types";
import { resolveExplainerView } from "../../shared/utils/resolve-explainer-view";
import { findBillExplainerContext } from "../repositories/bill-explainer-repository";

/**
 * 解説の行（全ステータス）と、判断に使う slug・採決予定をキャッシュする。
 * explainers:sync が /api/revalidate を呼ぶと消える。
 */
const getCachedExplainerContext = unstable_cache(
  async (billId: string) => findBillExplainerContext(billId),
  ["bill-explainer-context"],
  {
    revalidate: 600,
    // 採決予定（投票の回の締切）も持つので、投票の設定の更新でも消す
    tags: [
      CACHE_TAGS.BILL_EXPLAINERS,
      CACHE_TAGS.BILLS,
      CACHE_TAGS.CITIZEN_VOTES,
    ],
  }
);

/**
 * 議案ページに出す解説を返す。議案が無ければ null。
 * 公開してよいか（予約公開を含む）は、キャッシュの外で現在時刻と比べて決める。
 *
 * @param options.includeDraft トークン付きのプレビューで下書きも見せるとき true
 */
export async function getBillExplainer(
  billId: string,
  options: { includeDraft?: boolean } = {}
): Promise<BillExplainerView | null> {
  const context = await getCachedExplainerContext(billId);
  if (!context) return null;

  const view = resolveExplainerView({
    billSlug: context.billSlug,
    billName: context.billName,
    voteAt: context.voteAt,
    row: context.explainer,
    now: new Date(),
    includeDraft: options.includeDraft,
  });

  if (
    context.explainer?.status === "published" &&
    view.kind === "absent" &&
    view.readiness.state === "preparing"
  ) {
    console.error(
      `bill_explainers の内容を読めないため、解説を出していません（bill_id=${billId}）`
    );
  }
  return view;
}
