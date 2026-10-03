import type { ExplainerStatus } from "./schema";

/**
 * 議案ページで解説を出せるか、出せないならその理由を決める。
 *
 * - 人事案件（同意・諮問と、特定の人を推薦する議案）は解説と投票の対象外
 * - 公開の条件：status = published・照合済み（reviewed_at あり）・予約公開の日時を過ぎている
 * - 解説が無いとき：採決前なら「準備中」、採決後（または採決予定が分からない）なら「過去の議案」
 *
 * 公開してよいかは、キャッシュの外で現在時刻と比べて決める（予約公開があるため）。
 */

export type ExplainerPublication = {
  status: ExplainerStatus;
  reviewedAt: string | null;
  publishAt: string | null;
};

export type ExplainerReadiness =
  | { state: "available" }
  | { state: "scheduled"; publishAt: string }
  | { state: "preparing"; afterVote: boolean }
  | { state: "not_applicable"; reason: "personnel" }
  | { state: "not_available"; reason: "past_bill" | "withdrawn" };

/** 同意・諮問の議案か。slug は importer の billSlug（例：r8-teirei-3-doi-1） */
export function isPersonnelBillSlug(slug: string | null): boolean {
  if (!slug) return false;
  return /-(doi|shimon)-\d+$/.test(slug);
}

/**
 * 議案名から見分ける人事案件。議員提出議案（slug は -giin-）でも、特定の人を推薦するか
 * どうかを決める議案（例：東京都後期高齢者医療広域連合議会議員選挙候補者の推薦について）は
 * 「特定の人への賛否」になる。importer の isPollTarget と、マイグレーション
 * 20261006100000 の条件（name like '%候補者の推薦%'）とそろえる。
 */
export const PERSONNEL_BILL_NAME_PATTERN = /候補者の推薦/;

/**
 * 人事案件（解説と投票の対象外）の議案か。
 * - 同意・諮問（slug が -doi- / -shimon-）
 * - 議案名に「候補者の推薦」を含むもの
 */
export function isPersonnelBill(bill: {
  slug: string | null;
  name: string | null;
}): boolean {
  if (isPersonnelBillSlug(bill.slug)) return true;
  return bill.name !== null && PERSONNEL_BILL_NAME_PATTERN.test(bill.name);
}

function toTime(iso: string | null): number | null {
  if (iso === null) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/** 解説を今公開してよいか（不正な日時は非公開に倒す） */
export function isExplainerPublic(
  explainer: ExplainerPublication | null,
  now: Date
): boolean {
  if (!explainer || explainer.status !== "published") return false;
  if (toTime(explainer.reviewedAt) === null) return false;
  if (explainer.publishAt === null) return true;
  const publishAt = toTime(explainer.publishAt);
  return publishAt !== null && publishAt <= now.getTime();
}

export function explainerReadiness(input: {
  billSlug: string | null;
  /** 議案名（人事案件を見分ける。isPersonnelBill） */
  billName: string | null;
  explainer: ExplainerPublication | null;
  /** 採決の予定時刻（diet_sessions.final_vote_at など） */
  voteAt: string | null;
  now: Date;
}): ExplainerReadiness {
  const { billSlug, billName, explainer, voteAt, now } = input;
  if (isPersonnelBill({ slug: billSlug, name: billName })) {
    return { state: "not_applicable", reason: "personnel" };
  }
  if (isExplainerPublic(explainer, now)) return { state: "available" };

  const voteTime = toTime(voteAt);
  const afterVote = voteTime === null || voteTime <= now.getTime();

  if (explainer) {
    if (explainer.status === "withdrawn") {
      return { state: "not_available", reason: "withdrawn" };
    }
    if (
      explainer.status === "published" &&
      explainer.publishAt !== null &&
      toTime(explainer.reviewedAt) !== null &&
      toTime(explainer.publishAt) !== null
    ) {
      return { state: "scheduled", publishAt: explainer.publishAt };
    }
    // 下書きがある：採決に間に合わなくても公開する予定
    return { state: "preparing", afterVote };
  }
  if (afterVote) return { state: "not_available", reason: "past_bill" };
  return { state: "preparing", afterVote: false };
}
