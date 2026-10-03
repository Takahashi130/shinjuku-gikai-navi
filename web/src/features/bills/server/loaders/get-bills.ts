import { unstable_cache } from "next/cache";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { BillListItem } from "../../shared/types";
import {
  findBillIdsWithPublicInterview,
  findPublishedBillsForList,
  findTagsByBillIds,
} from "../repositories/bill-repository";

/**
 * 公開済み議案を一覧用の軽い形（BillListItem）で全件返す。
 *
 * 一覧（/bills）とサイトマップが使う。解説本文は含まないので、本文が要る
 * 画面は議案ごとの loader（getBillById など）を使うこと。
 */
export async function getBills(): Promise<BillListItem[]> {
  // キャッシュ外でcookiesにアクセス
  const difficultyLevel = await getDifficultyLevel();
  return _getCachedBills(difficultyLevel);
}

const _getCachedBills = unstable_cache(
  async (difficultyLevel: DifficultyLevelEnum): Promise<BillListItem[]> => {
    const data = await findPublishedBillsForList(difficultyLevel);

    // タグ情報とインタビュー状態を一括取得
    const billIds = data.map((item) => item.id);
    const [tagsByBillId, interviewBillIds] = await Promise.all([
      findTagsByBillIds(billIds),
      findBillIdsWithPublicInterview(billIds),
    ]);

    return data.map((item) => {
      const { bill_contents, ...bill } = item;
      return {
        ...bill,
        bill_content: Array.isArray(bill_contents)
          ? bill_contents[0]
          : undefined,
        tags: tagsByBillId.get(item.id) ?? [],
        hasPublicInterview: interviewBillIds.has(item.id),
      };
    });
  },
  // 形が変わったらキーを変える（本文を含んでいた頃の形、is_featured を
  // 持たない頃の形と区別する）。Vercel のデータキャッシュはデプロイをまたいで残る。
  ["bills-list-items-v2"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.BILLS, CACHE_TAGS.INTERVIEW_CONFIGS],
  }
);
